import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from collections import Counter
import re

from fastapi import HTTPException
from mcp_manager import MCPConnectionManager

logger = logging.getLogger("vfl_project_agent")

async def run_vfl_project_agent(manager: MCPConnectionManager) -> Dict[str, Any]:
    """
    VFL Project Agent that analyzes Jira and Confluence data for VFL project.

    Args:
        manager: MCPConnectionManager instance with Atlassian connected

    Returns:
        Dict containing structured analysis results
    """
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    # Check if Atlassian is connected
    if "atlassian" not in manager.get_connected_servers():
        raise HTTPException(status_code=400, detail="Atlassian server not connected")

    try:
        # Step 1: Get VFL project issues from Jira
        logger.info("Fetching VFL project issues from Jira")
        jira_result = await manager.execute_tool("atlassian", "search_issues", {
            "jql": "project = VFL ORDER BY updated DESC",
            "max_results": 100
        })

        if not jira_result or not jira_result.content:
            raise HTTPException(status_code=500, detail="Failed to retrieve issues from Jira")

        # Parse Jira response
        jira_text = _extract_text_content(jira_result)
        if not jira_text:
            raise HTTPException(status_code=500, detail="No Jira data received")

        issues = _parse_issues_from_text(jira_text)
        logger.info(f"Retrieved {len(issues)} issues from VFL project")

        # Step 2: Get VFL board information
        logger.info("Fetching VFL board information")
        boards_result = await manager.execute_tool("atlassian", "get_boards", {})

        vfl_boards = []
        if boards_result and boards_result.content:
            boards_text = _extract_text_content(boards_result)
            if boards_text:
                vfl_boards = _find_vfl_boards(boards_text)

        # Step 3: Get Confluence pages for VFL project
        logger.info("Fetching VFL project documentation from Confluence")
        confluence_result = await manager.execute_tool("atlassian", "search_content", {
            "cql": "space = VFL OR title ~ VFL",
            "limit": 50
        })

        confluence_pages = []
        if confluence_result and confluence_result.content:
            confluence_text = _extract_text_content(confluence_result)
            if confluence_text:
                confluence_pages = _parse_confluence_pages(confluence_text)

        # Step 4: Gather detailed data for priority issues
        detailed_issues = []
        priority_issues = _prioritize_issues(issues, max_issues=20)

        for issue in priority_issues:
            issue_key = issue.get("key")
            if issue_key:
                logger.info(f"Gathering detailed data for issue {issue_key}")

                try:
                    # Get issue details, comments, and transitions
                    tasks = [
                        manager.execute_tool("atlassian", "get_issue", {"issue_key": issue_key}),
                        manager.execute_tool("atlassian", "get_issue_comments", {"issue_key": issue_key}),
                        manager.execute_tool("atlassian", "get_issue_transitions", {"issue_key": issue_key})
                    ]

                    results = await asyncio.gather(*tasks, return_exceptions=True)

                    issue_detail = _parse_tool_result(results[0]) if not isinstance(results[0], Exception) else issue
                    comments_data = _parse_tool_result(results[1]) if not isinstance(results[1], Exception) else []
                    transitions_data = _parse_tool_result(results[2]) if not isinstance(results[2], Exception) else []

                    detailed_issue = {
                        "key": issue_key,
                        "details": issue_detail,
                        "comments": comments_data if isinstance(comments_data, list) else [],
                        "transitions": transitions_data if isinstance(transitions_data, list) else []
                    }
                    detailed_issues.append(detailed_issue)

                except Exception as e:
                    logger.warning(f"Failed to get detailed data for issue {issue_key}: {e}")
                    detailed_issues.append({
                        "key": issue_key,
                        "details": issue,
                        "comments": [],
                        "transitions": []
                    })

        # Step 5: Compute aggregates and insights
        analysis_data = _compute_project_aggregates(issues, detailed_issues, vfl_boards, confluence_pages)

        # Step 6: Send to Claude for analysis
        logger.info("Sending VFL project data to Claude for analysis")
        claude_response = await _analyze_with_claude(manager, analysis_data)

        return claude_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VFL project agent failed: {e}")
        return {
            "error": f"Analysis failed: {str(e)}",
            "raw": str(e)
        }

def _extract_text_content(result) -> Optional[str]:
    """Extract text content from tool execution result"""
    if not result:
        return None

    try:
        if hasattr(result, 'content'):
            content = result.content
            if isinstance(content, list):
                return "\n".join([
                    item.text if hasattr(item, 'text') else str(item)
                    for item in content
                ])
            else:
                return str(content)
        else:
            return str(result)
    except Exception as e:
        logger.warning(f"Failed to extract text content: {e}")
        return None

def _parse_tool_result(result) -> Optional[Dict[str, Any]]:
    """Parse tool execution result into dictionary (for JSON responses)"""
    if not result:
        return None

    try:
        content_str = _extract_text_content(result)
        if not content_str:
            return None

        # Try to parse as JSON
        return json.loads(content_str)
    except (json.JSONDecodeError, AttributeError) as e:
        logger.warning(f"Failed to parse tool result as JSON: {e}")
        return None

def _parse_issues_from_text(jira_text: str) -> List[Dict[str, Any]]:
    """Parse Jira issues from text response"""
    issues = []

    # Simple parser for Jira issue format
    issue_blocks = jira_text.split('\n---\n')

    for block in issue_blocks:
        if not block.strip():
            continue

        issue = {}
        lines = block.strip().split('\n')

        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                value = value.strip()

                # Parse specific fields
                if key == 'key':
                    issue['key'] = value
                elif key == 'status':
                    issue['status'] = value
                elif key == 'priority':
                    issue['priority'] = value
                elif key == 'assignee':
                    issue['assignee'] = value
                elif key in ['created', 'updated']:
                    issue[key] = value
                else:
                    issue[key] = value

        if issue.get('key'):  # Only add if we have a key
            issues.append(issue)

    return issues

def _find_vfl_boards(boards_text: str) -> List[Dict[str, Any]]:
    """Find VFL-related boards from boards response"""
    boards = []

    # Look for VFL board and VFL Kanban
    if "VFL" in boards_text.upper():
        # Simple parser - in real implementation you'd parse the actual JSON/text format
        lines = boards_text.split('\n')
        current_board = {}

        for line in lines:
            if 'VFL' in line.upper():
                if 'board' in line.lower() or 'kanban' in line.lower():
                    # Extract board information
                    board_info = {
                        "name": line.strip(),
                        "type": "kanban" if "kanban" in line.lower() else "scrum"
                    }
                    boards.append(board_info)

    return boards

def _parse_confluence_pages(confluence_text: str) -> List[Dict[str, Any]]:
    """Parse Confluence pages from text response"""
    pages = []

    # Simple parser for Confluence page format
    page_blocks = confluence_text.split('\n---\n')

    for block in page_blocks:
        if not block.strip():
            continue

        page = {}
        lines = block.strip().split('\n')

        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                value = value.strip()

                if key in ['title', 'id', 'space', 'created', 'updated']:
                    page[key] = value

        if page.get('title'):  # Only add if we have a title
            pages.append(page)

    return pages

def _prioritize_issues(issues: List[Dict[str, Any]], max_issues: int = 20) -> List[Dict[str, Any]]:
    """Select and prioritize issues for detailed analysis"""
    if not issues:
        return []

    # Priority order: Highest, High, Medium, Low
    priority_order = ["highest", "high", "medium", "low"]

    # Also prioritize by status: In Progress, To Do, Done
    status_priority = ["in progress", "to do", "done"]

    def get_priority_score(issue):
        priority = issue.get("priority", "").lower()
        status = issue.get("status", "").lower()

        priority_score = priority_order.index(priority) if priority in priority_order else len(priority_order)
        status_score = status_priority.index(status) if status in status_priority else len(status_priority)

        return (priority_score, status_score)

    # Sort by priority and status
    sorted_issues = sorted(issues, key=get_priority_score)

    return sorted_issues[:max_issues]

def _compute_project_aggregates(all_issues: List[Dict[str, Any]],
                               detailed_issues: List[Dict[str, Any]],
                               boards: List[Dict[str, Any]],
                               confluence_pages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute aggregates and insights from VFL project data"""
    now = datetime.now()

    # Basic counts
    total_issues = len(all_issues)
    status_counts = Counter(issue.get("status", "unknown").lower() for issue in all_issues)
    priority_counts = Counter(issue.get("priority", "unknown").lower() for issue in all_issues)
    assignee_counts = Counter(issue.get("assignee", "unassigned") for issue in all_issues)

    # Calculate project health metrics
    health_metrics = _calculate_project_health(detailed_issues)

    # Find blocked or high-priority issues
    blocked_issues = _find_blocked_issues(detailed_issues)
    overdue_issues = _find_overdue_issues(detailed_issues)

    # Extract common themes from issue summaries
    themes = _extract_project_themes(all_issues)

    return {
        "summary": {
            "project": "VFL",
            "total_issues": total_issues,
            "detailed_analyzed": len(detailed_issues),
            "status_breakdown": dict(status_counts),
            "priority_breakdown": dict(priority_counts),
            "assignee_breakdown": dict(assignee_counts),
            "analysis_timestamp": now.isoformat(),
            "boards_found": len(boards),
            "confluence_pages": len(confluence_pages)
        },
        "health_metrics": health_metrics,
        "blocked_issues": blocked_issues,
        "overdue_issues": overdue_issues,
        "themes": themes,
        "boards": boards,
        "documentation": {
            "confluence_pages_count": len(confluence_pages),
            "sample_pages": confluence_pages[:5]  # First 5 pages as samples
        },
        "sample_issues": [
            {
                "key": issue["key"],
                "summary": issue["details"].get("summary", ""),
                "status": issue["details"].get("status", ""),
                "priority": issue["details"].get("priority", ""),
                "assignee": issue["details"].get("assignee", "")
            }
            for issue in detailed_issues[:10]  # Include first 10 as samples
        ]
    }

def _calculate_project_health(detailed_issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate project health metrics"""
    if not detailed_issues:
        return {"health_score": 0, "issues_analyzed": 0}

    total_issues = len(detailed_issues)
    in_progress_count = 0
    blocked_count = 0
    high_priority_count = 0

    for issue in detailed_issues:
        details = issue.get("details", {})
        status = details.get("status", "").lower()
        priority = details.get("priority", "").lower()

        if "progress" in status:
            in_progress_count += 1
        if "blocked" in status or "impediment" in str(details).lower():
            blocked_count += 1
        if priority in ["highest", "high"]:
            high_priority_count += 1

    # Simple health score calculation
    progress_ratio = in_progress_count / total_issues
    blocked_ratio = blocked_count / total_issues
    high_priority_ratio = high_priority_count / total_issues

    # Health score: good progress, low blocked items, manageable high priority items
    health_score = max(0, min(100,
        (progress_ratio * 40) +
        ((1 - blocked_ratio) * 30) +
        ((1 - min(high_priority_ratio, 0.5)) * 30)
    ))

    return {
        "health_score": round(health_score, 1),
        "issues_analyzed": total_issues,
        "in_progress_count": in_progress_count,
        "blocked_count": blocked_count,
        "high_priority_count": high_priority_count
    }

def _find_blocked_issues(detailed_issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find issues that are blocked or have impediments"""
    blocked = []

    for issue in detailed_issues:
        details = issue.get("details", {})
        status = details.get("status", "").lower()
        description = details.get("description", "").lower()

        # Look for blocked indicators
        if ("blocked" in status or
            "impediment" in description or
            "waiting" in status or
            "on hold" in status):

            blocked.append({
                "key": issue["key"],
                "summary": details.get("summary", "")[:100],
                "status": details.get("status", ""),
                "assignee": details.get("assignee", ""),
                "priority": details.get("priority", "")
            })

    return blocked

def _find_overdue_issues(detailed_issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find issues that are overdue"""
    overdue = []
    now = datetime.now()

    for issue in detailed_issues:
        details = issue.get("details", {})

        # Check if issue has a due date and is overdue
        due_date_str = details.get("due_date") or details.get("duedate")
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                if due_date < now and details.get("status", "").lower() not in ["done", "closed", "resolved"]:
                    days_overdue = (now - due_date).days
                    overdue.append({
                        "key": issue["key"],
                        "summary": details.get("summary", "")[:100],
                        "status": details.get("status", ""),
                        "assignee": details.get("assignee", ""),
                        "priority": details.get("priority", ""),
                        "days_overdue": days_overdue
                    })
            except (ValueError, TypeError):
                continue

    return overdue

def _extract_project_themes(issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract common themes from issue summaries and descriptions"""
    text_content = []
    issue_map = {}

    for issue in issues:
        issue_key = issue.get("key")
        summary = issue.get("summary", "")
        description = issue.get("description", "")

        text = f"{summary} {description}".lower()
        text_content.append(text)

        # Simple keyword extraction
        words = re.findall(r'\b[a-z]+\b', text)
        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 characters
                if word not in issue_map:
                    issue_map[word] = []
                issue_map[word].append(issue_key)

    # Find common themes
    themes = []
    common_words = {word: issue_keys for word, issue_keys in issue_map.items()
                    if len(issue_keys) >= 2 and word not in _get_stop_words()}

    # Sort by frequency
    sorted_themes = sorted(common_words.items(), key=lambda x: len(x[1]), reverse=True)

    for word, issue_keys in sorted_themes[:10]:  # Top 10 themes
        themes.append({
            "theme": word,
            "count": len(issue_keys),
            "sample_issue_keys": issue_keys[:5]
        })

    return themes

def _get_stop_words() -> set:
    """Get common stop words to filter out"""
    return {
        "the", "and", "this", "that", "with", "from", "they", "have", "been", "said",
        "each", "which", "their", "time", "will", "about", "would", "there", "could",
        "other", "after", "first", "into", "your", "what", "some", "only", "know",
        "just", "more", "than", "also", "back", "when", "very", "were", "then",
        "them", "these", "many", "most", "such", "long", "make", "over", "before",
        "here", "through", "much", "where", "should", "well", "without", "being",
        "issue", "ticket", "project", "task", "feature", "bug", "story", "epic"
    }

async def _analyze_with_claude(manager: MCPConnectionManager, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send VFL project analysis data to Claude and get structured response"""

    # Prepare compact payload for Claude
    payload = {
        "project_summary": analysis_data["summary"],
        "health_metrics": analysis_data["health_metrics"],
        "blocked_issues": analysis_data["blocked_issues"],
        "overdue_issues": analysis_data["overdue_issues"],
        "common_themes": analysis_data["themes"],
        "boards": analysis_data["boards"],
        "documentation": analysis_data["documentation"],
        "sample_issues": analysis_data["sample_issues"]
    }

    # System prompt for structured JSON response
    system_prompt = """You are a project management analytics expert specializing in Jira and Confluence analysis. Analyze the provided VFL project data and return ONLY a valid JSON object (no additional text, no markdown, no explanation).

CRITICAL: Your response must be ONLY valid JSON that can be parsed directly. Do not include any text before or after the JSON.

The JSON must follow this exact schema:
{
  "executive_summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "project_health": {
    "overall_score": number,
    "status_distribution": {"status": count},
    "priority_distribution": {"priority": count},
    "key_metrics": {
      "total_issues": number,
      "in_progress": number,
      "blocked": number,
      "overdue": number
    }
  },
  "themes": [
    {"theme": "string", "count": number, "sample_issue_keys": ["string"]}
  ],
  "bottlenecks": [
    {"issue": "string", "evidence": "string", "affected_issues": ["string"]}
  ],
  "recommendations": [
    {"action": "string", "owner": "string", "eta_days": number, "impact": "string", "effort": "string"}
  ],
  "sprint_insights": {
    "velocity_concerns": ["string"],
    "resource_allocation": ["string"],
    "risk_areas": ["string"]
  },
  "evidence": {
    "blocked_issues": [{"key": "string", "reason": "string"}],
    "overdue_issues": [{"key": "string", "days_overdue": number}],
    "notes": ["string"]
  }
}

Focus on actionable project management insights, identify sprint blockers, resource allocation issues, and provide specific recommendations for the VFL project team.

REMEMBER: Response must be ONLY the JSON object, nothing else."""

    user_prompt = f"""Analyze this VFL project data from Jira and Confluence:

{json.dumps(payload, indent=2)}

Return only the JSON response following the specified schema."""

    try:
        # Call Claude without structured output
        response = manager.anthropic.messages.create(
            model=manager.server_config.claude_model,
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # Extract and parse JSON response
        response_text = response.content[0].text if response.content else "{}"

        try:
            # Try to extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_text = response_text[json_start:json_end]
                parsed_response = json.loads(json_text)
                return parsed_response
            else:
                parsed_response = json.loads(response_text)
                return parsed_response

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            return {
                "error": f"Failed to parse Claude response: {str(e)}",
                "raw": response_text
            }

    except Exception as e:
        logger.error(f"Claude analysis failed: {e}")
        return {
            "error": f"Claude analysis failed: {str(e)}",
            "raw": str(e)
        }