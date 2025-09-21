import asyncio
import json
from typing import Optional, Any
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()  # load environment variables from .env

class ConsoleFormatter:
    """Utility class for colored and formatted console output"""
    
    # ANSI color codes
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    GRAY = '\033[90m'
    
    @staticmethod
    def tool_call(tool_name: str, args: dict) -> str:
        """Format tool call information"""
        formatted_args = json.dumps(args, indent=2) if args else "{}"
        return (f"{ConsoleFormatter.CYAN}🔧 Calling Tool: {ConsoleFormatter.BOLD}{tool_name}{ConsoleFormatter.RESET}\n"
               f"{ConsoleFormatter.GRAY}Arguments:{ConsoleFormatter.RESET}\n{formatted_args}")
    
    @staticmethod
    def tool_response(content: Any) -> str:
        """Format tool response"""
        if isinstance(content, (dict, list)):
            formatted_content = json.dumps(content, indent=2, ensure_ascii=False)
        else:
            formatted_content = str(content)
        
        return (f"{ConsoleFormatter.GREEN}✅ Tool Response:{ConsoleFormatter.RESET}\n"
               f"{ConsoleFormatter.GRAY}{formatted_content}{ConsoleFormatter.RESET}")
    
    @staticmethod
    def error(message: str) -> str:
        """Format error messages"""
        return f"{ConsoleFormatter.RED}❌ Error: {message}{ConsoleFormatter.RESET}"
    
    @staticmethod
    def info(message: str) -> str:
        """Format info messages"""
        return f"{ConsoleFormatter.BLUE}ℹ️  {message}{ConsoleFormatter.RESET}"
    
    @staticmethod
    def separator() -> str:
        """Visual separator for tool calls"""
        return f"{ConsoleFormatter.GRAY}{'─' * 60}{ConsoleFormatter.RESET}"

class MCPClient:
    def __init__(self, verbose: bool = True):
        # Initialize session and client objects
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.anthropic = Anthropic()
        self.verbose = verbose
        self.formatter = ConsoleFormatter()

    async def connect_to_server(self):
        """Connect to an MCP server running inside Docker"""

        server_params = StdioServerParameters(
            command="docker",
            args=[
                "run",
                "-i",   # keep stdin open
                "--rm", # auto-remove after exit
                "-e", "CONFLUENCE_URL",
                "-e", "CONFLUENCE_USERNAME",
                "-e", "CONFLUENCE_API_TOKEN",
                "-e", "JIRA_URL",
                "-e", "JIRA_USERNAME",
                "-e", "JIRA_API_TOKEN",
                "ghcr.io/sooperset/mcp-atlassian:latest",
            ],
            env={
                "CONFLUENCE_URL": "https://spursol.atlassian.net/",
                "CONFLUENCE_USERNAME": "ahmed.shaikh@spursol.com",
                "CONFLUENCE_API_TOKEN": "ATATT3xFfGF0kXRtUCjsB3tRhkTcMy-4kxjEKSKkRQasZeEPBnSuJEv4vQFyh-H9aBqcHRnBwozhRe-hOaynNr2fhCMWBqgt7g1xpI7xsqkVrqVBgFpQ86z2ChLAdwW-oeJQ8B_ypla0dHpgb21GJKZcAE_dRLiKT1Gb_jXUzYls8L4imJZ2w-Y=5953D8C2",
                "JIRA_URL": "https://spursol.atlassian.net/",
                "JIRA_USERNAME": "ahmed.shaikh@spursol.com",
                "JIRA_API_TOKEN": "ATATT3xFfGF0kXRtUCjsB3tRhkTcMy-4kxjEKSKkRQasZeEPBnSuJEv4vQFyh-H9aBqcHRnBwozhRe-hOaynNr2fhCMWBqgt7g1xpI7xsqkVrqVBgFpQ86z2ChLAdwW-oeJQ8B_ypla0dHpgb21GJKZcAE_dRLiKT1Gb_jXUzYls8L4imJZ2w-Y=5953D8C2",
            },
        )

        # Create stdio transport via Docker
        stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
        self.stdio, self.write = stdio_transport

        # Open MCP session
        self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
        await self.session.initialize()

        # List available tools
        response = await self.session.list_tools()
        tools = response.tools
        print("\nConnected to server with tools:", [tool.name for tool in tools])


    async def process_query(self, query: str) -> str:
        """Process a query using Claude and available tools"""
        messages = [
            {
                "role": "user",
                "content": query
            }
        ]

        response = await self.session.list_tools()
        available_tools = [{ 
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.inputSchema
        } for tool in response.tools]

        # Initial Claude API call
        response = self.anthropic.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=messages,
            tools=available_tools
        )

        # Process response and handle tool calls
        final_text = []
        tool_call_count = 0

        for content in response.content:
            if content.type == 'text':
                final_text.append(content.text)
            elif content.type == 'tool_use':
                tool_call_count += 1
                tool_name = content.name
                tool_args = content.input
                
                if self.verbose:
                    print(f"\n{self.formatter.separator()}")
                    print(self.formatter.tool_call(tool_name, tool_args))
                    print(f"{self.formatter.info(f'Executing tool call #{tool_call_count}...')}")
                
                # Execute tool call
                try:
                    result = await self.session.call_tool(tool_name, tool_args)
                    
                    if self.verbose:
                        # Display tool response details
                        print(self.formatter.tool_response(result.content))
                        
                        # Show additional result metadata if available
                        if hasattr(result, 'isError') and result.isError:
                            print(self.formatter.error("Tool execution failed"))
                        else:
                            print(self.formatter.info("Tool executed successfully"))
                        
                        print(f"{self.formatter.separator()}\n")
                    
                    # Add a simple summary for the final output
                    final_text.append(f"[Tool {tool_name} executed successfully]")

                    # Continue conversation with tool results
                    if hasattr(content, 'text') and content.text:
                        messages.append({
                          "role": "assistant",
                          "content": content.text
                        })
                    
                    # Format the tool result content for Claude
                    if isinstance(result.content, list):
                        content_str = "\n".join([
                            item.text if hasattr(item, 'text') else str(item) 
                            for item in result.content
                        ])
                    else:
                        content_str = str(result.content)
                    
                    messages.append({
                        "role": "user", 
                        "content": content_str
                    })

                    # Get next response from Claude
                    response = self.anthropic.messages.create(
                        model="claude-3-5-sonnet-20241022",
                        max_tokens=1000,
                        messages=messages,
                    )

                    final_text.append(response.content[0].text)
                    
                except Exception as e:
                    error_msg = f"Tool execution failed: {str(e)}"
                    if self.verbose:
                        print(self.formatter.error(error_msg))
                        print(f"{self.formatter.separator()}\n")
                    final_text.append(f"[Error: {error_msg}]")

        return "\n".join(final_text)

    async def chat_loop(self):
        """Run an interactive chat loop"""
        print("\n" + self.formatter.info("MCP Client Started!"))
        print("Available commands:")
        print("  - Type your queries to interact with the MCP server")
        print("  - Type '/verbose' to toggle verbose mode (currently: {})".format("ON" if self.verbose else "OFF"))
        print("  - Type '/tools' to list available tools")
        print("  - Type 'quit' to exit")
        
        while True:
            try:
                query = input(f"\n{ConsoleFormatter.BOLD}Query:{ConsoleFormatter.RESET} ").strip()
                
                if query.lower() == 'quit':
                    break
                elif query.lower() == '/verbose':
                    self.verbose = not self.verbose
                    print(self.formatter.info(f"Verbose mode {'enabled' if self.verbose else 'disabled'}"))
                    continue
                elif query.lower() == '/tools':
                    await self.list_available_tools()
                    continue
                    
                if not query:
                    continue
                    
                response = await self.process_query(query)
                print(f"\n{ConsoleFormatter.BOLD}Response:{ConsoleFormatter.RESET}")
                print(response)
                    
            except Exception as e:
                print(self.formatter.error(str(e)))

    async def list_available_tools(self):
        """List all available tools with their descriptions"""
        try:
            response = await self.session.list_tools()
            tools = response.tools
            
            print(f"\n{self.formatter.info('Available Tools:')}")
            print(f"{self.formatter.separator()}")
            
            for i, tool in enumerate(tools, 1):
                print(f"{ConsoleFormatter.CYAN}{i}. {tool.name}{ConsoleFormatter.RESET}")
                if hasattr(tool, 'description') and tool.description:
                    print(f"   {ConsoleFormatter.GRAY}{tool.description}{ConsoleFormatter.RESET}")
                print()
                
            print(f"{self.formatter.separator()}")
            print(f"Total: {len(tools)} tools available")
            
        except Exception as e:
            print(self.formatter.error(f"Failed to list tools: {str(e)}"))
    
    async def cleanup(self):
        """Clean up resources"""
        await self.exit_stack.aclose()

async def main():
    import sys
    
    # Check for verbose flag
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    
    if '--help' in sys.argv or '-h' in sys.argv:
        print("MCP Client - Tool Call Viewer")
        print("Usage: python client.py [options]")
        print("Options:")
        print("  -v, --verbose    Enable verbose tool call output")
        print("  -h, --help       Show this help message")
        return
    
    client = MCPClient(verbose=verbose)
    try:
        await client.connect_to_server()
        await client.chat_loop()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())