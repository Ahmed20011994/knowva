# Docker Setup for Hackathon Team Rogue

## Quick Start

1. **Set up environment variables**:
   ```bash
   cp .env.docker .env
   # Edit .env with your actual API keys and credentials
   ```

2. **Build and start the services**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - API Server: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

## Commands

### Development
```bash
# Build and start in development mode (with logs)
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose build backend
docker-compose up -d backend
```

### Production
```bash
# Start in production mode
docker-compose -f docker-compose.yml up -d

# Update and restart
docker-compose pull
docker-compose up -d
```

### Maintenance
```bash
# Clean up
docker-compose down -v  # Removes volumes
docker system prune     # Clean up unused containers/images

# Check status
docker-compose ps
docker-compose logs backend
```

## File Structure

```
hackathon-team-rogue/
├── backend/
│   ├── Dockerfile          # Backend container definition
│   ├── .dockerignore      # Files to exclude from Docker build
│   └── ...                # Backend application files
├── docker-compose.yml     # Service orchestration
├── .env.docker           # Environment template
└── README-Docker.md      # This file
```

## Environment Variables

The following environment variables are required in your `.env` file:

- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `CONFLUENCE_URL`, `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN` - Atlassian Confluence
- `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN` - Atlassian Jira

Optional variables:
- `BRAVE_API_KEY` - For web search capabilities
- `LOG_LEVEL` - Logging level (default: info)

## Volumes

- `./logs:/app/logs` - Application logs persistence
- `./uploads:/app/uploads` - File uploads persistence

## Health Checks

The backend service includes health checks that monitor:
- Application startup
- API endpoint availability
- Service health at `/health`

## Troubleshooting

### Common Issues

1. **Build fails**: Check that Docker is running and you have internet connectivity
2. **Service won't start**: Verify environment variables are set correctly
3. **Port conflicts**: Change the port mapping in docker-compose.yml if 8000 is in use
4. **Permission errors**: Ensure Docker has access to the project directory

### Debug Commands

```bash
# Check service logs
docker-compose logs backend

# Enter container for debugging
docker-compose exec backend bash

# Check running processes
docker-compose ps

# View resource usage
docker stats
```

## Scaling (Future)

To scale the application:

```bash
# Scale backend to multiple instances
docker-compose up -d --scale backend=3

# Add load balancer (uncomment nginx service in docker-compose.yml)
```