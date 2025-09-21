#!/usr/bin/env python3
"""
Script to create the first admin user
"""
import asyncio
import os
from dotenv import load_dotenv
from database import connect_to_mongo, create_indexes, UserCreate
from user_service import UserService

load_dotenv()

async def create_admin_user():
    """Create the first admin user"""
    print("🔧 Creating Admin User")
    print("=" * 30)
    
    try:
        # Connect to database
        await connect_to_mongo()
        await create_indexes()
        
        # Get admin details
        email = input("Enter admin email: ").strip()
        password = input("Enter admin password: ").strip()
        organization = input("Enter organization name (optional): ").strip() or None
        
        if not email or not password:
            print("❌ Email and password are required")
            return
        
        # Create admin user
        user_data = UserCreate(
            email=email,
            password=password,
            organization=organization
        )
        
        admin_user = await UserService.create_user(user_data, role="admin")
        
        print(f"\n✅ Admin user created successfully!")
        print(f"📧 Email: {admin_user.email}")
        print(f"🏢 Organization: {admin_user.organization}")
        print(f"👤 Role: {admin_user.role}")
        print(f"🆔 User ID: {admin_user.id}")
        
    except ValueError as e:
        if "already exists" in str(e):
            print("❌ User with this email already exists")
        else:
            print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
