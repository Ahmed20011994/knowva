import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any
from contextlib import AsyncExitStack
from dataclasses import dataclass
from datetime import datetime

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
from anthropic import Anthropic

from config import MCPServerConfig, ServerConfig


@dataclass
class MCPConnection:
    """Represents an active MCP connection"""
    config: MCPServerConfig
    session: ClientSession
    stdio: Any
    write: Any
    exit_stack: AsyncExitStack
    connected_at: datetime
    tools: List[Dict[str, Any]]
    connection_type: str = "stdio"  # "stdio" or "sse"
    url: Optional[str] = None  # For SSE connections


class MCPConnectionManager:
    """Manages multiple MCP server connections"""

    def __init__(self, server_config: ServerConfig):
        self.server_config = server_config
        self.connections: Dict[str, MCPConnection] = {}
        self.anthropic = Anthropic(api_key=server_config.anthropic_api_key)
        self.logger = logging.getLogger("mcp_manager")
        self.tool_logger = logging.getLogger("tool_calls")

    async def connect_to_server(self, server_name: str) -> bool:
        """Connect to a specific MCP server"""
        if server_name in self.connections:
            return True  # Already connected

        if server_name not in self.server_config.mcp_servers:
            raise ValueError(f"Server '{server_name}' not found in configuration")

        config = self.server_config.mcp_servers[server_name]
        if not config.enabled:
            raise ValueError(f"Server '{server_name}' is disabled")

        try:
            exit_stack = AsyncExitStack()

            # Create server parameters
            server_params = StdioServerParameters(
                command=config.command,
                args=config.args,
                env=config.env
            )

            # Create stdio transport
            stdio_transport = await exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            stdio, write = stdio_transport

            # Open MCP session
            session = await exit_stack.enter_async_context(
                ClientSession(stdio, write)
            )
            await session.initialize()

            # Get available tools
            response = await session.list_tools()
            tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in response.tools
            ]

            # Store connection
            connection = MCPConnection(
                config=config,
                session=session,
                stdio=stdio,
                write=write,
                exit_stack=exit_stack,
                connected_at=datetime.now(),
                tools=tools,
                connection_type="stdio"
            )

            self.connections[server_name] = connection
            return True

        except Exception as e:
            # Clean up on failure
            try:
                await exit_stack.aclose()
            except:
                pass
            raise Exception(f"Failed to connect to server '{server_name}': {str(e)}")

    async def connect_to_sse_server(self, server_name: str, server_url: str) -> bool:
        """Connect to a specific MCP server using SSE transport"""
        if server_name in self.connections:
            return True  # Already connected

        try:
            exit_stack = AsyncExitStack()

            # Validate URL format
            if not server_url.startswith(('http://', 'https://')):
                raise ValueError(f"Invalid URL format: {server_url}. URL must start with http:// or https://")

            self.logger.info(f"Attempting to connect to SSE server at {server_url}")

            # Create SSE transport with proper parameters
            sse_transport = await exit_stack.enter_async_context(
                sse_client(
                    url=server_url,
                    timeout=10,  # HTTP timeout
                    sse_read_timeout=300  # SSE read timeout
                )
            )
            stdio, write = sse_transport

            self.logger.info(f"SSE transport created successfully for {server_url}")

            # Open MCP session
            session = await exit_stack.enter_async_context(
                ClientSession(stdio, write)
            )

            self.logger.info(f"MCP session created, initializing for {server_url}")

            # Add timeout for initialization
            try:
                await asyncio.wait_for(session.initialize(), timeout=30.0)
                self.logger.info(f"MCP session initialized successfully for {server_url}")
            except asyncio.TimeoutError:
                raise Exception(f"Session initialization timed out after 30 seconds. The server at {server_url} may not be a valid MCP server.")
            except Exception as init_error:
                raise Exception(f"Session initialization failed: {str(init_error)}. The server at {server_url} may not implement the MCP protocol correctly.")

            # Get available tools
            response = await session.list_tools()
            tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in response.tools
            ]

            # Create a minimal config for SSE connections
            config = MCPServerConfig(
                name=server_name,
                description=f"SSE server at {server_url}",
                command="",
                args=[],
                enabled=True
            )

            # Store connection
            connection = MCPConnection(
                config=config,
                session=session,
                stdio=stdio,
                write=write,
                exit_stack=exit_stack,
                connected_at=datetime.now(),
                tools=tools,
                connection_type="sse",
                url=server_url
            )

            self.connections[server_name] = connection
            self.logger.info(f"Successfully connected to SSE server '{server_name}' at {server_url}")
            return True

        except Exception as e:
            # Clean up on failure
            try:
                await exit_stack.aclose()
            except:
                pass

            # Log detailed error information
            import traceback
            error_details = traceback.format_exc()
            self.logger.error(f"Failed to connect to SSE server '{server_name}' at {server_url}")
            self.logger.error(f"Error type: {type(e).__name__}")
            self.logger.error(f"Error message: {str(e)}")
            self.logger.error(f"Full traceback:\n{error_details}")

            # Provide more specific error message
            if "ConnectError" in str(e) or "connection attempts failed" in str(e).lower():
                if "localhost" in server_url:
                    raise Exception(f"Failed to connect to SSE server '{server_name}' at {server_url}: Connection failed. If running in Docker, use the container service name instead of 'localhost' (e.g., 'http://atlassian-mcp:9000/sse' instead of 'http://localhost:9000/sse').")
                else:
                    raise Exception(f"Failed to connect to SSE server '{server_name}' at {server_url}: Connection failed - please verify the server is running and reachable at this URL.")
            elif "TaskGroup" in str(e):
                raise Exception(f"Failed to connect to SSE server '{server_name}' at {server_url}: Connection failed - please verify the server is running and the URL is correct. Original error: {str(e)}")
            else:
                raise Exception(f"Failed to connect to SSE server '{server_name}' at {server_url}: {str(e)}")

    async def disconnect_from_server(self, server_name: str) -> bool:
        """Disconnect from a specific MCP server"""
        if server_name not in self.connections:
            return False

        connection = self.connections[server_name]
        try:
            await connection.exit_stack.aclose()
        except Exception:
            pass  # Ignore cleanup errors

        del self.connections[server_name]
        return True

    async def disconnect_all(self):
        """Disconnect from all MCP servers"""
        for server_name in list(self.connections.keys()):
            await self.disconnect_from_server(server_name)

    def get_connected_servers(self) -> List[str]:
        """Get list of connected server names"""
        return list(self.connections.keys())

    def get_available_servers(self) -> List[str]:
        """Get list of all available server names from config"""
        return list(self.server_config.mcp_servers.keys())

    def get_server_info(self, server_name: str) -> Dict[str, Any]:
        """Get information about a server"""
        if server_name not in self.server_config.mcp_servers:
            raise ValueError(f"Server '{server_name}' not found")

        config = self.server_config.mcp_servers[server_name]
        connection = self.connections.get(server_name)

        info = {
            "name": config.name,
            "description": config.description,
            "enabled": config.enabled,
            "connected": connection is not None
        }

        if connection:
            info.update({
                "connected_at": connection.connected_at.isoformat(),
                "tools": connection.tools,
                "tool_count": len(connection.tools)
            })

        return info

    def get_all_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all tools from all connected servers"""
        all_tools = {}
        for server_name, connection in self.connections.items():
            all_tools[server_name] = connection.tools
        return all_tools

    async def execute_tool(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool on a specific server"""
        start_time = time.time()
        tool_call_id = f"{server_name}:{tool_name}:{int(start_time * 1000)}"

        if self.server_config.log_tool_calls:
            self.tool_logger.info(
                f"TOOL_CALL_START - ID: {tool_call_id} | Server: {server_name} | Tool: {tool_name} | Args: {json.dumps(arguments, default=str)}"
            )

        if server_name not in self.connections:
            error_msg = f"Not connected to server '{server_name}'"
            if self.server_config.log_tool_calls:
                self.tool_logger.error(f"TOOL_CALL_ERROR - ID: {tool_call_id} | Error: {error_msg}")
            raise ValueError(error_msg)

        connection = self.connections[server_name]

        try:
            result = await connection.session.call_tool(tool_name, arguments)
            execution_time = time.time() - start_time

            if self.server_config.log_tool_calls:
                result_summary = str(result.content)[:200] + "..." if len(str(result.content)) > 200 else str(result.content)
                self.tool_logger.info(
                    f"TOOL_CALL_SUCCESS - ID: {tool_call_id} | Duration: {execution_time:.3f}s | Result: {result_summary}"
                )

            return result
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"Tool execution failed on server '{server_name}': {str(e)}"

            if self.server_config.log_tool_calls:
                self.tool_logger.error(
                    f"TOOL_CALL_FAILURE - ID: {tool_call_id} | Duration: {execution_time:.3f}s | Error: {str(e)}"
                )

            raise Exception(error_msg)

    async def process_query_with_claude(self, query: str, server_names: Optional[List[str]] = None, enable_chaining: bool = True) -> str:
        """Process a query using Claude with tools from specified servers"""
        query_start_time = time.time()
        query_id = f"query_{int(query_start_time * 1000)}"

        if self.server_config.log_tool_calls:
            self.tool_logger.info(
                f"QUERY_START - ID: {query_id} | Query: {query[:100]}{'...' if len(query) > 100 else ''} | Servers: {server_names} | Chaining: {enable_chaining}"
            )

        if server_names is None:
            server_names = self.get_connected_servers()

        if not server_names:
            return "No MCP servers are connected. Please connect to at least one server first."

        # Collect tools from specified servers
        available_tools = []
        server_tool_mapping = {}  # Track which server each tool belongs to

        for server_name in server_names:
            if server_name in self.connections:
                connection = self.connections[server_name]
                for tool in connection.tools:
                    tool_copy = tool.copy()
                    # Keep original tool name for better Claude understanding
                    original_name = tool['name']
                    tool_copy["name"] = original_name
                    available_tools.append(tool_copy)
                    server_tool_mapping[original_name] = server_name

        if not available_tools:
            return "No tools available from the specified servers."

        if self.server_config.log_tool_calls:
            self.tool_logger.info(f"QUERY_TOOLS_AVAILABLE - ID: {query_id} | Available tools: {[t['name'] for t in available_tools]}")

        # Enhanced system prompt for chained tool calling
        chaining_guidance = """
**Tool Chaining Guidelines:**
- When you call a tool and receive results, analyze them thoroughly before deciding on the next action
- Use the information from previous tool calls to inform subsequent tool selections and parameters
- Build upon previous results to create a comprehensive understanding
- Each tool call should be purposeful and informed by previous results
- If you need to call multiple tools, do so one at a time to allow for analysis between calls"""

        system_prompt = f"""You are KnowvaAI, an intelligent assistant with access to multiple enterprise tools and data sources. Your goal is to provide comprehensive, accurate, and actionable responses by leveraging the available tools effectively.

**Core Principles:**
1. **Be Proactive**: Use multiple tools when needed to gather comprehensive information
2. **Be Thorough**: Don't stop at the first tool call - explore related data and cross-reference information
3. **Be Contextual**: Understand the business context and provide insights, not just raw data
4. **Be Actionable**: Provide clear recommendations and next steps when appropriate

**Tool Usage Guidelines:**
- Do not call a tool again if it returns an error; instead, analyze the error and adjust your approach
- Use multiple tools in sequence to build a complete picture
- When querying project management tools (Jira), also check documentation (Confluence) for context
- Cross-reference information between different sources for accuracy
- If initial results are incomplete, make additional tool calls to gather more details
- Synthesize information from multiple sources into coherent insights

{chaining_guidance if enable_chaining else "For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially."}

**Response Format:**
- Start with a clear, direct answer to the user's question
- Provide supporting details and evidence from the tools
- Include relevant context and business implications
- End with actionable recommendations or next steps when appropriate
- Cite your sources (mention which tools/systems provided the information)"""

        # Initialize conversation with system prompt
        messages = [
            {"role": "user", "content": query}
        ]

        tool_calls_made = 0
        max_iterations = 10  # Increased for chaining
        iteration = 0

        try:
            while iteration < max_iterations:
                iteration += 1

                # Make Claude API call
                response = self.anthropic.messages.create(
                    model=self.server_config.claude_model,
                    max_tokens=self.server_config.max_tokens,
                    system=system_prompt,
                    messages=messages,
                    tools=available_tools,
                    tool_choice={"type": "auto"},
                )

                # Add Claude's response to conversation
                messages.append({"role": "assistant", "content": response.content})

                # Check for tool calls in the response
                tool_calls_in_response = [content for content in response.content if content.type == 'tool_use']

                if not tool_calls_in_response:
                    # No more tool calls, return final response
                    text_content = [content.text for content in response.content if content.type == 'text']
                    final_response = "\n".join(text_content)
                    break

                if enable_chaining:
                    # Process tool calls one at a time for chaining
                    await self._process_chained_tool_calls(
                        tool_calls_in_response, messages, server_tool_mapping,
                        query_id, tool_calls_made
                    )
                    tool_calls_made += len(tool_calls_in_response)
                else:
                    # Process all tool calls in batch (legacy behavior)
                    tool_results = await self._process_batch_tool_calls(
                        tool_calls_in_response, server_tool_mapping,
                        query_id, tool_calls_made
                    )
                    tool_calls_made += len(tool_calls_in_response)

                    # Add tool results to conversation
                    if tool_results:
                        messages.append({"role": "user", "content": tool_results})
                    else:
                        # No successful tool calls, break to avoid infinite loop
                        text_content = [content.text for content in response.content if content.type == 'text']
                        final_response = "\n".join(text_content)
                        break

            # If we hit max iterations, get final response
            if iteration >= max_iterations:
                # Make one final call without tools to get a summary
                final_response_call = self.anthropic.messages.create(
                    model=self.server_config.claude_model,
                    max_tokens=self.server_config.max_tokens,
                    system=system_prompt + "\n\nPlease provide a comprehensive summary based on all the information gathered.",
                    messages=messages
                )
                final_response = final_response_call.content[0].text

            query_duration = time.time() - query_start_time
            if self.server_config.log_tool_calls:
                self.tool_logger.info(
                    f"QUERY_COMPLETE - ID: {query_id} | Duration: {query_duration:.3f}s | Tool calls made: {tool_calls_made} | Iterations: {iteration}"
                )

            return final_response

        except Exception as e:
            query_duration = time.time() - query_start_time
            error_msg = f"Error processing query: {str(e)}"
            if self.server_config.log_tool_calls:
                self.tool_logger.error(f"QUERY_FAILURE - ID: {query_id} | Duration: {query_duration:.3f}s | Error: {str(e)}")
            return error_msg

    async def _process_chained_tool_calls(self, tool_calls_in_response, messages, server_tool_mapping, query_id, tool_calls_made_base):
        """Process tool calls one at a time with LLM feedback between each call"""
        for i, tool_call in enumerate(tool_calls_in_response):
            tool_calls_made = tool_calls_made_base + i + 1
            tool_name = tool_call.name
            tool_args = tool_call.input
            tool_call_id = tool_call.id

            if self.server_config.log_tool_calls:
                self.tool_logger.info(
                    f"CLAUDE_TOOL_REQUEST_CHAIN - Query ID: {query_id} | Tool: {tool_name} | Call #{tool_calls_made} | Chain Position: {i+1}/{len(tool_calls_in_response)}"
                )

            # Find the server for this tool
            server_name = server_tool_mapping.get(tool_name)

            if server_name and server_name in self.connections:
                try:
                    result = await self.execute_tool(server_name, tool_name, tool_args)

                    # Format the tool result content for Claude
                    if isinstance(result.content, list):
                        content_str = "\n".join([
                            item.text if hasattr(item, 'text') else str(item)
                            for item in result.content
                        ])
                    else:
                        content_str = str(result.content)

                    tool_result = {
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": content_str
                    }

                    # Add individual tool result to conversation immediately
                    messages.append({"role": "user", "content": [tool_result]})

                    if self.server_config.log_tool_calls:
                        result_summary = content_str[:200] + "..." if len(content_str) > 200 else content_str
                        self.tool_logger.info(
                            f"TOOL_CHAIN_RESULT - Query ID: {query_id} | Tool: {tool_name} | Result: {result_summary}"
                        )

                    # If there are more tool calls in this response, get Claude's intermediate analysis
                    if i < len(tool_calls_in_response) - 1:
                        # Ask Claude to analyze the result and potentially adjust the next tool call
                        intermediate_response = self.anthropic.messages.create(
                            model=self.server_config.claude_model,
                            max_tokens=self.server_config.max_tokens,
                            system="Based on the tool result you just received, analyze the information and decide if you need to modify your approach for the remaining tool calls. You may continue with the next planned tool call or choose a different tool based on what you learned.",
                            messages=messages,
                            tools=[],  # No tools for intermediate analysis
                        )

                        # Add Claude's intermediate analysis to conversation
                        messages.append({"role": "assistant", "content": intermediate_response.content})

                        if self.server_config.log_tool_calls:
                            analysis_text = [content.text for content in intermediate_response.content if content.type == 'text']
                            analysis_summary = "\n".join(analysis_text)[:200] + "..." if len("\n".join(analysis_text)) > 200 else "\n".join(analysis_text)
                            self.tool_logger.info(
                                f"TOOL_CHAIN_ANALYSIS - Query ID: {query_id} | Analysis: {analysis_summary}"
                            )

                except Exception as e:
                    error_msg = f"Tool execution failed: {str(e)}"
                    error_result = {
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": f"Error: {error_msg}",
                        "is_error": True
                    }
                    messages.append({"role": "user", "content": [error_result]})

                    if self.server_config.log_tool_calls:
                        self.tool_logger.error(f"QUERY_TOOL_ERROR_CHAIN - Query ID: {query_id} | Tool: {tool_name} | Error: {str(e)}")
            else:
                error_msg = f"Server '{server_name}' not connected or tool not found"
                error_result = {
                    "type": "tool_result",
                    "tool_use_id": tool_call_id,
                    "content": f"Error: {error_msg}",
                    "is_error": True
                }
                messages.append({"role": "user", "content": [error_result]})

                if self.server_config.log_tool_calls:
                    self.tool_logger.error(f"QUERY_SERVER_ERROR_CHAIN - Query ID: {query_id} | Server: {server_name} | Error: {error_msg}")

    async def _process_batch_tool_calls(self, tool_calls_in_response, server_tool_mapping, query_id, tool_calls_made_base):
        """Process all tool calls in a batch (original behavior)"""
        tool_results = []
        for i, tool_call in enumerate(tool_calls_in_response):
            tool_calls_made = tool_calls_made_base + i + 1
            tool_name = tool_call.name
            tool_args = tool_call.input
            tool_call_id = tool_call.id

            if self.server_config.log_tool_calls:
                self.tool_logger.info(
                    f"CLAUDE_TOOL_REQUEST_BATCH - Query ID: {query_id} | Tool: {tool_name} | Call #{tool_calls_made}"
                )

            # Find the server for this tool
            server_name = server_tool_mapping.get(tool_name)

            if server_name and server_name in self.connections:
                try:
                    result = await self.execute_tool(server_name, tool_name, tool_args)

                    # Format the tool result content for Claude
                    if isinstance(result.content, list):
                        content_str = "\n".join([
                            item.text if hasattr(item, 'text') else str(item)
                            for item in result.content
                        ])
                    else:
                        content_str = str(result.content)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": content_str
                    })

                except Exception as e:
                    error_msg = f"Tool execution failed: {str(e)}"
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": f"Error: {error_msg}",
                        "is_error": True
                    })
                    if self.server_config.log_tool_calls:
                        self.tool_logger.error(f"QUERY_TOOL_ERROR_BATCH - Query ID: {query_id} | Tool: {tool_name} | Error: {str(e)}")
            else:
                error_msg = f"Server '{server_name}' not connected or tool not found"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call_id,
                    "content": f"Error: {error_msg}",
                    "is_error": True
                })
                if self.server_config.log_tool_calls:
                    self.tool_logger.error(f"QUERY_SERVER_ERROR_BATCH - Query ID: {query_id} | Server: {server_name} | Error: {error_msg}")

        return tool_results