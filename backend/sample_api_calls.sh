#!/bin/bash

# Note: Replace "your_conversation_id_here" with an actual conversation ID returned by the API.
# Replace "user123" with a relevant user ID from your application.

# 1. Start a new conversation (using the /query endpoint)
# This will create a new conversation if one doesn't exist for the user.
echo "--- Starting a new conversation ---"
curl -X POST http://localhost:8000/query \
-H "Content-Type: application/json" \
-d '{
  "user_id": "user123",
  "query": "Hello, what are your capabilities?",
  "server_names": ["zendesk", "jira", "confluence"]
}'
echo -e "\n"

# 2. Continue an existing conversation (using the /conversations/query endpoint)
# You need to get a conversation_id from the previous call to use here.
curl -X POST http://localhost:8000/conversations/query \
-H "Content-Type: application/json" \
-d '{
  "user_id": "user123",
  "conversation_id": "your_conversation_id_here",
  "query": "Can you elaborate on tool execution?",
  "server_names": ["zendesk"]
}'
echo -e "\n"

# 3. List all conversations for a user
echo "--- Listing all conversations for user123 ---"
curl -X GET http://localhost:8000/conversations?user_id=user123
echo -e "\n"

# 4. Get the history of a specific conversation
echo "--- Getting a specific conversation's history ---"
curl -X GET http://localhost:8000/conversations/your_conversation_id_here
echo -e "\n"

# 5. Delete a conversation
echo "--- Deleting a conversation ---"
curl -X DELETE http://localhost:8000/conversations/your_conversation_id_here
echo -e "\n"

# --- Server Management Endpoints ---
# Note: Replace "zendesk" with a server name from your configuration if different.

# 6. List all available servers
echo "--- Listing all available servers ---"
curl -X GET http://localhost:8000/servers
echo -e "\n"

# 7. List connected servers
echo "--- Listing connected servers ---"
curl -X GET http://localhost:8000/servers/connected
echo -e "\n"

# 8. Get detailed information for a specific server
echo "--- Getting info for 'zendesk' server ---"
curl -X GET http://localhost:8000/servers/zendesk
echo -e "\n"
echo "--- Getting info for 'jira' server ---"
curl -X GET http://localhost:8000/servers/jira
echo -e "\n"
echo "--- Getting info for 'confluence' server ---"
curl -X GET http://localhost:8000/servers/confluence
echo -e "\n"

# 9. Connect to a server
echo "--- Connecting to 'zendesk' server ---"
curl -X POST http://localhost:8000/servers/connect \
-H "Content-Type: application/json" \
-d '{
  "server_name": "zendesk"
}'
echo -e "\n"

# 10. Disconnect from a server
echo "--- Disconnecting from 'zendesk' server ---"
curl -X POST http://localhost:8000/servers/disconnect \
-H "Content-Type: application/json" \
-d '{
  "server_name": "zendesk"
}'
echo -e "\n"

# 11. Connect to multiple servers in batch
echo "--- Connecting to multiple servers in batch ---"
curl -X POST http://localhost:8000/batch/servers/connect \
-H "Content-Type: application/json" \
-d '{
  "server_names": ["zendesk", "jira", "confluence"],
  "parallel": true
}'
echo -e "\n"

# 12. Execute a tool on a server
echo "--- Executing a tool on 'zendesk' ---"
curl -X POST http://localhost:8000/tools/execute \
-H "Content-Type: application/json" \
-d '{
  "server_name": "zendesk",
  "tool_name": "get_ticket",
  "arguments": {
    "ticket_id": "12345"
  }
}'
echo -e "\n"

echo "--- Executing a tool on 'jira' ---"
curl -X POST http://localhost:8000/tools/execute \
-H "Content-Type: application/json" \
-d '{
  "server_name": "jira",
  "tool_name": "get_issue",
  "arguments": {
    "issue_key": "PROJ-123"
  }
}'
echo -e "\n"

echo "--- Executing a tool on 'confluence' ---"
curl -X POST http://localhost:8000/tools/execute \
-H "Content-Type: application/json" \
-d '{
  "server_name": "confluence",
  "tool_name": "search_pages",
  "arguments": {
    "query": "API documentation"
  }
}'
echo -e "\n"
