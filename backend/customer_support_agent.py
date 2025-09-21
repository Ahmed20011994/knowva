import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from collections import Counter
import re

from fastapi import HTTPException
from mcp_manager import MCPConnectionManager

logger = logging.getLogger("customer_support_agent")

async def run_customer_agent(manager: MCPConnectionManager) -> Dict[str, Any]:
    """
    Customer Support Agent that analyzes Zendesk tickets and provides insights.

    Args:
        manager: MCPConnectionManager instance with Zendesk connected

    Returns:
        Dict containing structured analysis results
    """
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    # Check if Zendesk is connected
    if "zendesk" not in manager.get_connected_servers():
        raise HTTPException(status_code=400, detail="Zendesk server not connected")

    try:
        # Step 1: Get last 100 tickets
        logger.info("Fetching last 100 tickets from Zendesk")
        tickets_result = await manager.execute_tool("zendesk", "get_tickets", {"limit": 100})

        if not tickets_result or not tickets_result.content:
            raise HTTPException(status_code=500, detail="Failed to retrieve tickets from Zendesk")

        # Parse tickets response - Zendesk returns formatted text, not JSON
        tickets_text = _extract_text_content(tickets_result)
        if not tickets_text:
            raise HTTPException(status_code=500, detail="No tickets data received from Zendesk")

        tickets = _parse_tickets_from_text(tickets_text)
        logger.info(f"Retrieved {len(tickets)} tickets")

        # Step 2: Select up to 30 tickets (prioritize open, pending, hold)
        selected_tickets = _prioritize_tickets(tickets, max_tickets=30)
        logger.info(f"Selected {len(selected_tickets)} tickets for detailed analysis")

        # Step 3: Gather detailed data for selected tickets
        detailed_tickets = []
        for ticket in selected_tickets:
            ticket_id = ticket["id"]
            logger.info(f"Gathering detailed data for ticket {ticket_id}")

            try:
                # Get ticket details, comments, audits, and metrics in parallel
                tasks = [
                    manager.execute_tool("zendesk", "get_ticket_by_id", {"ticket_id": ticket_id}),
                    manager.execute_tool("zendesk", "get_ticket_comments", {"ticket_id": ticket_id, "limit": 100}),
                    manager.execute_tool("zendesk", "get_ticket_audits", {"ticket_id": ticket_id, "limit": 100}),
                    manager.execute_tool("zendesk", "get_ticket_metrics", {"ticket_id": ticket_id})
                ]

                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Parse results - handle both JSON and text responses
                ticket_detail = _parse_tool_result(results[0]) if not isinstance(results[0], Exception) else ticket
                comments_data = _parse_tool_result(results[1]) if not isinstance(results[1], Exception) else None
                audits_data = _parse_tool_result(results[2]) if not isinstance(results[2], Exception) else None
                metrics_data = _parse_tool_result(results[3]) if not isinstance(results[3], Exception) else None

                # Extract comments and audits (might be text format)
                comments = []
                if comments_data and isinstance(comments_data, dict) and "comments" in comments_data:
                    comments = comments_data["comments"]
                elif not isinstance(results[1], Exception):
                    # Try to parse from text if JSON parsing failed
                    comments_text = _extract_text_content(results[1])
                    if comments_text:
                        comments = _parse_comments_from_text(comments_text)

                audits = []
                if audits_data and isinstance(audits_data, dict) and "audits" in audits_data:
                    audits = audits_data["audits"]
                elif not isinstance(results[2], Exception):
                    # Try to parse from text if JSON parsing failed
                    audits_text = _extract_text_content(results[2])
                    if audits_text:
                        audits = _parse_audits_from_text(audits_text)

                metrics = metrics_data if metrics_data else {}

                detailed_ticket = {
                    "id": ticket_id,
                    "details": ticket_detail,
                    "comments": comments.get("comments", []) if comments else [],
                    "audits": audits.get("audits", []) if audits else [],
                    "metrics": metrics
                }
                detailed_tickets.append(detailed_ticket)

            except Exception as e:
                logger.warning(f"Failed to get detailed data for ticket {ticket_id}: {e}")
                # Include basic ticket info even if detailed fetch fails
                detailed_tickets.append({
                    "id": ticket_id,
                    "details": ticket,
                    "comments": [],
                    "audits": [],
                    "metrics": {}
                })

        # Step 4: Compute aggregates and insights
        analysis_data = _compute_aggregates(tickets, detailed_tickets)

        # Step 5: Send to Claude for analysis
        logger.info("Sending data to Claude for analysis")
        claude_response = await _analyze_with_claude(manager, analysis_data)

        return claude_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Customer support agent failed: {e}")
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
                # Join text content if it's a list
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

def _parse_tickets_from_text(tickets_text: str) -> List[Dict[str, Any]]:
    """Parse tickets from Zendesk formatted text response"""
    tickets = []

    # Split by ticket separators
    ticket_blocks = tickets_text.split('\n---\n')

    for block in ticket_blocks:
        if not block.strip():
            continue

        ticket = {}
        lines = block.strip().split('\n')

        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                value = value.strip()

                # Convert specific fields
                if key == 'id':
                    try:
                        ticket['id'] = int(value)
                    except ValueError:
                        ticket['id'] = value
                elif key in ['requester_id', 'assignee_id']:
                    try:
                        ticket[key] = int(value) if value != 'None' else None
                    except ValueError:
                        ticket[key] = value
                elif key in ['created', 'updated']:
                    ticket[key.replace('created', 'created_at').replace('updated', 'updated_at')] = value
                else:
                    ticket[key] = value

        if ticket.get('id'):  # Only add if we have an ID
            tickets.append(ticket)

    return tickets

def _parse_comments_from_text(comments_text: str) -> List[Dict[str, Any]]:
    """Parse comments from Zendesk text response"""
    comments = []
    # This is a simplified parser - you might need to adjust based on actual comment format
    if "Comment ID:" in comments_text:
        comment_blocks = comments_text.split("Comment ID:")
        for block in comment_blocks[1:]:  # Skip first empty block
            comment = {}
            lines = block.strip().split('\n')
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower().replace(' ', '_')
                    value = value.strip()
                    comment[key] = value
            if comment:
                comments.append(comment)
    return comments

def _parse_audits_from_text(audits_text: str) -> List[Dict[str, Any]]:
    """Parse audits from Zendesk text response"""
    audits = []
    # This is a simplified parser - you might need to adjust based on actual audit format
    if "Audit ID:" in audits_text:
        audit_blocks = audits_text.split("Audit ID:")
        for block in audit_blocks[1:]:  # Skip first empty block
            audit = {"events": []}
            lines = block.strip().split('\n')
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower().replace(' ', '_')
                    value = value.strip()

                    # Parse status changes
                    if "status" in key and "changed" in line.lower():
                        audit["events"].append({
                            "field_name": "status",
                            "previous_value": "unknown",
                            "value": value
                        })
                    else:
                        audit[key] = value
            if audit.get("events"):
                audits.append(audit)
    return audits

def _prioritize_tickets(tickets: List[Dict[str, Any]], max_tickets: int = 30) -> List[Dict[str, Any]]:
    """Select and prioritize tickets for analysis"""
    if not tickets:
        return []

    # Priority order: open, pending, hold, solved, closed
    priority_statuses = ["open", "pending", "hold", "solved", "closed"]

    prioritized = []
    for status in priority_statuses:
        status_tickets = [t for t in tickets if t.get("status", "").lower() == status]
        prioritized.extend(status_tickets)

        if len(prioritized) >= max_tickets:
            break

    return prioritized[:max_tickets]

def _compute_aggregates(all_tickets: List[Dict[str, Any]], detailed_tickets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute aggregates and insights from ticket data"""
    now = datetime.now()

    # Basic counts
    total_tickets = len(all_tickets)
    status_counts = Counter(ticket.get("status", "unknown") for ticket in all_tickets)

    # SLA calculations
    sla_metrics = _compute_sla_metrics(detailed_tickets)

    # Find reopened tickets (tickets with multiple status changes)
    reopened_tickets = _find_reopened_tickets(detailed_tickets)

    # Find long-pending tickets (>72h with no update)
    long_pending_tickets = _find_long_pending_tickets(detailed_tickets, hours_threshold=72)

    # Extract themes from subjects and descriptions
    themes = _extract_themes(all_tickets)

    return {
        "summary": {
            "total_tickets": total_tickets,
            "detailed_analyzed": len(detailed_tickets),
            "status_breakdown": dict(status_counts),
            "analysis_timestamp": now.isoformat()
        },
        "sla_metrics": sla_metrics,
        "reopened_tickets": reopened_tickets,
        "long_pending_tickets": long_pending_tickets,
        "themes": themes,
        "sample_tickets": [
            {
                "id": ticket["id"],
                "subject": ticket["details"].get("subject", ""),
                "status": ticket["details"].get("status", ""),
                "priority": ticket["details"].get("priority", ""),
                "created_at": ticket["details"].get("created_at", ""),
                "updated_at": ticket["details"].get("updated_at", "")
            }
            for ticket in detailed_tickets[:10]  # Include first 10 as samples
        ]
    }

def _compute_sla_metrics(detailed_tickets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute SLA-related metrics"""
    first_reply_times = []
    resolution_times = []
    breaches = 0

    for ticket in detailed_tickets:
        metrics = ticket.get("metrics", {})

        # First reply time
        if "reply_time_in_minutes" in metrics and metrics["reply_time_in_minutes"]:
            first_reply_times.append(metrics["reply_time_in_minutes"]["business_minutes"] / 60.0)  # Convert to hours

        # Resolution time
        if "resolution_time_in_minutes" in metrics and metrics["resolution_time_in_minutes"]:
            resolution_times.append(metrics["resolution_time_in_minutes"]["business_minutes"] / 60.0)  # Convert to hours

        # SLA breaches (check if any SLA fields indicate breach)
        if any(field.get("breached", False) for field in [
            metrics.get("reply_time_in_minutes", {}),
            metrics.get("resolution_time_in_minutes", {}),
            metrics.get("first_resolution_time_in_minutes", {})
        ] if isinstance(field, dict)):
            breaches += 1

    return {
        "avg_first_reply_hours": sum(first_reply_times) / len(first_reply_times) if first_reply_times else None,
        "avg_resolution_hours": sum(resolution_times) / len(resolution_times) if resolution_times else None,
        "breaches_count": breaches,
        "metrics_available": len([t for t in detailed_tickets if t.get("metrics")])
    }

def _find_reopened_tickets(detailed_tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find tickets that have been reopened (status changed from solved/closed back to open)"""
    reopened = []

    for ticket in detailed_tickets:
        audits = ticket.get("audits", [])
        status_changes = []

        for audit in audits:
            for event in audit.get("events", []):
                if event.get("field_name") == "status":
                    status_changes.append({
                        "from": event.get("previous_value"),
                        "to": event.get("value"),
                        "timestamp": audit.get("created_at")
                    })

        # Check if ticket was solved/closed and then reopened
        was_closed = False
        was_reopened = False

        for change in status_changes:
            if change["to"] in ["solved", "closed"]:
                was_closed = True
            elif was_closed and change["to"] in ["open", "pending"]:
                was_reopened = True
                break

        if was_reopened:
            reopened.append({
                "ticket_id": ticket["id"],
                "current_status": ticket["details"].get("status"),
                "status_changes": len(status_changes),
                "subject": ticket["details"].get("subject", "")[:100]
            })

    return reopened

def _find_long_pending_tickets(detailed_tickets: List[Dict[str, Any]], hours_threshold: int = 72) -> List[Dict[str, Any]]:
    """Find tickets that have been pending for more than threshold hours"""
    now = datetime.now()
    threshold = timedelta(hours=hours_threshold)
    long_pending = []

    for ticket in detailed_tickets:
        details = ticket.get("details", {})
        if details.get("status") in ["pending", "hold"]:
            try:
                updated_at = datetime.fromisoformat(details.get("updated_at", "").replace("Z", "+00:00"))
                if now - updated_at > threshold:
                    long_pending.append({
                        "ticket_id": ticket["id"],
                        "status": details.get("status"),
                        "days_since_update": (now - updated_at).days,
                        "subject": details.get("subject", "")[:100],
                        "priority": details.get("priority")
                    })
            except (ValueError, TypeError):
                # Skip tickets with invalid timestamps
                continue

    return long_pending

def _extract_themes(tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract common themes from ticket subjects and descriptions"""
    # Collect all text content
    text_content = []
    ticket_map = {}  # Map keywords to ticket IDs

    for ticket in tickets:
        ticket_id = ticket.get("id")
        subject = ticket.get("subject", "")
        description = ticket.get("description", "")

        text = f"{subject} {description}".lower()
        text_content.append(text)

        # Simple keyword extraction
        words = re.findall(r'\b[a-z]+\b', text)
        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 characters
                if word not in ticket_map:
                    ticket_map[word] = []
                ticket_map[word].append(ticket_id)

    # Find common themes (words appearing in multiple tickets)
    themes = []
    common_words = {word: ticket_ids for word, ticket_ids in ticket_map.items()
                    if len(ticket_ids) >= 2 and word not in _get_stop_words()}

    # Sort by frequency and take top themes
    sorted_themes = sorted(common_words.items(), key=lambda x: len(x[1]), reverse=True)

    for word, ticket_ids in sorted_themes[:10]:  # Top 10 themes
        themes.append({
            "theme": word,
            "count": len(ticket_ids),
            "sample_ticket_ids": ticket_ids[:5]  # Show up to 5 sample tickets
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
        "here", "through", "much", "where", "should", "well", "without", "being"
    }

async def _analyze_with_claude(manager: MCPConnectionManager, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send analysis data to Claude and get structured response"""

    # Prepare compact payload for Claude
    payload = {
        "ticket_summary": analysis_data["summary"],
        "sla_performance": analysis_data["sla_metrics"],
        "reopened_tickets": analysis_data["reopened_tickets"],
        "long_pending_tickets": analysis_data["long_pending_tickets"],
        "common_themes": analysis_data["themes"],
        "sample_tickets": analysis_data["sample_tickets"]
    }

    # System prompt for structured JSON response
    system_prompt = """You are a customer support analytics expert. Analyze the provided Zendesk ticket data and return ONLY a valid JSON object (no additional text, no markdown, no explanation).

CRITICAL: Your response must be ONLY valid JSON that can be parsed directly. Do not include any text before or after the JSON.

The JSON must follow this exact schema:
{
  "executive_summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "kpis": {
    "total_tickets": number,
    "by_status": {"status": count},
    "sla": {
      "avg_first_reply_hours": number_or_null,
      "avg_resolution_hours": number_or_null,
      "breaches_count": number
    }
  },
  "themes": [
    {"theme": "string", "count": number, "sample_ticket_ids": [numbers]}
  ],
  "bottlenecks": [
    {"issue": "string", "evidence": "string", "affected_ticket_ids": [numbers]}
  ],
  "recommendations": [
    {"action": "string", "owner": "string", "eta_days": number, "impact": "string", "effort": "string"}
  ],
  "evidence": {
    "samples": [{"ticket_id": number, "notes": "string"}],
    "notes": ["string"]
  }
}

Focus on actionable insights, identify patterns, and provide specific recommendations. Use the provided data to support your analysis.

REMEMBER: Response must be ONLY the JSON object, nothing else."""

    user_prompt = f"""Analyze this customer support data:

{json.dumps(payload, indent=2)}

Return only the JSON response following the specified schema."""

    try:

        # Call Claude without structured output (using clear instructions instead)
        response = manager.anthropic.messages.create(
            model=manager.server_config.claude_model,
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # Extract and parse JSON response
        response_text = response.content[0].text if response.content else "{}"

        try:
            # Try to extract JSON from response if it contains extra text
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_text = response_text[json_start:json_end]
                parsed_response = json.loads(json_text)
                return parsed_response
            else:
                # If no JSON found, try parsing the whole response
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