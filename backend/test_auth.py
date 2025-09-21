#!/usr/bin/env python3
"""
Test script for authentication endpoints
Run this after setting up MongoDB and starting the server
"""
import requests
import json

BASE_URL = "http://135.222.251.229:8000"

def test_auth_flow():
    """Test the complete authentication flow"""
    print("🧪 Testing RogueAI Authentication System")
    print("=" * 50)
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "password": "TestPassword123",
        "confirm_password": "TestPassword123",
        "organization": "Test Organization"
    }
    
    try:
        # Test 1: Health check
        print("\n1️⃣ Testing health endpoint...")
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Server is healthy")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
        
        # Test 2: Signup
        print("\n2️⃣ Testing user signup...")
        response = requests.post(f"{BASE_URL}/auth/signup", json=test_user)
        if response.status_code == 201:
            signup_data = response.json()
            access_token = signup_data["access_token"]
            user_info = signup_data["user"]
            print(f"✅ Signup successful! User ID: {user_info['id']}")
            print(f"📧 Email: {user_info['email']}")
            print(f"🏢 Organization: {user_info['organization']}")
            print(f"👤 Role: {user_info['role']}")
        else:
            print(f"❌ Signup failed: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        # Test 3: Get current user
        print("\n3️⃣ Testing get current user...")
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Current user: {user_data['email']}")
        else:
            print(f"❌ Get current user failed: {response.status_code}")
        
        # Test 4: Login
        print("\n4️⃣ Testing user login...")
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            login_response = response.json()
            print(f"✅ Login successful!")
            print(f"🔑 Token type: {login_response['token_type']}")
            print(f"⏰ Expires in: {login_response['expires_in']} seconds")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
        
        # Test 5: Create team
        print("\n5️⃣ Testing team creation...")
        team_data = {
            "name": "Test Team",
            "integrations": ["jira", "confluence"]
        }
        response = requests.post(f"{BASE_URL}/auth/teams", json=team_data, headers=headers)
        if response.status_code == 200:
            team = response.json()
            print(f"✅ Team created: {team['name']}")
            print(f"🔗 Integrations: {', '.join(team['integrations'])}")
            team_id = team["id"]
        else:
            print(f"❌ Team creation failed: {response.status_code}")
            team_id = None
        
        # Test 6: Get user teams
        print("\n6️⃣ Testing get user teams...")
        response = requests.get(f"{BASE_URL}/auth/teams", headers=headers)
        if response.status_code == 200:
            teams = response.json()
            print(f"✅ Found {len(teams)} team(s)")
            for team in teams:
                print(f"  📁 {team['name']} - {', '.join(team['integrations'])}")
        else:
            print(f"❌ Get teams failed: {response.status_code}")
        
        # Test 7: Create integration
        print("\n7️⃣ Testing integration creation...")
        integration_data = {
            "integration_type": "jira",
            "secret_key": "test-secret-key-123"
        }
        response = requests.post(f"{BASE_URL}/auth/integrations", json=integration_data, headers=headers)
        if response.status_code == 200:
            integration = response.json()
            print(f"✅ Integration created: {integration['integration_type']}")
            print(f"🔌 Active: {integration['is_active']}")
        else:
            print(f"❌ Integration creation failed: {response.status_code}")
        
        # Test 8: Send invite (if team was created)
        if team_id:
            print("\n8️⃣ Testing team invitation...")
            invite_data = {
                "email": "teammate@example.com",
                "role": "Developer",
                "team_id": team_id
            }
            response = requests.post(f"{BASE_URL}/auth/invites", json=invite_data, headers=headers)
            if response.status_code == 200:
                invite = response.json()
                print(f"✅ Invite sent to: {invite['email']}")
                print(f"👤 Role: {invite['role']}")
                print(f"📋 Status: {invite['status']}")
            else:
                print(f"❌ Invite failed: {response.status_code}")
        
        # Test 9: Logout
        print("\n9️⃣ Testing logout...")
        response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
        if response.status_code == 200:
            print("✅ Logout successful")
        else:
            print(f"❌ Logout failed: {response.status_code}")
        
        print("\n🎉 Authentication system test completed!")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure the server is running at http://135.222.251.229:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_auth_flow()
