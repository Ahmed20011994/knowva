"""
Authentication routes for login, signup, and user management
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import timedelta
import json

from database import UserCreate, UserResponse, get_companies_collection
from user_service import UserService, CompanyService, TeamService, IntegrationService, InviteService
from email_service import email_service
from auth import (
    create_access_token, 
    validate_password_strength, 
    get_password_requirements,
    get_current_user_token,
    require_admin_role,
    require_authenticated_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Request/Response models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    expires_in: int

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    organization: Optional[str] = None

class OrganizationUpdateRequest(BaseModel):
    organization: str
    admin_role: Optional[str] = None

class TeamCreateRequest(BaseModel):
    name: str
    integrations: List[str] = []

class IntegrationCreateRequest(BaseModel):
    integration_type: str  # jira, confluence, zendesk
    secret_key: Optional[str] = ""

class InviteRequest(BaseModel):
    email: EmailStr
    role: str
    team_id: str

class OnboardingCompleteRequest(BaseModel):
    pass  # No additional fields needed

class UserSignupFromInviteRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

# Authentication endpoints
@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    """Register a new user"""
    
    # Validate password confirmation
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate password strength
    if not validate_password_strength(request.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_password_requirements()
        )
    
    try:
        # Create user
        user_data = UserCreate(
            email=request.email,
            password=request.password,
            organization=request.organization
        )
        
        # Users signing up directly start as regular, become admin only after completing onboarding
        role = "regular"
        
        user = await UserService.create_user(user_data, role=role)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email,
                "role": user.role
            },
            expires_delta=access_token_expires
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
        )
        
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return access token"""
    
    # Authenticate user
    user = await UserService.authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        },
        expires_delta=access_token_expires
    )
    
    # Convert user to response model
    user_response = UserResponse(
        id=str(user.id),
        email=user.email,
        organization=user.organization,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Get current user information"""
    
    user = await UserService.get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        organization=user.organization,
        role=user.role,
        admin_role=user.admin_role,
        is_active=user.is_active,
        onboarding_completed=user.onboarding_completed,
        created_at=user.created_at
    )

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Logout user (client should discard the token)"""
    return {"message": "Successfully logged out"}

# Onboarding endpoints
@router.put("/onboarding/organization", response_model=UserResponse)
async def update_organization(
    request: OrganizationUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Update user's organization and admin role during onboarding"""
    
    update_data = {"organization": request.organization}
    if request.admin_role:
        update_data["admin_role"] = request.admin_role
    
    updated_user = await UserService.update_user(
        current_user["user_id"],
        update_data
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create company record if it doesn't exist
    if updated_user.organization:
        existing_company = await CompanyService.get_company_by_admin(current_user["user_id"])
        if not existing_company:
            await CompanyService.create_company(
                name=updated_user.organization,
                admin_user_id=current_user["user_id"]
            )
    
    return updated_user

@router.post("/onboarding/teams")
async def create_team(
    request: TeamCreateRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Create a new team during onboarding"""
    
    try:
        team = await TeamService.create_team(
            name=request.name,
            integrations=[i.lower() for i in request.integrations],
            created_by=current_user["user_id"],
            company_id=None  # Make company_id optional
        )
        
        return {
            "id": str(team.id),
            "name": team.name,
            "integrations": team.integrations,
            "created_at": team.created_at
        }
        
    except Exception as e:
        print(f"Error creating team: {e}")  # Add logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )

@router.post("/teams/debug")
async def debug_team_request(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Debug endpoint to see raw request"""
    body = await request.body()
    content_type = request.headers.get("content-type")
    
    print(f"Raw body: {body}")
    print(f"Content-Type: {content_type}")
    print(f"Headers: {dict(request.headers)}")
    
    return {
        "raw_body": body.decode() if body else None,
        "content_type": content_type,
        "headers": dict(request.headers)
    }

@router.post("/teams")
async def create_team_general(
    raw_request: Request,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Create a new team (general endpoint)"""
    
    try:
        # Get raw body and parse manually
        body = await raw_request.body()
        body_str = body.decode('utf-8')
        print(f"Raw body string: {body_str}")
        
        # Parse JSON manually
        request_data = json.loads(body_str)
        print(f"Parsed data: {request_data}")
        
        # Extract fields
        name = request_data.get('name', '').strip()
        integrations = request_data.get('integrations', [])
        
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team name is required"
            )
        
        # Validate integrations
        valid_integrations = ["jira", "confluence", "zendesk"]
        for integration in integrations:
            if integration.lower() not in valid_integrations:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid integration: {integration}. Valid options: {', '.join(valid_integrations)}"
                )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {str(e)}"
        )
    except Exception as e:
        print(f"Error parsing request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing request: {str(e)}"
        )
    
    try:
        team = await TeamService.create_team(
            name=name,
            integrations=[i.lower() for i in integrations],
            created_by=current_user["user_id"],
            company_id=None  # No company requirement for general teams
        )
        
        return {
            "id": str(team.id),
            "name": team.name,
            "integrations": team.integrations,
            "created_at": team.created_at,
            "members_count": len(team.members) if team.members else 0
        }
        
    except Exception as e:
        print(f"Error creating team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )

@router.get("/teams")
async def get_user_teams(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Get user's teams"""
    
    teams = await TeamService.get_user_teams(current_user["user_id"])
    
    return [
        {
            "id": str(team.id),
            "name": team.name,
            "integrations": team.integrations,
            "created_at": team.created_at,
            "members_count": len(team.members) if team.members else 0
        }
        for team in teams
    ]

@router.put("/teams/{team_id}")
async def update_team(
    team_id: str,
    raw_request: Request,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Update an existing team"""
    
    try:
        # Get raw body and parse manually
        body = await raw_request.body()
        body_str = body.decode('utf-8')
        print(f"Update team - Raw body string: {body_str}")
        
        # Parse JSON manually
        request_data = json.loads(body_str)
        print(f"Update team - Parsed data: {request_data}")
        
        # Extract fields
        name = request_data.get('name', '').strip()
        integrations = request_data.get('integrations', [])
        
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team name is required"
            )
        
        # Validate integrations
        valid_integrations = ["jira", "confluence", "zendesk"]
        for integration in integrations:
            if integration.lower() not in valid_integrations:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid integration: {integration}. Valid options: {', '.join(valid_integrations)}"
                )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {str(e)}"
        )
    except Exception as e:
        print(f"Error parsing update request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing request: {str(e)}"
        )
    
    try:
        updated_team = await TeamService.update_team(
            team_id=team_id,
            name=name,
            integrations=[i.lower() for i in integrations],
            updated_by=current_user["user_id"]
        )
        
        if not updated_team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found or you don't have permission to update it"
            )
        
        return {
            "id": str(updated_team.id),
            "name": updated_team.name,
            "integrations": updated_team.integrations,
            "created_at": updated_team.created_at,
            "members_count": len(updated_team.members) if updated_team.members else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating team: {e}")  # Add logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update team: {str(e)}"
        )

@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Delete a team"""
    
    try:
        success = await TeamService.delete_team(team_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found or you don't have permission to delete it"
            )
        
        return {"message": "Team deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete team"
        )

@router.post("/integrations")
async def create_integration(
    request: IntegrationCreateRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Create a new integration"""
    
    try:
        integration = await IntegrationService.create_integration(
            user_id=current_user["user_id"],
            integration_type=request.integration_type,
            secret_key=request.secret_key or ""
        )
        
        return {
            "id": str(integration.id),
            "integration_type": integration.integration_type,
            "is_active": integration.is_active,
            "created_at": integration.created_at
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration"
        )

@router.get("/integrations")
async def get_user_integrations(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Get user's integrations"""
    
    integrations = await IntegrationService.get_user_integrations(current_user["user_id"])
    
    return [
        {
            "id": str(integration.id),
            "integration_type": integration.integration_type,
            "is_active": integration.is_active,
            "created_at": integration.created_at
        }
        for integration in integrations
    ]

@router.get("/organization/allowed-integrations")
async def get_organization_allowed_integrations(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Get organization's allowed integrations"""
    
    # Get the company for this user
    if current_user.get("role") == "admin":
        company = await CompanyService.get_company_by_admin(current_user["user_id"])
    else:
        # For regular users, we need to find their company through their teams
        teams = await TeamService.get_user_teams(current_user["user_id"])
        company = None
        if teams:
            # Get company from the first team (assuming user belongs to one company)
            company = await CompanyService.get_company_by_id(str(teams[0].company_id)) if teams[0].company_id else None
    
    if not company:
        # If no company found or no restrictions set, return all available integrations
        return {"allowed_integrations": ["jira", "confluence", "zendesk"]}
    
    # If no allowed integrations set, try to determine from existing teams or integrations
    if not company.allowed_integrations:
        # Try to determine allowed integrations from existing user integrations
        user_integrations = await IntegrationService.get_user_integrations(current_user["user_id"])
        if user_integrations:
            # Set organization restrictions based on existing integrations
            integration_types = [integration.integration_type for integration in user_integrations]
            if "jira" in integration_types:
                allowed_integrations = ["jira"]
            else:
                allowed_integrations = ["confluence", "zendesk"]
            
            # Update company with determined restrictions
            await CompanyService.update_company_integrations(str(company.id), allowed_integrations)
            return {"allowed_integrations": allowed_integrations}
        
        # Try to determine from existing teams
        if current_user.get("role") == "admin":
            teams = await TeamService.get_user_teams(current_user["user_id"])
        else:
            teams = await TeamService.get_user_teams(current_user["user_id"])
        
        if teams:
            # Get all integrations from all teams
            all_team_integrations = []
            for team in teams:
                all_team_integrations.extend(team.integrations)
            
            if all_team_integrations:
                if "jira" in all_team_integrations:
                    allowed_integrations = ["jira"]
                else:
                    allowed_integrations = ["confluence", "zendesk"]
                
                # Update company with determined restrictions
                await CompanyService.update_company_integrations(str(company.id), allowed_integrations)
                return {"allowed_integrations": allowed_integrations}
        
        # If no existing data found, return all available (fallback)
        return {"allowed_integrations": ["jira", "confluence", "zendesk"]}
    
    return {"allowed_integrations": company.allowed_integrations}

@router.post("/organization/fix-integrations")
async def fix_organization_integrations(current_user: Dict[str, Any] = Depends(require_authenticated_user)):
    """Fix organization integration restrictions based on existing data (for migration purposes)"""
    
    try:
        # Get company either as admin or through team membership
        company = await CompanyService.get_company_by_admin(current_user["user_id"])
        if not company:
            # Try to get company through user's teams
            teams = await TeamService.get_user_teams(current_user["user_id"])
            if teams and teams[0].company_id:
                company = await CompanyService.get_company_by_id(str(teams[0].company_id))
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        # If already has allowed integrations, don't override
        if company.allowed_integrations:
            return {"message": "Organization integrations already set", "allowed_integrations": company.allowed_integrations}
        
        # Try to determine from existing user integrations first
        user_integrations = await IntegrationService.get_user_integrations(current_user["user_id"])
        if user_integrations:
            integration_types = [integration.integration_type for integration in user_integrations]
            if "jira" in integration_types:
                allowed_integrations = ["jira"]
            else:
                allowed_integrations = ["confluence", "zendesk"]
            
            await CompanyService.update_company_integrations(str(company.id), allowed_integrations)
            return {"message": "Organization integrations fixed based on existing integrations", "allowed_integrations": allowed_integrations}
        
        # Try to determine from existing teams
        teams = await TeamService.get_user_teams(current_user["user_id"])
        if teams:
            all_team_integrations = []
            for team in teams:
                all_team_integrations.extend(team.integrations)
            
            if all_team_integrations:
                if "jira" in all_team_integrations:
                    allowed_integrations = ["jira"]
                else:
                    allowed_integrations = ["confluence", "zendesk"]
                
                await CompanyService.update_company_integrations(str(company.id), allowed_integrations)
                return {"message": "Organization integrations fixed based on existing teams", "allowed_integrations": allowed_integrations}
        
        return {"message": "No existing integrations found to base restrictions on"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fix organization integrations"
        )

@router.post("/onboarding/invites")
async def send_invite(
    request: InviteRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Send team invitation during onboarding"""
    
    
    try:
        # Get the company for this admin
        company = await CompanyService.get_company_by_admin(current_user["user_id"])
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found. Please complete organization setup first."
            )
        
        # Get team details
        teams = await TeamService.get_user_teams(current_user["user_id"])
        team = next((t for t in teams if str(t.id) == request.team_id), None)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Get current user details for inviter name
        user = await UserService.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        invite = await InviteService.create_invite(
            email=request.email,
            role=request.role,
            team_id=request.team_id,
            company_id=str(company.id),
            invited_by=current_user["user_id"]
        )
        
        # Send invitation email
        inviter_name = user.email.split('@')[0].title()  # Use email prefix as name
        email_sent = await email_service.send_invitation_email(
            to_email=request.email,
            inviter_name=inviter_name,
            company_name=company.name,
            team_name=team.name,
            role=request.role,
            invitation_token=invite.token
        )
        
        return {
            "id": str(invite.id),
            "email": invite.email,
            "role": invite.role,
            "team_name": team.name,
            "status": invite.status,
            "email_sent": email_sent,
            "created_at": invite.created_at
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}"
        )

@router.post("/onboarding/complete")
async def complete_onboarding(
    request: OnboardingCompleteRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated_user)
):
    """Complete the onboarding process"""
    
    try:
        # Mark onboarding as completed and promote user to admin
        updated_user = await UserService.update_user(
            current_user["user_id"],
            {"onboarding_completed": True, "role": "admin"}
        )
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "Onboarding completed successfully", "user": updated_user}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )

@router.post("/users/signup-from-invite", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def signup_from_invite(request: UserSignupFromInviteRequest):
    """Register a new user from invitation"""
    
    # Validate password confirmation
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate password strength
    if not validate_password_strength(request.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_password_requirements()
        )
    
    try:
        # Get invitation by token
        invite = await InviteService.get_invite_by_token(request.token)
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invitation token"
            )
        
        # Check if user already exists
        existing_user = await UserService.get_user_by_email(invite.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create user
        user_data = UserCreate(
            email=invite.email,
            password=request.password,
            organization=None  # Will be set from company info
        )
        
        user = await UserService.create_user(user_data, role="regular")
        
        # Accept the invitation
        await InviteService.accept_invite(str(invite.id))
        
        # Add user to the team
        await TeamService.add_member_to_team(str(invite.team_id), user.id)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email,
                "role": user.role
            },
            expires_delta=access_token_expires
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
        )
        
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error in signup_from_invite: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}"
        )

@router.get("/invites/{token}")
async def get_invite_details(token: str):
    """Get invitation details by token"""
    
    try:
        invite = await InviteService.get_invite_by_token(token)
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or expired"
            )
        
        # Get team and company details
        teams = await TeamService.get_user_teams(str(invite.invited_by))
        team = next((t for t in teams if str(t.id) == str(invite.team_id)), None)
        
        company = None
        if invite.company_id:
            # Get company details from the company collection
            companies_collection = await get_companies_collection()
            company_doc = await companies_collection.find_one({"_id": invite.company_id})
            if company_doc:
                company = {"name": company_doc["name"]}
        
        return {
            "email": invite.email,
            "role": invite.role,
            "team_name": team.name if team else "Unknown Team",
            "company_name": company["name"] if company else "Unknown Company",
            "expires_at": invite.expires_at,
            "status": invite.status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get invitation details"
        )

# User endpoints
@router.get("/users")
async def list_users(current_user: dict = Depends(require_authenticated_user)):
    """List all users in the organization with their team information"""
    try:
        user_service = UserService()
        users_with_teams = await user_service.get_all_users_in_organization(current_user["user_id"])
        return {"users": users_with_teams}
    except Exception as e:
        print(f"Error in list_users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.put("/users/{user_id}/deactivate", dependencies=[Depends(require_admin_role)])
async def deactivate_user(user_id: str):
    """Deactivate a user account (admin only)"""
    
    success = await UserService.deactivate_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already deactivated"
        )
    
    return {"message": "User deactivated successfully"}
