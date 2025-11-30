from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)                 # UUID str
    email = Column(String, unique=True, nullable=True)   # Can be null if using phone
    phone = Column(String, unique=True, nullable=True)    # Can be null if using email
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    profile_photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"
    id = Column(String, primary_key=True)                 # UUID str
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_url = Column(String, nullable=False)

    slot = Column(String, nullable=False)
    type = Column(String, nullable=False)
    color_primary = Column(String, nullable=False)
    colors_secondary = Column(Text, nullable=False)       # JSON string
    pattern = Column(String, nullable=False)
    material = Column(String, nullable=False)
    fit = Column(String, nullable=False)
    formality = Column(String, nullable=False)
    season = Column(Text, nullable=False)                 # JSON string
    features = Column(Text, nullable=False)               # JSON string
    brand_or_logo_visible = Column(Integer, nullable=False)  # 0/1
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Outfit(Base):
    __tablename__ = "outfits"
    id = Column(String, primary_key=True)                 # UUID str
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)                  # Optional outfit name
    items = Column(Text, nullable=False)                  # JSON string of item IDs
    filters = Column(Text, nullable=True)                  # JSON string of filters used
    created_at = Column(DateTime(timezone=True), server_default=func.now())
