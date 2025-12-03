import os, uuid, json
import random
import base64
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from PIL import Image

from backend.db import Base, engine, get_db
from backend.models import Item, User, Outfit
from backend.schemas import ItemTags, UserSignup, UserLogin, UserResponse, OutfitCreate, OutfitResponse
from backend.vision import tag_item, separate_clothing_items, tag_item_with_context
from backend.auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, get_current_user_optional
)
from backend.weather import get_weather, get_season_colors

# Ensure tables exist
Base.metadata.create_all(bind=engine)

STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="LookLabs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/auth/signup")
async def signup(
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    name: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    profile_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Sign up a new user"""
    try:
        # Validate email or phone provided
        if not email and not phone:
            raise HTTPException(status_code=400, detail="Either email or phone must be provided")
        
        # Check if username already exists
        if db.query(User).filter(User.username == username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Check if email already exists
        if email and db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if phone already exists
        if phone and db.query(User).filter(User.phone == phone).first():
            raise HTTPException(status_code=400, detail="Phone already registered")
        
        # Save profile photo if provided
        profile_photo_url = None
        if profile_photo:
            photo_id = str(uuid.uuid4())
            photo_path = os.path.join(STORAGE_DIR, f"profile_{photo_id}.jpg")
            try:
                im = Image.open(profile_photo.file).convert("RGB")
                im.thumbnail((200, 200))
                im.save(photo_path, "JPEG", quality=85)
                profile_photo_url = f"/images/profile_{photo_id}.jpg"
            except Exception as e:
                print(f"Error saving profile photo: {e}")
        
        # Create user
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=email,
            phone=phone,
            name=name,
            username=username,
            password_hash=get_password_hash(password),
            profile_photo_url=profile_photo_url
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "name": user.name,
                "username": user.username,
                "profile_photo_url": user.profile_photo_url
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/auth/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login user"""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "name": user.name,
            "username": user.username,
            "profile_photo_url": user.profile_photo_url
        }
    }

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "phone": current_user.phone,
        "name": current_user.name,
        "username": current_user.username,
        "profile_photo_url": current_user.profile_photo_url
    }

# ==================== WEATHER ENDPOINTS ====================

@app.get("/weather")
def get_weather_info():
    """Get current weather for Los Angeles"""
    return get_weather("Los Angeles")

@app.get("/season-colors")
def get_season_colors_endpoint():
    """Get popular colors for current season"""
    return {"colors": get_season_colors()}

# ==================== ITEM ENDPOINTS ====================

@app.post("/items")
async def create_item(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a single clothing item"""
    try:
        item_id = str(uuid.uuid4())
        img_path = os.path.join(STORAGE_DIR, f"{item_id}.jpg")

        try:
            im = Image.open(file.file).convert("RGB")
        finally:
            file.file.close()

        im.thumbnail((1024, 1024))
        im.save(img_path, "JPEG", quality=85)

        tags: ItemTags = tag_item(img_path)

        row = Item(
            id=item_id,
            user_id=current_user.id,
            image_url=f"/images/{item_id}.jpg",
            slot=tags.slot, type=tags.type, color_primary=tags.color_primary,
            colors_secondary=json.dumps(tags.colors_secondary),
            pattern=tags.pattern, material=tags.material, fit=tags.fit,
            formality=tags.formality, season=json.dumps(tags.season),
            features=json.dumps(tags.features),
            brand_or_logo_visible=1 if tags.brand_or_logo_visible else 0,
            notes=tags.notes,
        )
        db.add(row)
        db.commit()

        return {"id": item_id, "image_url": row.image_url, **tags.model_dump()}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating item: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload item: {str(e)}")

@app.post("/items/outfit")
async def create_items_from_outfit(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a photo of a person/outfit and automatically separate into individual items"""
    try:
        outfit_id = str(uuid.uuid4())
        img_path = os.path.join(STORAGE_DIR, f"outfit_{outfit_id}.jpg")

        try:
            im = Image.open(file.file).convert("RGB")
        finally:
            file.file.close()

        im.thumbnail((1024, 1024))
        im.save(img_path, "JPEG", quality=85)

        detected_items = separate_clothing_items(img_path)
        
        if not detected_items or len(detected_items) == 0:
            raise HTTPException(status_code=400, detail="No clothing items detected in the image. Please try a different photo.")
        
        created_items = []
        
        for idx, item_info in enumerate(detected_items):
            item_id = str(uuid.uuid4())
            item_img_path = os.path.join(STORAGE_DIR, f"{item_id}.jpg")
            
            im.save(item_img_path, "JPEG", quality=85)
            
            tags: ItemTags = tag_item_with_context(img_path, item_info)
            
            row = Item(
                id=item_id,
                user_id=current_user.id,
                image_url=f"/images/{item_id}.jpg",
                slot=tags.slot, type=tags.type, color_primary=tags.color_primary,
                colors_secondary=json.dumps(tags.colors_secondary),
                pattern=tags.pattern, material=tags.material, fit=tags.fit,
                formality=tags.formality, season=json.dumps(tags.season),
                features=json.dumps(tags.features),
                brand_or_logo_visible=1 if tags.brand_or_logo_visible else 0,
                notes=tags.notes,
            )
            db.add(row)
            
            created_items.append({
                "id": item_id,
                "image_url": row.image_url,
                "detected_info": item_info,
                **tags.model_dump()
            })
        
        db.commit()
        return {"items": created_items, "total": len(created_items)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating items from outfit: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload outfit: {str(e)}")

@app.get("/items")
def list_items(
    slot: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all items in user's closet, optionally filtered by slot"""
    query = db.query(Item).filter(Item.user_id == current_user.id)
    
    if slot:
        query = query.filter(Item.slot == slot)
    
    rows = query.order_by(Item.created_at.desc()).all()
    
    def to_json(r: Item):
        return {
            "id": r.id, "image_url": r.image_url,
            "slot": r.slot, "type": r.type, "color_primary": r.color_primary,
            "colors_secondary": json.loads(r.colors_secondary),
            "pattern": r.pattern, "material": r.material, "fit": r.fit,
            "formality": r.formality, "season": json.loads(r.season),
            "features": json.loads(r.features),
            "brand_or_logo_visible": bool(r.brand_or_logo_visible),
            "notes": r.notes, "created_at": str(r.created_at or "")
        }
    return [to_json(r) for r in rows]

@app.delete("/items/{item_id}")
def delete_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a clothing item"""
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == current_user.id).first()
    if not item:
        raise HTTPException(404, "item not found")
    
    img_filename = os.path.basename(item.image_url)
    img_path = os.path.join(STORAGE_DIR, img_filename)
    if os.path.exists(img_path):
        os.remove(img_path)
    
    db.delete(item)
    db.commit()
    return {"ok": True, "deleted_id": item_id}

# ==================== OUTFIT ENDPOINTS ====================

@app.get("/outfits/generate")
def generate_outfit(
    formality: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a random outfit from items in the closet"""
    # Start with all user's items
    query = db.query(Item).filter(Item.user_id == current_user.id)
    
    # Apply filters (case-insensitive matching for SQLite)
    if formality:
        query = query.filter(func.lower(Item.formality) == func.lower(formality))
    if color:
        query = query.filter(func.lower(Item.color_primary) == func.lower(color))
    
    all_items = query.all()
    
    # Filter by season if specified
    if season:
        filtered_items = []
        for item in all_items:
            try:
                item_seasons = json.loads(item.season)
                if isinstance(item_seasons, list) and season.lower() in [s.lower() for s in item_seasons]:
                    filtered_items.append(item)
            except:
                pass
        all_items = filtered_items
    
    # Check if we have any items after filtering
    if not all_items:
        raise HTTPException(
            status_code=404,
            detail=f"No items match your filters. You have {db.query(Item).filter(Item.user_id == current_user.id).count()} total items in your closet."
        )
    
    # Group items by slot
    items_by_slot = {}
    for item in all_items:
        slot_name = item.slot
        if slot_name not in items_by_slot:
            items_by_slot[slot_name] = []
        items_by_slot[slot_name].append({
            "id": item.id,
            "image_url": item.image_url,
            "slot": item.slot,
            "type": item.type,
            "color_primary": item.color_primary,
            "colors_secondary": json.loads(item.colors_secondary),
            "pattern": item.pattern,
            "material": item.material,
            "fit": item.fit,
            "formality": item.formality,
            "season": json.loads(item.season),
            "features": json.loads(item.features),
            "brand_or_logo_visible": bool(item.brand_or_logo_visible),
            "notes": item.notes,
        })
    
    # Build outfit - prioritize essential slots
    outfit = {}
    priority_slots = ["top", "bottom", "shoes", "outerwear", "accessory", "dress"]
    
    # Add one item from each priority slot if available
    for slot_name in priority_slots:
        if slot_name in items_by_slot and items_by_slot[slot_name]:
            outfit[slot_name] = random.choice(items_by_slot[slot_name])
    
    # Add any remaining slots
    for slot_name, items in items_by_slot.items():
        if slot_name not in outfit and items:
            outfit[slot_name] = random.choice(items)
    
    # Check if outfit is empty (shouldn't happen if all_items check passed, but just in case)
    if not outfit:
        raise HTTPException(
            status_code=404,
            detail="Could not generate outfit from available items. Please add more items to your closet."
        )
    
    return {
        "outfit": outfit,
        "slots_used": list(outfit.keys()),
        "total_items_available": len(all_items),
        "items_by_slot": {slot: len(items) for slot, items in items_by_slot.items()}
    }

@app.post("/outfits/save")
def save_outfit(
    outfit_data: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save an outfit"""
    outfit_id = str(uuid.uuid4())
    outfit = Outfit(
        id=outfit_id,
        user_id=current_user.id,
        name=outfit_data.name,
        items=json.dumps(outfit_data.items),
        filters=json.dumps(outfit_data.filters) if outfit_data.filters else None
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    
    return {"id": outfit_id, "message": "Outfit saved successfully"}

@app.get("/outfits")
def list_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all saved outfits for the user"""
    outfits = db.query(Outfit).filter(Outfit.user_id == current_user.id).order_by(Outfit.created_at.desc()).all()
    
    result = []
    for outfit in outfits:
        item_ids = json.loads(outfit.items)
        items = db.query(Item).filter(Item.id.in_(item_ids), Item.user_id == current_user.id).all()
        
        items_data = []
        for item in items:
            items_data.append({
                "id": item.id,
                "image_url": item.image_url,
                "slot": item.slot,
                "type": item.type,
                "color_primary": item.color_primary,
                "colors_secondary": json.loads(item.colors_secondary),
                "pattern": item.pattern,
                "material": item.material,
                "fit": item.fit,
                "formality": item.formality,
                "season": json.loads(item.season),
                "features": json.loads(item.features),
                "brand_or_logo_visible": bool(item.brand_or_logo_visible),
                "notes": item.notes,
            })
        
        result.append({
            "id": outfit.id,
            "name": outfit.name,
            "items": items_data,
            "filters": json.loads(outfit.filters) if outfit.filters else None,
            "created_at": str(outfit.created_at)
        })
    
    return result

@app.patch("/outfits/{outfit_id}")
async def update_outfit(
    outfit_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a saved outfit (currently only supports renaming)"""
    body = await request.json()
    name = body.get("name")
    
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id, Outfit.user_id == current_user.id).first()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    
    if name is not None:
        outfit.name = name
    
    db.commit()
    db.refresh(outfit)
    
    return {"ok": True, "id": outfit.id, "name": outfit.name}

@app.delete("/outfits/{outfit_id}")
def delete_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved outfit"""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id, Outfit.user_id == current_user.id).first()
    if not outfit:
        raise HTTPException(404, "outfit not found")
    
    db.delete(outfit)
    db.commit()
    return {"ok": True, "deleted_id": outfit_id}

# ==================== STATIC FILES ====================

@app.get("/images/{filename}")
def get_image(filename: str):
    path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "image not found")
    return FileResponse(path, media_type="image/jpeg")

@app.get("/healthz")
def health():
    return {"ok": True}

# Mount static files for frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_frontend():
    """Serve the frontend HTML"""
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    return {"message": "Frontend not found. Please create frontend/index.html"}
