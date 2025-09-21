"""
User service for database operations
"""
from typing import Optional, List, Dict, Any
from bson import ObjectId
from database import (
    get_users_collection, 
    get_companies_collection,
    get_teams_collection,
    get_integrations_collection,
    get_invites_collection,
    UserInDB, 
    UserCreate, 
    UserResponse,
    Company,
    Team,
    Integration,
    Invite,
    PyObjectId
)
from auth import hash_password, verify_password
from datetime import datetime, timedelta
import secrets

class UserService:
    """Service class for user-related database operations"""
    
    @staticmethod
    async def create_user(user_data: UserCreate, role: str = "regular") -> UserResponse:
        """Create a new user"""
        users_collection = await get_users_collection()
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = UserInDB(
            email=user_data.email,
            password_hash=hashed_password,
            organization=user_data.organization,
            role=role,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert into database
        result = await users_collection.insert_one(user_doc.dict(by_alias=True))
        
        # Return user response (without password)
        return UserResponse(
            id=str(result.inserted_id),
            email=user_doc.email,
            organization=user_doc.organization,
            role=user_doc.role,
            admin_role=user_doc.admin_role,
            is_active=user_doc.is_active,
            onboarding_completed=user_doc.onboarding_completed,
            created_at=user_doc.created_at
        )
    
    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with email and password"""
        users_collection = await get_users_collection()
        
        # Find user by email
        user_doc = await users_collection.find_one({"email": email})
        if not user_doc:
            return None
        
        # Verify password
        if not verify_password(password, user_doc["password_hash"]):
            return None
        
        # Convert to UserInDB model
        user_doc["id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        users_collection = await get_users_collection()
        
        try:
            user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return None
            
            user_doc["id"] = str(user_doc["_id"])
            return UserInDB(**user_doc)
        except Exception:
            return None
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[UserInDB]:
        """Get user by email"""
        users_collection = await get_users_collection()
        
        user_doc = await users_collection.find_one({"email": email})
        if not user_doc:
            return None
        
        user_doc["id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    
    @staticmethod
    async def update_user(user_id: str, update_data: Dict[str, Any]) -> Optional[UserResponse]:
        """Update user information"""
        users_collection = await get_users_collection()
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return None
            
            # Get updated user
            updated_user = await UserService.get_user_by_id(user_id)
            if updated_user:
                return UserResponse(
                    id=str(updated_user.id),
                    email=updated_user.email,
                    organization=updated_user.organization,
                    role=updated_user.role,
                    admin_role=updated_user.admin_role,
                    is_active=updated_user.is_active,
                    onboarding_completed=updated_user.onboarding_completed,
                    created_at=updated_user.created_at
                )
            return None
        except Exception:
            return None
    
    @staticmethod
    async def deactivate_user(user_id: str) -> bool:
        """Deactivate user account"""
        users_collection = await get_users_collection()
        
        try:
            result = await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def get_all_users_with_teams(company_admin_id: str) -> List[Dict[str, Any]]:
        """Get all users with their team information for a company"""
        users_collection = await get_users_collection()
        teams_collection = await get_teams_collection()
        companies_collection = await get_companies_collection()
        
        try:
            # First, get the admin's company
            company = await companies_collection.find_one({
                "admin_user_id": PyObjectId(company_admin_id)
            })
            
            if not company:
                return []
            
            company_id = company["_id"]
            
            # Get all teams for this company
            teams_cursor = teams_collection.find({"company_id": company_id})
            company_teams = {}
            user_teams_map = {}
            
            async for team_doc in teams_cursor:
                team_id_str = str(team_doc["_id"])
                team_name = team_doc["name"]
                company_teams[team_id_str] = team_name
                
                # Map users to teams
                for member_id in team_doc.get("members", []):
                    member_id_str = str(member_id)
                    if member_id_str not in user_teams_map:
                        user_teams_map[member_id_str] = []
                    user_teams_map[member_id_str].append(team_name)
            
            # Get all users (including the admin)
            users_cursor = users_collection.find({
                "$or": [
                    {"_id": PyObjectId(company_admin_id)},  # Include admin
                    {"_id": {"$in": [PyObjectId(uid) for uid in user_teams_map.keys()]}}  # Include team members
                ]
            })
            
            users_with_teams = []
            async for user_doc in users_cursor:
                user_id_str = str(user_doc["_id"])
                user_teams = user_teams_map.get(user_id_str, [])
                
                # Determine role display name
                role_display = user_doc.get("admin_role", "Admin") if user_doc.get("role") == "admin" else "Member"
                
                users_with_teams.append({
                    "id": user_id_str,
                    "email": user_doc["email"],
                    "role": role_display,
                    "teams": user_teams
                })
            
            return users_with_teams
        except Exception as e:
            print(f"Error getting users with teams: {e}")
            return []

class CompanyService:
    """Service class for company-related database operations"""
    
    @staticmethod
    async def create_company(name: str, admin_user_id: str) -> Company:
        """Create a new company"""
        companies_collection = await get_companies_collection()
        
        company_doc = Company(
            name=name,
            admin_user_id=PyObjectId(admin_user_id),
            created_at=datetime.utcnow()
        )
        
        result = await companies_collection.insert_one(company_doc.dict(by_alias=True))
        company_doc.id = result.inserted_id
        return company_doc
    
    @staticmethod
    async def get_company_by_admin(admin_user_id: str) -> Optional[Company]:
        """Get company by admin user ID"""
        companies_collection = await get_companies_collection()
        
        company_doc = await companies_collection.find_one({
            "admin_user_id": PyObjectId(admin_user_id)
        })
        
        if not company_doc:
            return None
        
        company_doc["id"] = str(company_doc["_id"])
        return Company(**company_doc)
    
    @staticmethod
    async def update_company_integrations(company_id: str, allowed_integrations: List[str]) -> Optional[Company]:
        """Update company's allowed integrations"""
        companies_collection = await get_companies_collection()
        
        result = await companies_collection.update_one(
            {"_id": PyObjectId(company_id)},
            {"$set": {"allowed_integrations": allowed_integrations}}
        )
        
        if result.modified_count == 0:
            return None
        
        # Return updated company
        return await CompanyService.get_company_by_id(company_id)
    
    @staticmethod
    async def get_company_by_id(company_id: str) -> Optional[Company]:
        """Get company by ID"""
        companies_collection = await get_companies_collection()
        
        company_doc = await companies_collection.find_one({
            "_id": PyObjectId(company_id)
        })
        
        if not company_doc:
            return None
        
        company_doc["id"] = str(company_doc["_id"])
        return Company(**company_doc)

class TeamService:
    """Service class for team-related database operations"""
    
    @staticmethod
    async def create_team(name: str, integrations: List[str], created_by: str, company_id: Optional[str] = None) -> Team:
        """Create a new team"""
        teams_collection = await get_teams_collection()
        
        team_doc = Team(
            name=name,
            integrations=integrations,
            created_by=PyObjectId(created_by),
            company_id=PyObjectId(company_id) if company_id else None,
            members=[PyObjectId(created_by)],  # Creator is automatically a member
            created_at=datetime.utcnow()
        )
        
        result = await teams_collection.insert_one(team_doc.dict(by_alias=True))
        team_doc.id = result.inserted_id
        return team_doc
    
    @staticmethod
    async def get_user_teams(user_id: str) -> List[Team]:
        """Get all teams where user is a member"""
        teams_collection = await get_teams_collection()
        
        teams_cursor = teams_collection.find({
            "members": PyObjectId(user_id)
        })
        
        teams = []
        async for team_doc in teams_cursor:
            team_doc["id"] = str(team_doc["_id"])
            teams.append(Team(**team_doc))
        
        return teams
    
    @staticmethod
    async def add_member_to_team(team_id: str, user_id: str) -> bool:
        """Add a member to a team"""
        teams_collection = await get_teams_collection()
        
        try:
            result = await teams_collection.update_one(
                {"_id": ObjectId(team_id)},
                {"$addToSet": {"members": PyObjectId(user_id)}}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def update_team(team_id: str, name: str, integrations: List[str], updated_by: str) -> Optional[Team]:
        """Update a team"""
        teams_collection = await get_teams_collection()
        
        try:
            # Validate team_id format
            if not ObjectId.is_valid(team_id):
                print(f"Invalid team_id format: {team_id}")
                return None
            
            # First check if the team exists and user has access to it
            team_doc = await teams_collection.find_one({
                "_id": ObjectId(team_id),
                "members": PyObjectId(updated_by)
            })
            
            if not team_doc:
                print(f"Team not found or user {updated_by} doesn't have access to team {team_id}")
                return None
            
            # Validate data
            if not name or not name.strip():
                print("Team name is required and cannot be empty")
                return None
            
            result = await teams_collection.update_one(
                {"_id": ObjectId(team_id)},
                {
                    "$set": {
                        "name": name.strip(),
                        "integrations": integrations,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                updated_team_doc = await teams_collection.find_one({"_id": ObjectId(team_id)})
                if updated_team_doc:
                    updated_team_doc["id"] = str(updated_team_doc["_id"])
                    return Team(**updated_team_doc)
            else:
                print(f"No documents were modified for team {team_id}")
            return None
        except Exception as e:
            print(f"Error updating team: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    async def delete_team(team_id: str, user_id: str) -> bool:
        """Delete a team (only if user is the creator or admin)"""
        teams_collection = await get_teams_collection()
        
        try:
            # Check if user is the creator of the team
            team = await teams_collection.find_one({
                "_id": ObjectId(team_id),
                "created_by": PyObjectId(user_id)
            })
            
            if not team:
                return False
            
            result = await teams_collection.delete_one({"_id": ObjectId(team_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def get_team_by_id(team_id: str) -> Optional[Team]:
        """Get a team by ID"""
        teams_collection = await get_teams_collection()
        
        try:
            team_doc = await teams_collection.find_one({"_id": ObjectId(team_id)})
            if team_doc:
                team_doc["id"] = str(team_doc["_id"])
                return Team(**team_doc)
            return None
        except Exception:
            return None

class IntegrationService:
    """Service class for integration-related database operations"""
    
    @staticmethod
    async def create_integration(user_id: str, integration_type: str, secret_key: str = "") -> Integration:
        """Create a new integration"""
        integrations_collection = await get_integrations_collection()
        
        integration_doc = Integration(
            user_id=PyObjectId(user_id),
            integration_type=integration_type,
            secret_key=secret_key or "",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        result = await integrations_collection.insert_one(integration_doc.dict(by_alias=True))
        integration_doc.id = result.inserted_id
        return integration_doc
    
    @staticmethod
    async def get_user_integrations(user_id: str) -> List[Integration]:
        """Get all integrations for a user"""
        integrations_collection = await get_integrations_collection()
        
        integrations_cursor = integrations_collection.find({
            "user_id": PyObjectId(user_id),
            "is_active": True
        })
        
        integrations = []
        async for integration_doc in integrations_cursor:
            integration_doc["id"] = str(integration_doc["_id"])
            integrations.append(Integration(**integration_doc))
        
        return integrations

class InviteService:
    """Service class for invitation-related database operations"""
    
    @staticmethod
    async def create_invite(email: str, role: str, team_id: str, company_id: str, invited_by: str) -> Invite:
        """Create a new team invitation"""
        invites_collection = await get_invites_collection()
        
        # Generate a secure token for the invitation
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)  # Invite expires in 7 days
        
        invite_doc = Invite(
            email=email,
            role=role,
            team_id=PyObjectId(team_id),
            company_id=PyObjectId(company_id),
            invited_by=PyObjectId(invited_by),
            status="pending",
            token=token,
            created_at=datetime.utcnow(),
            expires_at=expires_at
        )
        
        result = await invites_collection.insert_one(invite_doc.dict(by_alias=True))
        invite_doc.id = result.inserted_id
        return invite_doc
    
    @staticmethod
    async def get_pending_invites(email: str) -> List[Invite]:
        """Get pending invitations for an email"""
        invites_collection = await get_invites_collection()
        
        invites_cursor = invites_collection.find({
            "email": email,
            "status": "pending"
        })
        
        invites = []
        async for invite_doc in invites_cursor:
            invite_doc["id"] = str(invite_doc["_id"])
            invites.append(Invite(**invite_doc))
        
        return invites
    
    @staticmethod
    async def get_invite_by_token(token: str) -> Optional[Invite]:
        """Get invitation by token"""
        invites_collection = await get_invites_collection()
        
        invite_doc = await invites_collection.find_one({
            "token": token,
            "status": "pending",
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not invite_doc:
            return None
        
        invite_doc["id"] = str(invite_doc["_id"])
        return Invite(**invite_doc)
    
    @staticmethod
    async def accept_invite(invite_id: str) -> bool:
        """Accept an invitation"""
        invites_collection = await get_invites_collection()
        
        try:
            result = await invites_collection.update_one(
                {"_id": ObjectId(invite_id)},
                {"$set": {"status": "accepted"}}
            )
            return result.modified_count > 0
        except Exception:
            return False
