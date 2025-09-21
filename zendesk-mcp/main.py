from typing import Any, Optional, Dict, List
import base64
import os
import httpx
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from mcp.server import Server
import uvicorn

# =============================================================================
# MCP SSE Server for Zendesk (single tool: get_tickets)
# =============================================================================

# Initialize FastMCP server for Zendesk tools (SSE)
mcp = FastMCP("zendesk")

# -----------------------------------------------------------------------------
# Config (env vars)
# -----------------------------------------------------------------------------
ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN", "").strip()  # e.g., "mycompany"
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL", "").strip()          # e.g., "me@company.com"
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN", "").strip()  # e.g., "abcd1234..."
USER_AGENT = os.getenv("USER_AGENT", "zendesk-mcp/1.0")

if not ZENDESK_SUBDOMAIN:
    raise RuntimeError("ZENDESK_SUBDOMAIN is required")
if not ZENDESK_EMAIL:
    raise RuntimeError("ZENDESK_EMAIL is required")
if not ZENDESK_API_TOKEN:
    raise RuntimeError("ZENDESK_API_TOKEN is required")

ZENDESK_API_BASE = f"https://{ZENDESK_SUBDOMAIN}.zendesk.com/api/v2"

# -----------------------------------------------------------------------------
# HTTP helpers
# -----------------------------------------------------------------------------
def _auth_header() -> str:
    """
    Zendesk API token auth:
      username = "<email>/token"
      password = "<api_token>"
      header   = "Authorization: Basic base64(username:password)"
    """
    raw = f"{ZENDESK_EMAIL}/token:{ZENDESK_API_TOKEN}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("utf-8")

async def _request(
    method: str,
    url: str,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    headers = {
        "Authorization": _auth_header(),
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.request(method, url, headers=headers, params=params, timeout=30.0)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None

# -----------------------------------------------------------------------------
# Formatting
# -----------------------------------------------------------------------------
def _format_ticket(t: Dict[str, Any]) -> str:
    fields = [
        f"ID: {t.get('id', 'N/A')}",
        f"Subject: {t.get('subject', '')}",
        f"Status: {t.get('status', '')}",
        f"Priority: {t.get('priority', '')}",
        f"Requester ID: {t.get('requester_id', '')}",
        f"Assignee ID: {t.get('assignee_id', '')}",
        f"Created: {t.get('created_at', '')}",
        f"Updated: {t.get('updated_at', '')}",
        f"URL: {t.get('url', '')}",
    ]
    return "\n".join(fields)

def _format_list(tickets: List[Dict[str, Any]]) -> str:
    if not tickets:
        return "No tickets found."
    return "\n\n---\n\n".join(_format_ticket(t) for t in tickets)

# -----------------------------------------------------------------------------
# Tool: get_tickets
# -----------------------------------------------------------------------------
@mcp.tool()
async def get_tickets(
    query: Optional[str] = None,
    status: Optional[str] = None,
    assignee_email: Optional[str] = None,
    requester_email: Optional[str] = None,
    per_page: int = 25,
    page: int = 1,
) -> str:
    """
    Retrieve Zendesk tickets.

    Args:
        query: Free-text search query (appended to the base 'type:ticket' query).
        status: Filter by status (e.g., 'open', 'new', 'pending', 'hold', 'solved', 'closed').
        assignee_email: Filter by assignee email.
        requester_email: Filter by requester email.
        per_page: Results per page (default 25).
        page: Page number (1-based).

    Notes:
        Uses the /search endpoint: GET /api/v2/search.json
        with a query built like: type:ticket status:open assignee:someone@example.com ...
    """
    # Build search query
    q_parts = ["type:ticket"]
    if status:
        q_parts.append(f"status:{status}")
    if assignee_email:
        q_parts.append(f'assignee:"{assignee_email}"')
    if requester_email:
        q_parts.append(f'requester:"{requester_email}"')
    if query:
        q_parts.append(query)

    params = {
        "query": " ".join(q_parts),
        "page": page,
        "per_page": per_page,
        "sort_by": "created_at",
        "sort_order": "desc",
    }

    url = f"{ZENDESK_API_BASE}/search.json"
    data = await _request("GET", url, params=params)

    if not data or "results" not in data:
        return "Unable to fetch tickets (check credentials, subdomain, or filters)."

    # The search API returns a mixed set (tickets, users, etc.), but we constrained type:ticket
    tickets = data.get("results", [])
    if not tickets:
        return "No tickets found."

    # Keep only relevant fields typically present on tickets
    normalized: List[Dict[str, Any]] = []
    for r in tickets:
        # Some fields may be absent on search results; best-effort extraction
        normalized.append({
            "id": r.get("id"),
            "url": r.get("url"),
            "subject": r.get("subject"),
            "status": r.get("status"),
            "priority": r.get("priority"),
            "requester_id": r.get("requester_id"),
            "assignee_id": r.get("assignee_id"),
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
        })

    return _format_list(normalized)

# -----------------------------------------------------------------------------
# Tool: get_ticket_by_id
# -----------------------------------------------------------------------------
@mcp.tool()
async def get_ticket_by_id(ticket_id: int) -> str:
    """
    Retrieve a single ticket by ID.
    """
    url = f"{ZENDESK_API_BASE}/tickets/{ticket_id}.json"
    data = await _request("GET", url)

    if not data or "ticket" not in data:
        return f"Unable to fetch ticket {ticket_id}"

    return _format_ticket(data["ticket"])


# -----------------------------------------------------------------------------
# Tool: get_ticket_comments
# -----------------------------------------------------------------------------
@mcp.tool()
async def get_ticket_comments(ticket_id: int, page: int = 1, per_page: int = 25) -> str:
    """
    Retrieve comments for a ticket.
    """
    url = f"{ZENDESK_API_BASE}/tickets/{ticket_id}/comments.json"
    params = {"page": page, "per_page": per_page}
    data = await _request("GET", url, params=params)

    if not data or "comments" not in data:
        return f"No comments found for ticket {ticket_id}"

    comments = data["comments"]
    return "\n\n---\n\n".join(
        f"ID: {c.get('id')} | Author ID: {c.get('author_id')} | Created: {c.get('created_at')}\n"
        f"Body:\n{c.get('body', '')}"
        for c in comments
    )


# -----------------------------------------------------------------------------
# Tool: get_ticket_audits
# -----------------------------------------------------------------------------
@mcp.tool()
async def get_ticket_audits(ticket_id: int, page: int = 1, per_page: int = 25) -> str:
    """
    Retrieve audits (event history) for a ticket.
    """
    url = f"{ZENDESK_API_BASE}/tickets/{ticket_id}/audits.json"
    params = {"page": page, "per_page": per_page}
    data = await _request("GET", url, params=params)

    if not data or "audits" not in data:
        return f"No audits found for ticket {ticket_id}"

    audits = data["audits"]
    return "\n\n---\n\n".join(
        f"Audit ID: {a.get('id')} | Created: {a.get('created_at')} | Author: {a.get('author_id')}\n"
        f"Events: {[e.get('type') for e in a.get('events', [])]}"
        for a in audits
    )


# -----------------------------------------------------------------------------
# Tool: get_ticket_metrics
# -----------------------------------------------------------------------------
@mcp.tool()
async def get_ticket_metrics(ticket_id: int) -> str:
    """
    Retrieve ticket metrics (time to first reply, resolution, etc.).
    """
    url = f"{ZENDESK_API_BASE}/tickets/{ticket_id}/metrics.json"
    data = await _request("GET", url)

    if not data or "ticket_metric" not in data:
        return f"No metrics found for ticket {ticket_id}"

    m = data["ticket_metric"]
    return "\n".join(
        f"{k}: {v}" for k, v in m.items()
    )


# -----------------------------------------------------------------------------
# Starlette app (SSE transport for MCP)
# -----------------------------------------------------------------------------
def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    """Create a Starlette application that can serve the provided MCP server with SSE."""
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(
            request.scope,
            request.receive,
            request._send,  # noqa: SLF001
        ) as (read_stream, write_stream):
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )

# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    mcp_server = mcp._mcp_server  # noqa: WPS437

    import argparse
    parser = argparse.ArgumentParser(description="Run MCP SSE-based server for Zendesk")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable Starlette debug")
    args = parser.parse_args()

    app = create_starlette_app(mcp_server, debug=args.debug)
    uvicorn.run(app, host=args.host, port=args.port)
