# MongoDB Setup Guide

This guide will help you set up MongoDB for the RogueAI backend authentication system.

## Option 1: Using Docker Compose (Recommended)

The easiest way is to use the included Docker Compose setup:

```bash
# Start MongoDB and the backend
docker-compose up -d mongodb

# Check if MongoDB is running
docker-compose logs mongodb
```

MongoDB will be available at `mongodb://localhost:27017` with database name `rogueai`.

## Option 2: Local MongoDB Installation

### Windows:
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install and run MongoDB service
3. MongoDB will be available at `mongodb://localhost:27017`

### macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Ubuntu/Linux:
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Environment Variables

Create a `.env` file in the backend directory with these variables:

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=rogueai

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Other required variables
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Install Python Dependencies

```bash
cd backend

# Install new dependencies
pip install motor>=3.3.0 passlib[bcrypt]>=1.7.4 python-jose[cryptography]>=3.3.0

# Or install all dependencies
pip install -r requirements.txt
```

## Test the Setup

1. Start MongoDB (using one of the methods above)
2. Create your `.env` file with the required variables
3. Start the backend server:

```bash
cd backend
python start_server.py
```

4. Visit http://134.33.240.184:8000/docs to see the API documentation
5. You should see the new authentication endpoints under the "Authentication" section

## Database Collections

The system will automatically create these collections:
- `users` - User accounts
- `teams` - Team information
- `integrations` - User integrations (Jira, Confluence, etc.)
- `invites` - Team invitations

## First User

The first user you create will have regular permissions. You can manually set admin role by updating the user in MongoDB:

```javascript
// Connect to MongoDB shell
mongosh

// Use the database
use rogueai

// Update first user to admin
db.users.updateOne(
  {email: "your-email@example.com"}, 
  {$set: {role: "admin"}}
)
```

## Troubleshooting

### Connection Issues
- Make sure MongoDB is running: `docker-compose ps` or `sudo systemctl status mongod`
- Check if port 27017 is available: `netstat -an | grep 27017`
- Verify environment variables are set correctly

### Authentication Issues
- Make sure JWT_SECRET_KEY is set and secure
- Check that all required dependencies are installed
- Verify the server starts without errors

### Common Errors
- `motor.motor_asyncio not found`: Run `pip install motor`
- `bson not found`: Run `pip install pymongo` (included with motor)
- `passlib not found`: Run `pip install passlib[bcrypt]`
- `jose not found`: Run `pip install python-jose[cryptography]`
