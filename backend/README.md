# MCP FastAPI Server

A FastAPI server for connecting to multiple Model Context Protocol (MCP) servers with REST API endpoints for tool execution and query processing.

## Features

### Core Functionality
- **Multiple MCP Server Support**: Connect to and manage multiple MCP servers simultaneously
- **REST API**: Comprehensive HTTP endpoints for all MCP operations
- **Claude Integration**: Process natural language queries using Claude with MCP tools
- **Dynamic Connection Management**: Connect/disconnect from servers at runtime

### Advanced Operations
- **Batch Processing**: Execute multiple tools or connect to multiple servers in parallel or sequentially
- **Conversation Management**: Persistent conversation history with context-aware responses
- **Real-time Communication**: WebSocket support for live updates and interactive queries
- **File Operations**: Upload and process files through the API

### Monitoring & Administration
- **Comprehensive Metrics**: System-wide and per-server performance metrics
- **Health Monitoring**: Multi-level health checks and detailed status reporting
- **Configuration Management**: Dynamic server configuration without restart
- **Admin Controls**: System reset and state management

### Enterprise Features
- **Error Handling**: Robust error handling with detailed error reporting
- **Scalability**: Designed for concurrent operations and high throughput
- **Extensibility**: Easy to add new MCP servers and customize behavior
- **Observability**: Detailed logging, metrics, and real-time monitoring

## Installation

### Option 1: Using uv (Recommended)

```bash
uv sync
```

### Option 2: Using pip with requirements.txt

```bash
# Install core dependencies only
pip install -r requirements-minimal.txt

# Or install with all optional dependencies
pip install -r requirements.txt
```

### Option 3: Manual installation

```bash
pip install fastapi uvicorn pydantic anthropic mcp python-dotenv python-multipart websockets
```

## Quick Start

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and credentials
   ```

2. **Start the server**:
   ```bash
   python start_server.py
   # or directly with uvicorn
   python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access the API**:
   - Server: http://135.222.251.229:8000
   - Documentation: http://135.222.251.229:8000/docs
   - Health check: http://135.222.251.229:8000/health

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Atlassian (for Confluence/Jira integration)
CONFLUENCE_URL=https://your-domain.atlassian.net/
CONFLUENCE_USERNAME=your_email@domain.com
CONFLUENCE_API_TOKEN=your_confluence_api_token

JIRA_URL=https://your-domain.atlassian.net/
JIRA_USERNAME=your_email@domain.com
JIRA_API_TOKEN=your_jira_api_token

# Optional: Other MCP servers
BRAVE_API_KEY=your_brave_search_api_key
```

## API Endpoints

### Basic Operations
- `GET /` - Enhanced API information with categorized endpoints
- `GET /health` - Health check
- `GET /status/detailed` - Comprehensive system status

### Server Management
- `GET /servers` - List all available servers
- `GET /servers/connected` - List connected servers
- `GET /servers/{server_name}` - Get server details
- `POST /servers/connect` - Connect to a server
- `POST /servers/disconnect` - Disconnect from a server

### Batch Operations
- `POST /batch/tools/execute` - Execute multiple tools in parallel or sequential
- `POST /batch/servers/connect` - Connect to multiple servers simultaneously

### Server Configuration Management
- `POST /config/servers/add` - Add new server configuration
- `PUT /config/servers/{server_name}` - Update existing server configuration
- `DELETE /config/servers/{server_name}` - Remove server configuration

### Tool Management
- `GET /tools` - Get all available tools from connected servers
- `POST /tools/execute` - Execute a specific tool

### Query Processing
- `POST /query` - Process natural language queries with Claude
- `POST /conversations/query` - Process queries with conversation history

### Conversation Management
- `GET /conversations` - List all conversations
- `GET /conversations/{conversation_id}` - Get conversation history
- `DELETE /conversations/{conversation_id}` - Delete a conversation

### Monitoring & Metrics
- `GET /metrics/system` - Get comprehensive system metrics
- `GET /metrics/servers` - Get metrics for all servers
- `GET /metrics/servers/{server_name}` - Get metrics for specific server

### File Operations
- `POST /files/upload` - Upload files for processing
- `GET /files/download/{file_id}` - Download files (placeholder)

### Real-time Communication
- `WS /ws` - WebSocket endpoint for real-time updates and queries

### Administration
- `POST /admin/reset` - Reset system state (conversations, metrics, etc.)

## Usage Examples

### Connect to a Server

```bash
curl -X POST "http://135.222.251.229:8000/servers/connect" \
  -H "Content-Type: application/json" \
  -d '{"server_name": "atlassian"}'
```

### Process a Query

```bash
curl -X POST "http://135.222.251.229:8000/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find all recent issues in project ABC",
    "server_names": ["atlassian"]
  }'
```

### Execute a Tool Directly

```bash
curl -X POST "http://135.222.251.229:8000/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "atlassian",
    "tool_name": "search_jira",
    "arguments": {
      "jql": "project = ABC AND status = Open",
      "max_results": 10
    }
  }'
```

### Get Available Tools

```bash
curl "http://135.222.251.229:8000/tools"
```

### Enhanced Usage Examples

### Batch Connect to Multiple Servers

```bash
curl -X POST "http://135.222.251.229:8000/batch/servers/connect" \
  -H "Content-Type: application/json" \
  -d '{
    "server_names": ["atlassian", "filesystem"],
    "parallel": true
  }'
```

### Execute Multiple Tools in Batch

```bash
curl -X POST "http://135.222.251.229:8000/batch/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "executions": [
      {
        "server_name": "atlassian",
        "tool_name": "search_jira",
        "arguments": {"jql": "project = ABC", "max_results": 5}
      },
      {
        "server_name": "atlassian",
        "tool_name": "search_confluence",
        "arguments": {"query": "API documentation", "limit": 5}
      }
    ],
    "parallel": true
  }'
```

### Query with Conversation History

```bash
curl -X POST "http://135.222.251.229:8000/conversations/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the latest updates?",
    "conversation_id": "conv-123",
    "include_history": true,
    "server_names": ["atlassian"]
  }'
```

### Get System Metrics

```bash
curl "http://135.222.251.229:8000/metrics/system"
```

### Add New Server Configuration

```bash
curl -X POST "http://135.222.251.229:8000/config/servers/add" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_server",
    "config": {
      "name": "custom_server",
      "description": "Custom MCP server",
      "command": "python",
      "args": ["custom_server.py"],
      "env": {},
      "enabled": true
    }
  }'
```

### Upload File

```bash
curl -X POST "http://135.222.251.229:8000/files/upload" \
  -F "file=@document.pdf"
```

### WebSocket Connection (JavaScript)

```javascript
const ws = new WebSocket('ws://135.222.251.229:8000/ws');

ws.onopen = function() {
    // Send a query via WebSocket
    ws.send(JSON.stringify({
        type: 'query',
        query: 'Find recent issues',
        servers: ['atlassian']
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};
```

### Get Detailed Status

```bash
curl "http://135.222.251.229:8000/status/detailed"
```

### Reset System State

```bash
curl -X POST "http://135.222.251.229:8000/admin/reset"
```

## Supported MCP Servers

The server comes pre-configured with support for:

1. **Atlassian** - Confluence and Jira integration
2. **Filesystem** - Local file operations (disabled by default)
3. **Brave Search** - Web search capabilities (disabled by default)

## Configuration

Server configurations are defined in `config.py`. You can:

- Add new MCP server configurations
- Modify existing server parameters
- Enable/disable servers
- Customize environment variable mappings

## Development

### Project Structure

```
backend/
├── server.py           # Main FastAPI application
├── mcp_manager.py      # MCP connection management
├── config.py           # Configuration management
├── start_server.py     # Startup script
├── client.py           # Original console client
├── .env                # Environment variables
├── pyproject.toml      # Dependencies
└── README.md           # This file
```

### Adding New MCP Servers

1. Add server configuration to `get_default_mcp_servers()` in `config.py`
2. Set any required environment variables in `.env`
3. Restart the server and connect via the API

## Troubleshooting

### Common Issues

1. **Server won't start**: Check that all required environment variables are set
2. **Connection failures**: Verify Docker is running and MCP servers are accessible
3. **Tool execution errors**: Check API credentials and permissions
4. **Missing tools**: Ensure servers are connected and initialized properly

### Debug Mode

Start the server with debug logging:

```bash
python -m uvicorn server:app --reload --log-level debug
```
