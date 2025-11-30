from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

class ItemTags(BaseModel):
    slot: str
    type: str
    color_primary: str
    colors_secondary: List[str] = Field(default_factory=list)
    pattern: str
    material: str
    fit: str
    formality: str
    season: List[str]
    features: List[str] = Field(default_factory=list)
    brand_or_logo_visible: bool
    notes: str = ""

class UserSignup(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    username: str
    password: str
    profile_photo: Optional[str] = None  # Base64 encoded image

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    name: str
    username: str
    profile_photo_url: Optional[str]

class OutfitCreate(BaseModel):
    name: Optional[str] = None
    items: List[str]  # List of item IDs
    filters: Optional[dict] = None

class OutfitResponse(BaseModel):
    id: str
    name: Optional[str]
    items: List[dict]  # Full item objects
    filters: Optional[dict]
    created_at: str