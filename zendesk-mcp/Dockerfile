# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY main.py .

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.12 \
    uvicorn==0.34.1 \
    httpx==0.28.1 \
    mcp==1.10.1 \
    starlette==0.46.2 \
    sse-starlette==2.4.1

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the application
CMD ["python", "main.py", "--host", "0.0.0.0", "--port", "8080"]