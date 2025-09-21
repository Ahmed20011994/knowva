# Signup Flow API Documentation

This document outlines the updated backend API for the new signup journey supporting both Admin and User flows.

## Database Changes

### New Models
- **Company**: Stores company/organization information
- **Updated User**: Added `admin_role`, `onboarding_completed` fields
- **Updated Team**: Added `company_id` field
- **Updated Invite**: Added `company_id`, `token`, `expires_at` fields

### New Collections
- `companies`: Company information
- Updated indexes for all collections

## Admin Journey API Endpoints

### 1. Admin Signup
**POST** `/auth/signup`
```json
{
  "email": "admin@company.com",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "organization": "Company Name"
}
```
- Creates admin user with `role: "admin"`
- Returns JWT token and user info

### 2. Onboarding - Company Details
**PUT** `/auth/onboarding/organization`
```json
{
  "organization": "Company Name",
  "admin_role": "CEO"
}
```
- Updates user's organization and admin role
- Creates company record
- Only accessible by admin users

### 3. Onboarding - Integrations
**POST** `/auth/integrations`
```json
{
  "integration_type": "jira",
  "secret_key": "your-api-key"
}
```
- Saves integration configurations
- Supports: jira, confluence, zendesk

**GET** `/auth/integrations`
- Returns user's active integrations

### 4. Onboarding - Team Creation
**POST** `/auth/onboarding/teams`
```json
{
  "name": "Product Team",
  "integrations": ["jira", "confluence"]
}
```
- Creates team linked to company
- Associates selected integrations
- Only accessible by admin users

**GET** `/auth/teams`
- Returns user's teams

### 5. Onboarding - Member Invitation
**POST** `/auth/onboarding/invites`
```json
{
  "email": "member@company.com",
  "role": "Developer",
  "team_id": "team-id-here"
}
```
- Creates invitation with secure token
- Sends invitation email automatically
- Only accessible by admin users

### 6. Complete Onboarding
**POST** `/auth/onboarding/complete`
```json
{}
```
- Marks onboarding as completed
- Enables full dashboard access

## User Journey API Endpoints

### 1. Get Invitation Details
**GET** `/auth/invites/{token}`
- Returns invitation details for display
- Validates token and expiration
- Public endpoint (no auth required)

### 2. User Signup from Invitation
**POST** `/auth/users/signup-from-invite`
```json
{
  "token": "invitation-token-here",
  "password": "securepassword",
  "confirm_password": "securepassword"
}
```
- Creates regular user from invitation
- Accepts invitation and adds to team
- Returns JWT token and user info

## Email Service

### Configuration
Add to environment variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=your_email@gmail.com
APP_URL=http://localhost:3000
```

### Features
- HTML and plain text email templates
- Secure invitation tokens
- 7-day expiration for invites
- Professional email styling

## Role-Based Access Control

### Admin Users (`role: "admin"`)
- Can create and manage company
- Can create teams and integrations
- Can invite members
- Can complete onboarding
- Access to: Home, AI Chat, Team Management, Member Management, Agents Management

### Regular Users (`role: "regular"`)
- Created from invitations
- Automatically added to assigned team
- Access to: Home, AI Chat, Agents Management

## Authentication Flow

### Admin Flow
1. **Signup** → Creates admin user
2. **Organization Setup** → Saves company details
3. **Integrations** → Configures tools
4. **Team Creation** → Creates teams with integrations
5. **Member Invitations** → Sends email invites
6. **Complete Onboarding** → Enables dashboard

### User Flow
1. **Receives Email** → Gets invitation link
2. **View Invitation** → Shows company/team details
3. **Signup** → Creates account and joins team
4. **Dashboard Access** → Limited dashboard access

## Error Handling

All endpoints include proper error handling with appropriate HTTP status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid credentials)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource not found)
- 409: Conflict (duplicate resources)
- 500: Internal Server Error

## Security Features

- Password strength validation
- Secure invitation tokens
- JWT authentication
- Role-based authorization
- Input validation
- SQL injection protection (MongoDB)
- XSS protection (Pydantic models)

## Testing

To test the API endpoints:

1. Start the backend server
2. Use the provided endpoints in sequence
3. Check email delivery (configure SMTP)
4. Verify database persistence
5. Test role-based access controls

## Frontend Integration

The frontend pages should call these endpoints:
- `/signup` → `/auth/signup`
- `/signup/onboarding` → `/auth/onboarding/organization`
- `/signup/onboarding/integrations` → `/auth/integrations`
- `/signup/onboarding/teams` → `/auth/onboarding/teams`
- `/signup/onboarding/invite` → `/auth/onboarding/invites`
- `/users/signup` → `/auth/invites/{token}` + `/auth/users/signup-from-invite`
