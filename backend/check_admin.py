#!/usr/bin/env python3
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import AdminUser

env_pwd = os.getenv('ADMIN_PASSWORD')
db_url = os.getenv('DATABASE_URL', 'sqlite:///./data/expense_notes.db')
engine = create_engine(db_url.replace('sqlite:///', 'sqlite:///'))
Session = sessionmaker(bind=engine)
db = Session()

print(f"ADMIN_PASSWORD env var: {'SET' if env_pwd else 'NOT SET'}")

admin = db.query(AdminUser).first()
print(f"Admin user in DB: {'EXISTS' if admin else 'NOT FOUND'}")

if admin:
    print(f"Admin ID: {admin.id}")
    print(f"Password hash: {admin.password_hash[:20]}...")

db.close()
