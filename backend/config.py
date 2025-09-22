from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import logging

load_dotenv()

class MCPServerConfig(BaseModel):
    """Configuration for a single MCP server"""
    name: str = Field(..., description="Unique name for the MCP server")
    description: str = Field("", description="Description of the MCP server")
    command: str = Field(..., description="Command to run the MCP server")
    args: List[str] = Field(default_factory=list, description="Arguments for the command")
    env: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    enabled: bool = Field(True, description="Whether the server is enabled")

class ServerConfig(BaseModel):
    """Main server configuration"""
    anthropic_api_key: str = Field(..., description="Anthropic API key")
    claude_model: str = Field("claude-sonnet-4-20250514", description="Claude model to use")
    max_tokens: int = Field(1000, description="Maximum tokens for Claude responses")
    log_level: str = Field("INFO", description="Logging level")
    log_tool_calls: bool = Field(True, description="Whether to log detailed tool call information")
    mcp_servers: Dict[str, MCPServerConfig] = Field(default_factory=dict, description="MCP server configurations")

def get_default_mcp_servers() -> Dict[str, MCPServerConfig]:
    """Get default MCP server configurations"""
    return {
        "atlassian": MCPServerConfig(
            name="atlassian",
            description="Atlassian Confluence and Jira integration",
            command="docker",
            args=[
                "run",
                "-i",
                "--rm",
                "-e", "CONFLUENCE_URL",
                "-e", "CONFLUENCE_USERNAME",
                "-e", "CONFLUENCE_API_TOKEN",
                "-e", "JIRA_URL",
                "-e", "JIRA_USERNAME",
                "-e", "JIRA_API_TOKEN",
                "ghcr.io/sooperset/mcp-atlassian:latest",
            ],
            env={
                "CONFLUENCE_URL": os.getenv("CONFLUENCE_URL", ""),
                "CONFLUENCE_USERNAME": os.getenv("CONFLUENCE_USERNAME", ""),
                "CONFLUENCE_API_TOKEN": os.getenv("CONFLUENCE_API_TOKEN", ""),
                "JIRA_URL": os.getenv("JIRA_URL", ""),
                "JIRA_USERNAME": os.getenv("JIRA_USERNAME", ""),
                "JIRA_API_TOKEN": os.getenv("JIRA_API_TOKEN", ""),
            }
        ),
        # Add more default servers here
        "filesystem": MCPServerConfig(
            name="filesystem",
            description="Local filesystem operations",
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
            enabled=False  # Disabled by default
        ),
        "brave_search": MCPServerConfig(
            name="brave_search",
            description="Brave Search API integration",
            command="npx",
            args=["-y", "@modelcontextprotocol/server-brave-search"],
            env={
                "BRAVE_API_KEY": os.getenv("BRAVE_API_KEY", "")
            },
            enabled=False  # Disabled by default
        ),
    }

def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Setup structured logging configuration"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('mcp-server.log')
        ]
    )
    

    # Create tool call specific logger
    tool_logger = logging.getLogger("tool_calls")
    return tool_logger

def load_config() -> ServerConfig:
    """Load server configuration"""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is required")

    log_level = os.getenv("LOG_LEVEL", "INFO")
    log_tool_calls = os.getenv("LOG_TOOL_CALLS", "true").lower() == "true"

    return ServerConfig(
        anthropic_api_key=anthropic_key,
        log_level=log_level,
        log_tool_calls=log_tool_calls,
        mcp_servers=get_default_mcp_servers()
    )