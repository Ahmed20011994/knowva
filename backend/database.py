"""
Database configuration and models for MongoDB
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import Optional, List, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

# MongoDB connection
class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

# MongoDB connection functions
async def connect_to_mongo():
    """Create database connection"""
    Database.client = AsyncIOMotorClient(
        os.getenv("MONGODB_URL", "mongodb+srv://walle:8EkOE0lxzRvIEYV7@cluster0.08cunpc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    )
    Database.database = Database.client[os.getenv("DATABASE_NAME", "knowva")]
    
    # Test connection
    try:
        await Database.client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if Database.client:
        Database.client.close()
        print("📦 MongoDB connection closed")

def get_database():
    """Get database instance"""
    return Database.database

# Custom ObjectId validator for Pydantic v2
def validate_object_id(v):
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str):
        if ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")
    raise TypeError("ObjectId required")

PyObjectId = Annotated[ObjectId, BeforeValidator(validate_object_id)]

# Database Models
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    role: str  # 'user', 'assistant'
    content: str
    servers_used: Optional[List[str]] = None
    tools_called: Optional[List[str]] = None

class Conversation(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Agent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str  # Owner of the agent
    name: str
    description: str
    identifier: str = Field(default_factory=lambda: f"agent-{str(uuid.uuid4())}")
    icon: str = "🎯"
    integration: str = "ZenDesk"
    llm: str = "Claude-3-5-Sonnet"
    custom_knowledge: str = ""
    exposure: bool = True
    greeting: str = "How can I help?"
    prompt: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AgentConversation(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    agent_id: PyObjectId
    user_id: str  # User who started the conversation
    user_email: Optional[str] = None
    messages: List[Message] = []
    status: str = "active"  # active, closed, archived
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Pydantic Models
class UserRole(str):
    ADMIN = "admin"
    REGULAR = "regular"

class UserInDB(BaseModel):
    """User model for database operations"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    password_hash: str
    organization: Optional[str] = None
    role: str = UserRole.REGULAR
    admin_role: Optional[str] = None  # For admin users: CEO, CTO, etc.
    is_active: bool = True
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    password: str
    organization: Optional[str] = None

class UserResponse(BaseModel):
    """User response model (without password)"""
    id: str
    email: str
    organization: Optional[str] = None
    role: str
    admin_role: Optional[str] = None
    is_active: bool
    onboarding_completed: bool = False
    created_at: datetime

class Company(BaseModel):
    """Company/Organization model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    admin_user_id: PyObjectId  # ID of the admin user who created the company
    allowed_integrations: List[str] = []  # List of allowed integration types for this organization
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class Team(BaseModel):
    """Team model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    integrations: List[str] = []
    created_by: PyObjectId  # User ID
    company_id: Optional[PyObjectId] = None  # Company this team belongs to
    members: List[PyObjectId] = []  # User IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class Integration(BaseModel):
    """Integration model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    integration_type: str  # jira, confluence, zendesk
    secret_key: Optional[str] = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class Invite(BaseModel):
    """Team invitation model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    role: str
    team_id: PyObjectId
    company_id: PyObjectId  # Company this invite belongs to
    invited_by: PyObjectId  # User ID
    status: str = "pending"  # pending, accepted, declined
    token: Optional[str] = None  # Invitation token for signup link
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Invitation expiration
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

# Database collections
async def get_users_collection():
    """Get users collection"""
    db = get_database()
    return db.users

async def get_teams_collection():
    """Get teams collection"""
    db = get_database()
    return db.teams

async def get_integrations_collection():
    """Get integrations collection"""
    db = get_database()
    return db.integrations

async def get_companies_collection():
    """Get companies collection"""
    db = get_database()
    return db.companies

async def get_invites_collection():
    """Get invites collection"""
    db = get_database()
    return db.invites

def get_conversations_collection():
    """Get conversations collection"""
    db = get_database()
    return db.conversations

def get_agents_collection():
    """Get agents collection"""
    db = get_database()
    return db.agents

def get_agent_conversations_collection():
    """Get agent conversations collection"""
    db = get_database()
    return db.agent_conversations

# Conversation specific database functions
async def get_conversation(conversation_id: str) -> Optional[Conversation]:
    db = get_database()
    conv_data = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if conv_data:
        return Conversation(**conv_data)
    return None

async def get_conversations_for_user(user_id: str) -> List[Conversation]:
    db = get_database()
    conversations = []
    cursor = db.conversations.find({"user_id": user_id})
    async for conv_data in cursor:
        conversations.append(Conversation(**conv_data))
    return conversations

async def get_or_create_conversation_for_user(user_id: str) -> Conversation:
    """Create a new conversation for a user"""
    db = get_database()

    # Always create a new conversation
    new_conv = Conversation(user_id=user_id)
    # Use model_dump to convert to dict, ensuring aliases and encoders are used
    insert_data = new_conv.model_dump(by_alias=True, exclude=['id'])
    result = await db.conversations.insert_one(insert_data)
    new_conv.id = result.inserted_id
    return new_conv

async def add_message_to_conversation(conversation_id: PyObjectId, message: Message):
    db = get_database()
    await db.conversations.update_one(
        {"_id": conversation_id},
        {
            "$push": {"messages": message.model_dump()},
            "$set": {"updated_at": datetime.now()}
        }
    )

async def delete_conversation(conversation_id: str):
    db = get_database()
    result = await db.conversations.delete_one({"_id": ObjectId(conversation_id)})
    return result.deleted_count > 0

# Agent specific database functions
async def create_agent(agent: Agent) -> Agent:
    """Create a new agent"""
    db = get_database()
    insert_data = agent.model_dump(by_alias=True, exclude=['id'])
    result = await db.agents.insert_one(insert_data)
    agent.id = result.inserted_id
    return agent

async def get_agent(agent_id: str) -> Optional[Agent]:
    """Get agent by ID"""
    db = get_database()
    agent_data = await db.agents.find_one({"_id": ObjectId(agent_id)})
    if agent_data:
        return Agent(**agent_data)
    return None

async def get_agent_by_identifier(identifier: str) -> Optional[Agent]:
    """Get agent by identifier"""
    db = get_database()
    agent_data = await db.agents.find_one({"identifier": identifier})
    if agent_data:
        return Agent(**agent_data)
    return None

async def get_agents_for_user(user_id: str) -> List[Agent]:
    """Get all agents for a user"""
    db = get_database()
    agents = []
    cursor = db.agents.find({"user_id": user_id, "is_active": True}).sort("created_at", -1)
    async for agent_data in cursor:
        agents.append(Agent(**agent_data))
    return agents

async def update_agent(agent_id: str, update_data: Dict[str, Any]) -> bool:
    """Update an agent"""
    db = get_database()
    update_data["updated_at"] = datetime.now()
    result = await db.agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

async def delete_agent(agent_id: str) -> bool:
    """Soft delete an agent by setting is_active to False"""
    db = get_database()
    result = await db.agents.update_one(
        {"_id": ObjectId(agent_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now()}}
    )
    return result.modified_count > 0

# Agent conversation functions
async def create_agent_conversation(agent_conversation: AgentConversation) -> AgentConversation:
    """Create a new agent conversation"""
    db = get_database()
    insert_data = agent_conversation.model_dump(by_alias=True, exclude=['id'])
    result = await db.agent_conversations.insert_one(insert_data)
    agent_conversation.id = result.inserted_id
    return agent_conversation

async def get_agent_conversation(conversation_id: str) -> Optional[AgentConversation]:
    """Get agent conversation by ID"""
    db = get_database()
    conv_data = await db.agent_conversations.find_one({"_id": ObjectId(conversation_id)})
    if conv_data:
        return AgentConversation(**conv_data)
    return None

async def get_agent_conversations_for_agent(agent_id: str) -> List[AgentConversation]:
    """Get all conversations for a specific agent"""
    db = get_database()
    conversations = []
    cursor = db.agent_conversations.find({"agent_id": ObjectId(agent_id)}).sort("created_at", -1)
    async for conv_data in cursor:
        conversations.append(AgentConversation(**conv_data))
    return conversations

async def get_agent_conversations_for_user(user_id: str) -> List[AgentConversation]:
    """Get all agent conversations for a user"""
    db = get_database()
    conversations = []
    cursor = db.agent_conversations.find({"user_id": user_id}).sort("created_at", -1)
    async for conv_data in cursor:
        conversations.append(AgentConversation(**conv_data))
    return conversations

async def add_message_to_agent_conversation(conversation_id: str, message: Message):
    """Add message to agent conversation"""
    db = get_database()
    await db.agent_conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$push": {"messages": message.model_dump()},
            "$set": {"updated_at": datetime.now()}
        }
    )

async def update_agent_conversation_status(conversation_id: str, status: str) -> bool:
    """Update agent conversation status"""
    db = get_database()
    result = await db.agent_conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"status": status, "updated_at": datetime.now()}}
    )
    return result.modified_count > 0

# Create indexes
async def create_indexes():
    """Create database indexes for better performance"""
    users_collection = await get_users_collection()
    companies_collection = await get_companies_collection()
    teams_collection = await get_teams_collection()
    integrations_collection = await get_integrations_collection()
    invites_collection = await get_invites_collection()
    conversations_collection = get_conversations_collection()
    agents_collection = get_agents_collection()
    agent_conversations_collection = get_agent_conversations_collection()

    # Users indexes
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("created_at")
    await users_collection.create_index("role")
    
    # Companies indexes
    await companies_collection.create_index("admin_user_id")
    await companies_collection.create_index("name")
    
    # Teams indexes
    await teams_collection.create_index("created_by")
    await teams_collection.create_index("company_id")
    await teams_collection.create_index("name")
    
    # Integrations indexes
    await integrations_collection.create_index("user_id")
    await integrations_collection.create_index("integration_type")
    
    # Invites indexes
    await invites_collection.create_index("email")
    await invites_collection.create_index("team_id")
    await invites_collection.create_index("company_id")
    await invites_collection.create_index("invited_by")
    await invites_collection.create_index("token")
    await invites_collection.create_index("status")
    
    # Conversations indexes
    await conversations_collection.create_index("user_id")

    # Agents indexes
    await agents_collection.create_index("user_id")
    await agents_collection.create_index("identifier", unique=True)
    await agents_collection.create_index("is_active")
    await agents_collection.create_index("created_at")

    # Agent conversations indexes
    await agent_conversations_collection.create_index("agent_id")
    await agent_conversations_collection.create_index("user_id")
    await agent_conversations_collection.create_index("status")
    await agent_conversations_collection.create_index("created_at")

    print("✅ Database indexes created successfully")
