#!/usr/bin/env python3
"""Reset database with new schema"""
import os
from backend.db import Base, engine
from backend.models import User, Item, Outfit

db_file = 'closet.db'
if os.path.exists(db_file):
    os.remove(db_file)
    print('✓ Old database removed')

Base.metadata.create_all(bind=engine)
print('✓ New database created with updated schema (includes user_id column)')

