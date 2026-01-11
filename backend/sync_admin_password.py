#!/usr/bin/env python3
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import AdminUser
from app.auth import verify_password, get_password_hash

env_pwd = os.getenv('ADMIN_PASSWORD')
db_url = os.getenv('DATABASE_URL', 'sqlite:///./data/expense_notes.db')
engine = create_engine(db_url.replace('sqlite:///', 'sqlite:///'))
Session = sessionmaker(bind=engine)
db = Session()
admin = db.query(AdminUser).first()

if admin and env_pwd:
    if not verify_password(env_pwd, admin.password_hash):
        print('Mismatch! Updating...')
        admin.password_hash = get_password_hash(env_pwd)
        db.commit()
        print('✓ Updated')
    else:
        print('✓ Matches')
else:
    print('❌ Not found')
db.close()
