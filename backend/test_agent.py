"""
product_management_agent_vfl.py

Single public function:
    product_management_agent()

Fetches latest Jira issues via /rest/api/3/search/jql, project details, boards (5, 86),
optional sprint (2060), computes compact PM metrics, sends to Anthropic (Claude),
and returns one structured JSON (as a Python dict).

Requirements:
    pip install requests python-dateutil anthropic

Environment (or pass as args):
    JIRA_BASE_URL=https://<your>.atlassian.net
    JIRA_EMAIL=<you@company.com>
    JIRA_API_TOKEN=<atlassian_api_token>
    ANTHROPIC_API_KEY=<sk-ant-...>
"""

from __future__ import annotations
import os
import json
import re
import time
import logging
from typing import Any, Dict, List, Optional
from collections import Counter, defaultdict
from datetime import datetime, timezone

import requests
from dateutil import parser as dtp


def product_management_agent(
    # Jira setup
    project_key: str = "VFL",
    board_ids: List[int] = (5, 86),
    sprint_id: Optional[int] = 2060,            # sprint on board 5
    # Latest issues filter
    max_issues: int = 120,
    updated_lookback_days: Optional[int] = 45,  # None disables updated>=
    jql_extra: str = "",                        # e.g. 'AND statusCategory != Done'
    include_changelogs: bool = True,
    # Jira auth (fallback to env)
    jira_base_url: Optional[str] = None,
    jira_email: Optional[str] = None,
    jira_api_token: Optional[str] = None,
    # Anthropic config
    anthropic_api_key: Optional[str] = None,
    anthropic_model: str = "claude-3-5-sonnet-20241022",
    temperature: float = 0.1,
    # LLM guidance
    analysis_goal: str = "Provide crisp PM insights, risks, recommendations, and near-term focus.",
    # Debug / logging
    verbose: bool = True,
) -> Dict[str, Any]:
    """
    Returns the Claude-produced structured JSON (as Python dict).
    On JSON parse failure, returns {'_parse_error': True, '_raw_text': '...'}.
    """

    # ---------- logging ----------
    logger = logging.getLogger("product_management_agent")
    if not logger.handlers:
        handler = logging.StreamHandler()
        fmt = "[%(asctime)s] %(levelname)s: %(message)s"
        handler.setFormatter(logging.Formatter(fmt))
        logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    def log_kv(title: str, data: dict | list | str | int | float | None):
        try:
            if isinstance(data, (dict, list)):
                logger.debug("%s:\n%s", title, json.dumps(data, indent=2)[:2000])
            else:
                logger.debug("%s: %s", title, data)
        except Exception:
            logger.debug("%s: <unprintable>", title)

    # ------------ helpers ------------

    def env(k: str, v: Optional[str]) -> str:
        val = v if v is not None else os.getenv(k, "")
        if not val:
            raise RuntimeError(f"Missing required setting: {k}")
        return val

    _base = "https://spursol.atlassian.net"
    _email = "ahmed.shaikh@spursol.com"
    _token = "ATATT3xFfGF01Ss5nb1GwbXHduWvpOPrEwjCbLUvbNbJ__NfZiXVGpm8zjXRDNzGxd6Bdpxe8o5hbAc0LcUEuqDA3uctFVi_PVk_b1V8pMcSgzVFYUjitO28d6zTy9J1QiJQNnGV-hsOC6m9f5XtUMEy90sNEkcAkHpZPB7-OUdsRPk62mbmo0A=F7EC5289"
    _ant = "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"

    logger.info("Starting product_management_agent")
    logger.info("Jira base: %s | Project: %s | Boards: %s | Sprint: %s", _base, project_key, list(board_ids), sprint_id)

    session = requests.Session()
    session.auth = (_email, _token)
    session.headers.update({"Accept": "application/json"})

    now = datetime.now(timezone.utc)

    def get(url: str, params: Optional[dict] = None) -> dict:
        logger.debug("GET %s params=%s", url, params)
        resp = session.get(url, params=params, timeout=60)
        logger.debug("-> %s", resp.status_code)
        if resp.status_code >= 400:
            logger.error("GET failed %s: %s", resp.status_code, resp.text[:400])
            raise RuntimeError(f"GET {url} failed {resp.status_code}: {resp.text[:400]}")
        return resp.json()

    def safe_dt(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            return dtp.parse(s).astimezone(timezone.utc)
        except Exception:
            return None

    # -------------------- fetch entities --------------------
    logger.info("Fetching project details")
    project = get(f"{_base}/rest/api/3/project/{project_key}")
    log_kv("Project", {"key": project.get("key"), "name": project.get("name")})

    logger.info("Fetching boards")
    boards: List[dict] = []
    for bid in board_ids:
        try:
            b = get(f"{_base}/rest/agile/1.0/board/{bid}")
            boards.append(b)
            logger.debug("Board %s -> %s", bid, b.get("name"))
        except Exception as e:
            logger.warning("Board %s fetch failed: %s", bid, e)

    logger.info("Fetching sprint (if provided)")
    sprint: dict = {}
    if sprint_id:
        try:
            sprint = get(f"{_base}/rest/agile/1.0/sprint/{sprint_id}")
            log_kv("Sprint", {"id": sprint.get("id"), "name": sprint.get("name"), "state": sprint.get("state")})
        except Exception as e:
            logger.warning("Sprint %s fetch failed: %s", sprint_id, e)
            sprint = {}

    logger.info("Fetching fields map")
    try:
        fields_arr = get(f"{_base}/rest/api/3/field")
        fields_map = {f.get("id"): f.get("name") for f in fields_arr}
        logger.debug("Fields count: %d", len(fields_map))
    except Exception as e:
        logger.warning("Fields fetch failed: %s", e)
        fields_map = {}

    # -------------------- latest issues via new /search/jql --------------------
    logger.info("Building JQL for latest issues")
    jql_parts = [f'project = "{project_key}"']
    if updated_lookback_days and updated_lookback_days > 0:
        jql_parts.append(f"updated >= -{updated_lookback_days}d")
    if sprint_id:
        jql_parts.append(f"(sprint = {sprint_id} OR sprint IS EMPTY)")
    if jql_extra.strip():
        jql_parts.append(jql_extra.strip())
    jql = " AND ".join(jql_parts) + " ORDER BY updated DESC"
    log_kv("JQL", jql)

    logger.info("Querying issues via /rest/api/3/search/jql")
    issues: List[dict] = []
    next_token: Optional[str] = None
    requests_made = 0
    while len(issues) < max_issues:
        body = {
            "jql": jql,
            "maxResults": min(100, max_issues - len(issues)),
            "fields": ["*all"],
            "expand": "changelog" if include_changelogs else "",
        }
        if next_token:
            body["nextPageToken"] = next_token

        url = f"{_base}/rest/api/3/search/jql"
        logger.debug("POST %s body.maxResults=%s nextPageToken=%s", url, body["maxResults"], body.get("nextPageToken"))
        resp = session.post(url, json=body, timeout=60)
        requests_made += 1
        logger.debug("-> %s", resp.status_code)
        if resp.status_code >= 400:
            logger.error("POST /search/jql failed %s: %s", resp.status_code, resp.text[:400])
            raise RuntimeError(f"POST /search/jql failed {resp.status_code}: {resp.text[:400]}")
        data = resp.json()
        got = len(data.get("issues", []))
        logger.debug("Received %d issues (cum=%d)", got, len(issues) + got)
        issues.extend(data.get("issues", []))
        is_last = data.get("isLast", True)
        next_token = data.get("nextPageToken")
        if is_last or not next_token or len(issues) >= max_issues:
            break
        time.sleep(0.2)

    issues = issues[:max_issues]
    logger.info("Total issues collected: %d in %d request(s)", len(issues), requests_made)

    # -------------------- derive compact metrics --------------------
    logger.info("Computing metrics")
    status_counter = Counter()
    type_counter = Counter()
    priority_counter = Counter()
    assignee_counter = Counter()
    cycle_times_days: List[float] = []
    status_transitions = defaultdict(lambda: defaultdict(int))

    for it in issues:
        f = it.get("fields", {})
        status_name = (f.get("status") or {}).get("name") or "Unknown"
        issue_type = (f.get("issuetype") or {}).get("name") or "Unknown"
        priority = (f.get("priority") or {}).get("name") or "None"
        assignee = (f.get("assignee") or {}).get("displayName") or "Unassigned"

        status_counter[status_name] += 1
        type_counter[issue_type] += 1
        priority_counter[priority] += 1
        assignee_counter[assignee] += 1

        created = safe_dt(f.get("created"))
        resolved = safe_dt(f.get("resolutiondate"))
        if created and resolved:
            ct = (resolved - created).total_seconds() / 86400.0
            cycle_times_days.append(ct)

        if include_changelogs:
            histories = (it.get("changelog") or {}).get("histories") or []
            for h in histories:
                for item in h.get("items", []):
                    if item.get("field") == "status":
                        frm = item.get("fromString") or "None"
                        to = item.get("toString") or "None"
                        status_transitions[frm][to] += 1

    def top_n(counter: Counter, n: int = 15):
        return [{"name": k, "count": v} for k, v in counter.most_common(n)]

    def issue_summary(it: dict) -> dict:
        f = it.get("fields", {})
        return {
            "key": it.get("key"),
            "summary": f.get("summary"),
            "type": (f.get("issuetype") or {}).get("name"),
            "status": (f.get("status") or {}).get("name"),
            "priority": (f.get("priority") or {}).get("name"),
            "assignee": (f.get("assignee") or {}).get("displayName"),
            "updated": f.get("updated"),
            "resolutiondate": f.get("resolutiondate"),
            "story_points": f.get("customfield_10016"),
        }

    sample_issues = [issue_summary(i) for i in issues[: min(40, len(issues))]]

    avg_cycle = round(sum(cycle_times_days) / len(cycle_times_days), 2) if cycle_times_days else None
    logger.info("Counts: total=%d | avg_cycle=%s", len(issues), avg_cycle)
    log_kv("Top status", top_n(status_counter, 10))
    log_kv("Top types", top_n(type_counter, 10))
    log_kv("Top priorities", top_n(priority_counter, 10))
    log_kv("Top assignees", top_n(assignee_counter, 10))

    aggregate: Dict[str, Any] = {
        "project": {
            "key": project.get("key"),
            "name": project.get("name"),
            "lead": (project.get("lead") or {}).get("displayName"),
            "projectTypeKey": project.get("projectTypeKey"),
            "simplified": project.get("simplified"),
        },
        "boards": [
            {
                "id": b.get("id"),
                "name": b.get("name"),
                "type": b.get("type"),
                "location": b.get("location"),
            }
            for b in boards
        ],
        "sprint": {
            "id": sprint.get("id"),
            "name": sprint.get("name"),
            "state": sprint.get("state"),
            "startDate": sprint.get("startDate"),
            "endDate": sprint.get("endDate"),
            "completeDate": sprint.get("completeDate"),
            "goal": sprint.get("goal"),
        } if sprint else {},
        "search": {"jql_used": jql, "max_issues": max_issues},
        "metrics": {
            "counts": {
                "by_status_top": top_n(status_counter, 20),
                "by_type_top": top_n(type_counter, 20),
                "by_priority_top": top_n(priority_counter, 20),
                "by_assignee_top": top_n(assignee_counter, 20),
                "total_issues_considered": len(issues),
            },
            "cycle_time_days": {
                "avg": avg_cycle,
                "n": len(cycle_times_days),
            },
            "status_transitions_sample": [
                {"from": f, "to_counts": dict(t)}
                for f, t in list(status_transitions.items())[:20]
            ],
        },
        "examples": {"issues_sample": sample_issues},
        "generated_at": now.isoformat(),
        "note": "Latest issues only; fields map omitted.",
    }

    # -------------------- Anthropic (Claude) --------------------
    logger.info("Calling Anthropic model: %s", anthropic_model)

    system_prompt = (
        "You are a senior product management copilot. Analyze the provided Jira snapshot "
        "for project VFL (boards 5 and 86; sprint 2060 context if present). "
        "Return ONE valid JSON object only. No markdown, no commentary outside JSON."
    )

    user_payload = {
        "goal": analysis_goal,
        "required_json_schema": {
            "type": "object",
            "properties": {
                "executive_summary": {"type": "string"},
                "key_metrics": {
                    "type": "object",
                    "properties": {
                        "total_issues": {"type": "number"},
                        "avg_cycle_time_days": {"type": ["number", "null"]},
                        "top_status": {"type": "array"},
                        "top_types": {"type": "array"},
                        "top_priorities": {"type": "array"},
                        "top_assignees": {"type": "array"},
                    },
                    "required": [
                        "total_issues", "avg_cycle_time_days",
                        "top_status", "top_types", "top_priorities", "top_assignees"
                    ],
                },
                "insights": {"type": "array", "items": {"type": "string"}},
                "risks": {"type": "array", "items": {"type": "string"}},
                "recommendations": {"type": "array", "items": {"type": "string"}},
                "near_term_focus": {"type": "array", "items": {"type": "string"}},
                "alerts": {"type": "array", "items": {"type": "string"}}
            },
            "required": [
                "executive_summary", "key_metrics",
                "insights", "risks", "recommendations",
                "near_term_focus", "alerts"
            ]
        },
        "data": aggregate,
        "output_format": "Return ONLY valid JSON, no markdown."
    }

    # Import Anthropic and call without 'response_format' (your SDK version errors on it)
    try:
        from anthropic import Anthropic  # type: ignore
    except Exception as e:
        logger.error("Anthropic SDK import failed: %s", e)
        raise RuntimeError("anthropic package is required. Install with `pip install anthropic`.") from e

    client = Anthropic(api_key=_ant)

    # Some SDK versions require content blocks. Also omit response_format to avoid TypeError.
    # We strictly instruct JSON in prompts and then parse.
    msg = client.messages.create(
        model=anthropic_model,
        temperature=temperature,
        max_tokens=2048,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": json.dumps(user_payload, ensure_ascii=False)}
                ],
            }
        ],
    )

    # Extract text content
    raw_text = ""
    try:
        texts = [c.text for c in (msg.content or []) if getattr(c, "type", "") == "text"]
        raw_text = texts[0] if texts else ""
    except Exception:
        raw_text = ""

    logger.debug("Raw LLM text (first 1500 chars): %s", raw_text[:1500])

    def parse_json_strict(s: str) -> Dict[str, Any]:
        try:
            return json.loads(s)
        except Exception:
            m = re.search(r"\{.*\}", s, flags=re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    pass
            return {"_parse_error": True, "_raw_text": s}

    result = parse_json_strict(raw_text)
    if result.get("_parse_error"):
        logger.warning("LLM JSON parse failed; returning _raw_text fallback.")

    # Non-invasive enrichment to ensure concrete metrics are present
    km = result.setdefault("key_metrics", {})
    km.setdefault("total_issues", aggregate["metrics"]["counts"]["total_issues_considered"])
    km.setdefault("avg_cycle_time_days", aggregate["metrics"]["cycle_time_days"]["avg"])
    km.setdefault("top_status", aggregate["metrics"]["counts"]["by_status_top"])
    km.setdefault("top_types", aggregate["metrics"]["counts"]["by_type_top"])
    km.setdefault("top_priorities", aggregate["metrics"]["counts"]["by_priority_top"])
    km.setdefault("top_assignees", aggregate["metrics"]["counts"]["by_assignee_top"])

    # Provenance
    result.setdefault("_provenance", {
        "project_key": project_key,
        "board_ids": list(board_ids),
        "sprint_id": sprint_id,
        "jql_used": jql,
        "issues_considered": len(issues),
        "updated_lookback_days": updated_lookback_days,
        "model": anthropic_model,
        "generated_at": now.isoformat(),
        "requests_made": requests_made,
    })

    logger.info("Finished product_management_agent")
    return result


# Manual run
if __name__ == "__main__":
    out = product_management_agent()
    print(json.dumps(out, indent=2))
