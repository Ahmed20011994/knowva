from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import asyncio
import json
import time
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
import os
import tempfile

from config import load_config, MCPServerConfig, setup_logging
from mcp_manager import MCPConnectionManager
from auth_routes import router as auth_router
from database import (
    connect_to_mongo,
    close_mongo_connection,
    create_indexes,
    get_conversation,
    get_conversations_for_user,
    get_or_create_conversation_for_user,
    add_message_to_conversation,
    delete_conversation,
    Conversation as DbConversation,
    Message as DbMessage
)
from customer_support_agent import run_customer_agent
from vfl_project_agent import run_vfl_project_agent


# Pydantic models for requests/responses
class QueryRequest(BaseModel):
    query: str
    server_names: Optional[List[str]] = None
    enable_chaining: Optional[bool] = True


class ToolExecutionRequest(BaseModel):
    server_name: str
    tool_name: str
    arguments: Dict[str, Any]


class ConnectionRequest(BaseModel):
    server_name: str


class SSEConnectionRequest(BaseModel):
    server_name: str
    server_url: str


class QueryResponse(BaseModel):
    response: str
    servers_used: List[str]


class ServerInfo(BaseModel):
    name: str
    description: str
    enabled: bool
    connected: bool
    connected_at: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_count: Optional[int] = None


class ToolExecutionResponse(BaseModel):
    server_name: str
    tool_name: str
    success: bool
    result: Any = None
    error: Optional[str] = None


# New enhanced models
class BatchToolExecutionRequest(BaseModel):
    executions: List[ToolExecutionRequest]
    parallel: bool = True


class BatchToolExecutionResponse(BaseModel):
    results: List[ToolExecutionResponse]
    execution_time: float
    total_count: int
    success_count: int
    failure_count: int


class BatchServerConnectionRequest(BaseModel):
    server_names: List[str]
    parallel: bool = True


class ServerConfigRequest(BaseModel):
    name: str
    config: MCPServerConfig


class ConversationMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    role: str  # 'user', 'assistant', 'system'
    content: str
    servers_used: Optional[List[str]] = None
    tools_called: Optional[List[str]] = None


class ConversationRequest(BaseModel):
    query: str
    user_id: str
    conversation_id: Optional[str] = None
    server_names: Optional[List[str]] = None
    enable_chaining: Optional[bool] = True


class ConversationResponse(BaseModel):
    conversation_id: str
    message: ConversationMessage
    response: str
    servers_used: List[str]


class ServerMetrics(BaseModel):
    server_name: str
    connected: bool
    connection_duration: Optional[float] = None
    tool_calls_count: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    last_activity: Optional[datetime] = None
    tools_available: int = 0


class SystemMetrics(BaseModel):
    uptime: float
    total_servers: int
    connected_servers: int
    total_queries: int
    total_tool_calls: int
    active_connections: int
    memory_usage: Optional[Dict[str, Any]] = None


class WebSocketMessage(BaseModel):
    type: str  # 'query', 'tool_call', 'connection', 'status'
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)


# Global manager instance and state
manager: Optional[MCPConnectionManager] = None
start_time: float = time.time()
conversations: Dict[str, List[ConversationMessage]] = {}
server_metrics: Dict[str, ServerMetrics] = {}
system_stats = {
    "total_queries": 0,
    "total_tool_calls": 0,
    "websocket_connections": set()
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global manager

    # Startup
    try:
        # Initialize database connection
        await connect_to_mongo()
        await create_indexes()

        config = load_config()
        setup_logging(config.log_level)
        manager = MCPConnectionManager(config)
        print("MCP Connection Manager initialized")

        # Log startup details
        import logging
        logger = logging.getLogger("server")
        logger.info(f"Server starting with log level: {config.log_level}")
        logger.info(f"Tool call logging enabled: {config.log_tool_calls}")

        # Auto-connect to Atlassian and Zendesk SSE servers if URLs are provided
        atlassian_url = os.getenv("ATLASSIAN_MCP_URL")
        zendesk_url = os.getenv("ZENDESK_MCP_URL")

        async def connect_with_retry(server_name: str, url: str, max_retries: int = 3, delay: int = 5):
            """Attempt to connect to MCP server with retry mechanism"""
            for attempt in range(max_retries):
                try:
                    await manager.connect_to_sse_server(server_name, url)
                    logger.info(f"Successfully connected to {server_name} MCP server at {url}")
                    return True
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Failed to connect to {server_name} MCP server (attempt {attempt + 1}/{max_retries}): {e}")
                        logger.info(f"Retrying in {delay} seconds...")
                        await asyncio.sleep(delay)
                    else:
                        logger.error(f"Failed to connect to {server_name} MCP server after {max_retries} attempts: {e}")
                        return False

        if atlassian_url:
            await connect_with_retry("atlassian", atlassian_url)

        if zendesk_url:
            await connect_with_retry("zendesk", zendesk_url)

    except Exception as e:
        print(f"Failed to initialize manager: {e}")
        raise

    yield

    # Shutdown
    if manager:
        await manager.disconnect_all()
        print("All MCP connections closed")

    # Close database connection
    await close_mongo_connection()


# Create FastAPI app
app = FastAPI(
    title="MCP Server API",
    description="FastAPI server for connecting to multiple Model Context Protocol (MCP) servers",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include authentication routes
app.include_router(auth_router)


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Enhanced MCP Server API",
        "version": "2.0.0",
        "description": "Comprehensive FastAPI server for multiple MCP connections with advanced features",
        "categories": {
            "basic": {
                "GET /": "This endpoint",
                "GET /health": "Health check",
                "GET /status/detailed": "Detailed system status"
            },
            "server_management": {
                "GET /servers": "List all available servers",
                "GET /servers/connected": "List connected servers",
                "GET /servers/{server_name}": "Get server information",
                "POST /servers/connect": "Connect to a server",
                "POST /servers/disconnect": "Disconnect from a server"
            },
            "batch_operations": {
                "POST /batch/tools/execute": "Execute multiple tools in batch",
                "POST /batch/servers/connect": "Connect to multiple servers in batch"
            },
            "configuration": {
                "POST /config/servers/add": "Add new server configuration",
                "PUT /config/servers/{server_name}": "Update server configuration",
                "DELETE /config/servers/{server_name}": "Remove server configuration"
            },
            "tools": {
                "GET /tools": "Get all available tools",
                "POST /tools/execute": "Execute a specific tool"
            },
            "queries": {
                "POST /query": "Process a query with Claude",
                "POST /conversations/query": "Process query with conversation history"
            },
            "conversations": {
                "GET /conversations": "List all conversations",
                "GET /conversations/{conversation_id}": "Get conversation history",
                "DELETE /conversations/{conversation_id}": "Delete a conversation"
            },
            "monitoring": {
                "GET /metrics/system": "Get system metrics",
                "GET /metrics/servers": "Get metrics for all servers",
                "GET /metrics/servers/{server_name}": "Get metrics for specific server"
            },
            "files": {
                "POST /files/upload": "Upload a file",
                "GET /files/download/{file_id}": "Download a file"
            },
            "websocket": {
                "WS /ws": "WebSocket endpoint for real-time updates"
            },
            "admin": {
                "POST /admin/reset": "Reset system state"
            }
        },
        "features": [
            "Multiple MCP server connections",
            "Batch operations (parallel/sequential)",
            "Real-time WebSocket communication",
            "Conversation history management",
            "Comprehensive monitoring and metrics",
            "Dynamic server configuration",
            "File upload/download support",
            "Advanced error handling"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    connected_count = len(manager.get_connected_servers())
    available_count = len(manager.get_available_servers())

    return {
        "status": "healthy",
        "connected_servers": connected_count,
        "available_servers": available_count,
        "manager_initialized": manager is not None
    }


@app.get("/servers", response_model=List[str])
async def list_available_servers():
    """List all available MCP servers from configuration"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    return manager.get_available_servers()


@app.get("/servers/connected", response_model=List[str])
async def list_connected_servers():
    """List currently connected MCP servers"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    return manager.get_connected_servers()


@app.get("/servers/{server_name}", response_model=ServerInfo)
async def get_server_info(server_name: str):
    """Get detailed information about a specific server"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    try:
        info = manager.get_server_info(server_name)
        return ServerInfo(**info)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/servers/connect")
async def connect_server(request: ConnectionRequest):
    """Connect to an MCP server"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    try:
        success = await manager.connect_to_server(request.server_name)
        if success:
            return {
                "success": True,
                "message": f"Successfully connected to server '{request.server_name}'",
                "server_name": request.server_name
            }
        else:
            raise HTTPException(status_code=500, detail="Connection failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/servers/connect/sse")
async def connect_sse_server(request: SSEConnectionRequest):
    """Connect to an MCP server using SSE transport"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    try:
        success = await manager.connect_to_sse_server(request.server_name, request.server_url)
        if success:
            return {
                "success": True,
                "message": f"Successfully connected to SSE server '{request.server_name}' at {request.server_url}",
                "server_name": request.server_name,
                "server_url": request.server_url,
                "connection_type": "sse"
            }
        else:
            raise HTTPException(status_code=500, detail="SSE connection failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/servers/disconnect")
async def disconnect_server(request: ConnectionRequest):
    """Disconnect from an MCP server"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    success = await manager.disconnect_from_server(request.server_name)
    if success:
        return {
            "success": True,
            "message": f"Successfully disconnected from server '{request.server_name}'",
            "server_name": request.server_name
        }
    else:
        raise HTTPException(status_code=404, detail=f"Server '{request.server_name}' was not connected")


@app.get("/tools")
async def get_all_tools():
    """Get all available tools from connected servers"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    tools = manager.get_all_tools()

    # Flatten tools with server prefixes for easier consumption
    flattened = {}
    total_tools = 0

    for server_name, server_tools in tools.items():
        flattened[server_name] = {
            "tools": server_tools,
            "count": len(server_tools)
        }
        total_tools += len(server_tools)

    return {
        "servers": flattened,
        "total_tools": total_tools,
        "connected_servers": len(tools)
    }


@app.post("/tools/execute", response_model=ToolExecutionResponse)
async def execute_tool(request: ToolExecutionRequest):
    """Execute a specific tool on a server"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    import logging
    api_logger = logging.getLogger("api_tool_calls")

    if manager.server_config.log_tool_calls:
        api_logger.info(
            f"API_TOOL_REQUEST - Server: {request.server_name} | Tool: {request.tool_name} | Args: {request.arguments}")

    try:
        result = await manager.execute_tool(
            request.server_name,
            request.tool_name,
            request.arguments
        )

        response = ToolExecutionResponse(
            server_name=request.server_name,
            tool_name=request.tool_name,
            success=True,
            result=result.content if hasattr(result, 'content') else result
        )

        if manager.server_config.log_tool_calls:
            api_logger.info(f"API_TOOL_SUCCESS - Server: {request.server_name} | Tool: {request.tool_name}")

        return response
    except Exception as e:
        if manager.server_config.log_tool_calls:
            api_logger.error(
                f"API_TOOL_ERROR - Server: {request.server_name} | Tool: {request.tool_name} | Error: {str(e)}")

        return ToolExecutionResponse(
            server_name=request.server_name,
            tool_name=request.tool_name,
            success=False,
            error=str(e)
        )


@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process a natural language query using Claude with MCP tools"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    try:
        # Use specified servers or all connected servers
        servers_to_use = request.server_names or manager.get_connected_servers()

        if not servers_to_use:
            raise HTTPException(
                status_code=400,
                detail="No servers specified and no servers are connected"
            )

        response = await manager.process_query_with_claude(
            request.query,
            servers_to_use,
            request.enable_chaining
        )

        system_stats["total_queries"] += 1
        return QueryResponse(
            response=response,
            servers_used=servers_to_use
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ENHANCED ENDPOINTS
# =============================================================================

# Batch Operations
@app.post("/batch/tools/execute", response_model=BatchToolExecutionResponse)
async def batch_execute_tools(request: BatchToolExecutionRequest):
    """Execute multiple tools in batch (parallel or sequential)"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    start_time_batch = time.time()
    results = []

    if request.parallel:
        # Execute tools in parallel
        tasks = []
        for execution in request.executions:
            task = execute_single_tool(execution)
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to error responses
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(ToolExecutionResponse(
                    server_name=request.executions[i].server_name,
                    tool_name=request.executions[i].tool_name,
                    success=False,
                    error=str(result)
                ))
            else:
                processed_results.append(result)
        results = processed_results
    else:
        # Execute tools sequentially
        for execution in request.executions:
            try:
                result = await execute_single_tool(execution)
                results.append(result)
            except Exception as e:
                results.append(ToolExecutionResponse(
                    server_name=execution.server_name,
                    tool_name=execution.tool_name,
                    success=False,
                    error=str(e)
                ))

    execution_time = time.time() - start_time_batch
    success_count = sum(1 for r in results if r.success)
    failure_count = len(results) - success_count

    system_stats["total_tool_calls"] += len(results)

    return BatchToolExecutionResponse(
        results=results,
        execution_time=execution_time,
        total_count=len(results),
        success_count=success_count,
        failure_count=failure_count
    )


async def execute_single_tool(execution: ToolExecutionRequest) -> ToolExecutionResponse:
    """Helper function to execute a single tool"""
    import logging
    batch_logger = logging.getLogger("batch_tool_calls")

    if manager.server_config.log_tool_calls:
        batch_logger.info(f"BATCH_TOOL_EXECUTE - Server: {execution.server_name} | Tool: {execution.tool_name}")

    try:
        result = await manager.execute_tool(
            execution.server_name,
            execution.tool_name,
            execution.arguments
        )
        return ToolExecutionResponse(
            server_name=execution.server_name,
            tool_name=execution.tool_name,
            success=True,
            result=result.content if hasattr(result, 'content') else result
        )
    except Exception as e:
        if manager.server_config.log_tool_calls:
            batch_logger.error(
                f"BATCH_TOOL_ERROR - Server: {execution.server_name} | Tool: {execution.tool_name} | Error: {str(e)}")

        return ToolExecutionResponse(
            server_name=execution.server_name,
            tool_name=execution.tool_name,
            success=False,
            error=str(e)
        )


@app.post("/batch/servers/connect")
async def batch_connect_servers(request: BatchServerConnectionRequest):
    """Connect to multiple servers in batch"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    results = {}
    start_time_batch = time.time()

    if request.parallel:
        # Connect in parallel
        tasks = []
        for server_name in request.server_names:
            task = connect_single_server(server_name)
            tasks.append(task)

        parallel_results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(parallel_results):
            server_name = request.server_names[i]
            if isinstance(result, Exception):
                results[server_name] = {"success": False, "error": str(result)}
            else:
                results[server_name] = result
    else:
        # Connect sequentially
        for server_name in request.server_names:
            try:
                result = await connect_single_server(server_name)
                results[server_name] = result
            except Exception as e:
                results[server_name] = {"success": False, "error": str(e)}

    execution_time = time.time() - start_time_batch
    success_count = sum(1 for r in results.values() if r.get("success", False))

    return {
        "results": results,
        "execution_time": execution_time,
        "total_count": len(request.server_names),
        "success_count": success_count,
        "failure_count": len(request.server_names) - success_count
    }


async def connect_single_server(server_name: str) -> Dict[str, Any]:
    """Helper function to connect to a single server"""
    try:
        success = await manager.connect_to_server(server_name)
        return {
            "success": success,
            "message": f"Successfully connected to {server_name}" if success else f"Failed to connect to {server_name}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# Server Configuration Management
@app.post("/config/servers/add")
async def add_server_config(request: ServerConfigRequest):
    """Add a new server configuration"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    # Add to manager's configuration
    manager.server_config.mcp_servers[request.name] = request.config

    return {
        "success": True,
        "message": f"Server configuration '{request.name}' added successfully",
        "server_name": request.name
    }


@app.put("/config/servers/{server_name}")
async def update_server_config(server_name: str, config: MCPServerConfig):
    """Update an existing server configuration"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    if server_name not in manager.server_config.mcp_servers:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")

    # If server is connected, disconnect first
    if server_name in manager.connections:
        await manager.disconnect_from_server(server_name)

    manager.server_config.mcp_servers[server_name] = config

    return {
        "success": True,
        "message": f"Server configuration '{server_name}' updated successfully",
        "server_name": server_name
    }


@app.delete("/config/servers/{server_name}")
async def remove_server_config(server_name: str):
    """Remove a server configuration"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    if server_name not in manager.server_config.mcp_servers:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")

    # Disconnect if connected
    if server_name in manager.connections:
        await manager.disconnect_from_server(server_name)

    del manager.server_config.mcp_servers[server_name]

    return {
        "success": True,
        "message": f"Server configuration '{server_name}' removed successfully",
        "server_name": server_name
    }


# Monitoring and Metrics
@app.get("/metrics/system", response_model=SystemMetrics)
async def get_system_metrics():
    """Get comprehensive system metrics"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    uptime = time.time() - start_time
    connected_servers = len(manager.get_connected_servers())
    total_servers = len(manager.get_available_servers())

    try:
        import psutil
        memory_info = {
            "used": psutil.virtual_memory().used,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent
        }
    except ImportError:
        memory_info = None

    return SystemMetrics(
        uptime=uptime,
        total_servers=total_servers,
        connected_servers=connected_servers,
        total_queries=system_stats["total_queries"],
        total_tool_calls=system_stats["total_tool_calls"],
        active_connections=len(system_stats["websocket_connections"]),
        memory_usage=memory_info
    )


@app.get("/metrics/servers", response_model=List[ServerMetrics])
async def get_server_metrics():
    """Get metrics for all servers"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    metrics = []
    for server_name in manager.get_available_servers():
        connected = server_name in manager.connections

        # Get or create metrics for this server
        if server_name not in server_metrics:
            server_metrics[server_name] = ServerMetrics(
                server_name=server_name,
                connected=connected,
                tools_available=0 if not connected else len(manager.connections[server_name].tools)
            )

        metric = server_metrics[server_name]
        metric.connected = connected

        if connected:
            connection = manager.connections[server_name]
            metric.connection_duration = (datetime.now() - connection.connected_at).total_seconds()
            metric.tools_available = len(connection.tools)

        metrics.append(metric)

    return metrics


@app.get("/metrics/servers/{server_name}", response_model=ServerMetrics)
async def get_server_metric(server_name: str):
    """Get metrics for a specific server"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    if server_name not in manager.get_available_servers():
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")

    connected = server_name in manager.connections

    if server_name not in server_metrics:
        server_metrics[server_name] = ServerMetrics(
            server_name=server_name,
            connected=connected,
            tools_available=0 if not connected else len(manager.connections[server_name].tools)
        )

    metric = server_metrics[server_name]
    metric.connected = connected

    if connected:
        connection = manager.connections[server_name]
        metric.connection_duration = (datetime.now() - connection.connected_at).total_seconds()
        metric.tools_available = len(connection.tools)

    return metric


# Conversation Management
@app.post("/conversations/query", response_model=ConversationResponse)
async def query_with_conversation(request: ConversationRequest):
    """Process query with conversation history management using MongoDB"""
    if not manager:
        raise HTTPException(status_code=503, detail="Manager not initialized")

    try:
        # Get or create conversation for the user
        if request.conversation_id:
            # If conversation_id is provided, get existing conversation
            conversation = await get_conversation(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation.user_id != request.user_id:
                raise HTTPException(status_code=403, detail="Access denied to this conversation")
        else:
            # Create a new conversation for the user
            conversation = await get_or_create_conversation_for_user(request.user_id)

        # Create user message
        user_message = DbMessage(
            role="user",
            content=request.query
        )

        # Add user message to conversation
        await add_message_to_conversation(conversation.id, user_message)

        # Process query
        servers_to_use = request.server_names or manager.get_connected_servers()
        if not servers_to_use:
            raise HTTPException(status_code=400, detail="No servers available")

        # Always build context from conversation history
        if len(conversation.messages) > 0:
            # Build context from conversation history
            context = "Previous conversation:\n"
            for msg in conversation.messages:
                context += f"{msg.role}: {msg.content}\n"
            full_query = f"{context}\nCurrent question: {request.query}"
        else:
            full_query = request.query

        response = await manager.process_query_with_claude(full_query, servers_to_use, request.enable_chaining)

        # Create assistant message
        assistant_message = DbMessage(
            role="assistant",
            content=response,
            servers_used=servers_to_use
        )

        # Add assistant response to conversation
        await add_message_to_conversation(conversation.id, assistant_message)

        # Create response message in the original ConversationMessage format
        response_message = ConversationMessage(
            id=assistant_message.id,
            timestamp=assistant_message.timestamp,
            role=assistant_message.role,
            content=assistant_message.content,
            servers_used=assistant_message.servers_used,
            tools_called=assistant_message.tools_called
        )

        system_stats["total_queries"] += 1

        return ConversationResponse(
            conversation_id=str(conversation.id),
            message=response_message,
            response=response,
            servers_used=servers_to_use
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/users/{user_id}/conversations", response_model=List[DbConversation])
async def list_conversations_for_user(user_id: str):
    """List all conversations for a user"""
    return await get_conversations_for_user(user_id)


@app.get("/conversations/{conversation_id}", response_model=DbConversation)
async def get_conversation_history(conversation_id: str):
    """Get the history of a specific conversation"""
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation_history(conversation_id: str):
    """Delete a conversation"""
    success = await delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return None


# File Operations
@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file for processing"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Create temporary file
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"mcp_upload_{uuid.uuid4()}_{file.filename}")

    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return {
            "success": True,
            "filename": file.filename,
            "file_path": file_path,
            "size": len(content),
            "content_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.get("/files/download/{file_id}")
async def download_file(file_id: str):
    """Download a file by ID (placeholder - would need file storage system)"""
    # This is a placeholder - in a real implementation, you'd have a file storage system
    raise HTTPException(status_code=501, detail="File download not implemented - requires file storage system")


# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    system_stats["websocket_connections"].add(connection_id)

    try:
        # Send initial status
        await websocket.send_json({
            "type": "connection",
            "data": {
                "status": "connected",
                "connection_id": connection_id,
                "available_servers": manager.get_available_servers() if manager else [],
                "connected_servers": manager.get_connected_servers() if manager else []
            }
        })

        while True:
            # Wait for messages from client
            try:
                data = await websocket.receive_json()
                message_type = data.get("type")

                if message_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})

                elif message_type == "get_status":
                    if manager:
                        await websocket.send_json({
                            "type": "status",
                            "data": {
                                "connected_servers": manager.get_connected_servers(),
                                "available_servers": manager.get_available_servers(),
                                "total_queries": system_stats["total_queries"],
                                "total_tool_calls": system_stats["total_tool_calls"]
                            }
                        })

                elif message_type == "query":
                    if manager:
                        query = data.get("query", "")
                        servers = data.get("servers", manager.get_connected_servers())
                        enable_chaining = data.get("enable_chaining", True)

                        # Send query received acknowledgment
                        await websocket.send_json({
                            "type": "query_received",
                            "data": {"query": query, "enable_chaining": enable_chaining}
                        })

                        try:
                            response = await manager.process_query_with_claude(query, servers, enable_chaining)
                            await websocket.send_json({
                                "type": "query_response",
                                "data": {
                                    "query": query,
                                    "response": response,
                                    "servers_used": servers,
                                    "chaining_enabled": enable_chaining
                                }
                            })
                            system_stats["total_queries"] += 1
                        except Exception as e:
                            await websocket.send_json({
                                "type": "error",
                                "data": {"message": str(e)}
                            })

            except WebSocketDisconnect:
                break
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": f"Error processing message: {str(e)}"}
                })

    except WebSocketDisconnect:
        pass
    finally:
        system_stats["websocket_connections"].discard(connection_id)


# Utility endpoints
@app.get("/status/detailed")
async def get_detailed_status():
    """Get detailed system status"""
    if not manager:
        return {"status": "Manager not initialized"}

    return {
        "status": "operational",
        "uptime": time.time() - start_time,
        "manager_initialized": True,
        "servers": {
            "total": len(manager.get_available_servers()),
            "connected": len(manager.get_connected_servers()),
            "available": manager.get_available_servers(),
            "connected_list": manager.get_connected_servers()
        },
        "statistics": {
            "total_queries": system_stats["total_queries"],
            "total_tool_calls": system_stats["total_tool_calls"],
            "active_websockets": len(system_stats["websocket_connections"]),
            "conversations": len(conversations)
        },
        "tools": manager.get_all_tools()
    }


@app.post("/admin/reset")
async def reset_system():
    """Reset system state (conversations, metrics, etc.)"""
    global conversations, server_metrics, system_stats

    conversations.clear()
    server_metrics.clear()
    system_stats.update({
        "total_queries": 0,
        "total_tool_calls": 0,
        "websocket_connections": set()
    })

    return {
        "success": True,
        "message": "System state reset successfully",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/customer-support-agent")
async def customer_support_agent():
    try:
        result = await run_customer_agent(manager)
        return JSONResponse(content=result)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(500, f"Agent failed: {e}")

@app.get("/vfl-project-agent")
async def vfl_project_agent():
    """VFL Project Agent that analyzes Jira and Confluence data for VFL project"""
    try:
        result = await run_vfl_project_agent(manager)
        return JSONResponse(content=result)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(500, f"VFL Project Agent failed: {e}")

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "type": type(exc).__name__
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )