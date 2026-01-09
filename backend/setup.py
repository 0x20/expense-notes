import sys
from getpass import getpass
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models import AdminUser
from app.auth import get_password_hash
from app.crud import get_admin_user

def setup_admin():
    """Create admin user with password"""
    init_db()
    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = get_admin_user(db)
        if existing_admin:
            print("Admin user already exists!")
            response = input("Do you want to reset the password? (y/n): ")
            if response.lower() != 'y':
                return

            # Update password
            new_password = getpass("Enter new admin password: ")
            confirm_password = getpass("Confirm password: ")

            if new_password != confirm_password:
                print("Passwords don't match!")
                return

            existing_admin.password_hash = get_password_hash(new_password)
            db.commit()
            print("Admin password updated successfully!")
        else:
            # Create new admin
            password = getpass("Enter admin password: ")
            confirm_password = getpass("Confirm password: ")

            if password != confirm_password:
                print("Passwords don't match!")
                return

            password_hash = get_password_hash(password)
            admin = AdminUser(password_hash=password_hash)
            db.add(admin)
            db.commit()
            print("Admin user created successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    setup_admin()
