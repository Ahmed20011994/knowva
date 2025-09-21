#!/usr/bin/env python3
"""
Startup script for the MCP FastAPI Server
"""
import sys
import subprocess
import os
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")

    try:
        import fastapi
        import uvicorn
        import mcp
        import anthropic
        import pydantic
        print("✅ All required dependencies found")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: uv sync")
        return False

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        print("Please create a .env file with your ANTHROPIC_API_KEY")
        return False

    # Read .env file and check for required keys
    with open(env_file) as f:
        env_content = f.read()

    required_keys = ["ANTHROPIC_API_KEY"]
    missing_keys = []

    for key in required_keys:
        if f"{key}=" not in env_content:
            missing_keys.append(key)

    if missing_keys:
        print(f"❌ Missing required environment variables: {', '.join(missing_keys)}")
        return False

    print("✅ Environment file configured")
    return True

def check_docker():
    """Check if Docker is available (optional but recommended)"""
    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print("✅ Docker is available")
            return True
        else:
            print("⚠️  Docker not found - some MCP servers may not work")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("⚠️  Docker not found - some MCP servers may not work")
        return False

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting MCP FastAPI Server...")
    print("Server will be available at: http://135.222.251.229:8000")
    print("API documentation at: http://135.222.251.229:8000/docs")
    print("Press Ctrl+C to stop the server\n")

    try:
        # Start the server using uvicorn
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "server:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload",
            "--log-level", "info"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("🔥 MCP FastAPI Server Startup")
    print("=" * 40)

    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    # Run all checks
    checks_passed = True

    if not check_dependencies():
        checks_passed = False

    if not check_env_file():
        checks_passed = False

    check_docker()  # Optional check

    if not checks_passed:
        print("\n❌ Pre-flight checks failed. Please fix the issues above.")
        sys.exit(1)

    print("\n✅ All checks passed!")

    # Start the server
    start_server()

if __name__ == "__main__":
    main()