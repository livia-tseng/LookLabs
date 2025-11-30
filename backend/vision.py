import os
import base64
import json
from openai import OpenAI
from typing import List, Optional
from PIL import Image
from dotenv import load_dotenv
from .schemas import ItemTags

# Load environment variables
load_dotenv()

# Lazy client initialization
_client = None
USE_MOCK_MODE = os.getenv("USE_MOCK_MODE", "false").lower() == "true"

def get_client():
    """Get or create OpenAI client. Returns None if no API key is available (mock mode)."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None  # Will use mock mode instead
        _client = OpenAI(api_key=api_key)
    return _client

def generate_mock_tags(image_path: str, context: dict = None) -> ItemTags:
    """Generate mock clothing tags for demo/testing purposes"""
    import random
    
    # Simple mock based on filename or random
    slots = ["top", "bottom", "shoes", "outerwear", "accessory", "dress", "other"]
    types_map = {
        "top": ["t-shirt", "shirt", "blouse", "sweater", "hoodie"],
        "bottom": ["jeans", "pants", "shorts", "skirt"],
        "shoes": ["sneakers", "boots", "sandals", "heels"],
        "outerwear": ["jacket", "coat", "blazer"],
        "accessory": ["sunglasses", "hat", "bag", "watch"],
        "dress": ["dress", "gown"],
    }
    colors = ["black", "white", "blue", "red", "green", "yellow", "pink", "brown", "gray", "navy"]
    patterns = ["solid", "striped", "plaid", "polka dot", "floral", "geometric"]
    materials = ["cotton", "denim", "leather", "polyester", "wool", "silk"]
    fits = ["slim", "regular", "loose", "oversized", "fitted"]
    formalities = ["casual", "business casual", "formal", "sporty"]
    seasons = ["spring", "summer", "fall", "winter"]
    
    # Determine slot (try to guess from filename or context)
    slot = "other"
    if context and context.get("item_type"):
        item_type = context["item_type"].lower()
        if any(x in item_type for x in ["shirt", "top", "blouse", "sweater"]):
            slot = "top"
        elif any(x in item_type for x in ["pant", "jean", "short", "skirt"]):
            slot = "bottom"
        elif any(x in item_type for x in ["shoe", "boot", "sandal"]):
            slot = "shoes"
        elif any(x in item_type for x in ["jacket", "coat"]):
            slot = "outerwear"
        elif any(x in item_type for x in ["sunglass", "hat", "bag"]):
            slot = "accessory"
        elif "dress" in item_type:
            slot = "dress"
    
    # Use filename as hint if no context
    filename = os.path.basename(image_path).lower()
    if slot == "other":
        if any(x in filename for x in ["shirt", "tshirt", "top", "blouse", "sweater"]):
            slot = "top"
        elif any(x in filename for x in ["pant", "jean", "short"]):
            slot = "bottom"
        elif any(x in filename for x in ["shoe", "boot"]):
            slot = "shoes"
        elif any(x in filename for x in ["jacket", "coat"]):
            slot = "outerwear"
        elif any(x in filename for x in ["sunglass", "hat"]):
            slot = "accessory"
        else:
            slot = random.choice(slots[:3])  # Prefer common slots
    
    item_type = random.choice(types_map.get(slot, [context.get("item_type", "clothing") if context else "clothing"]))
    
    return ItemTags(
        slot=slot,
        type=item_type,
        color_primary=random.choice(colors),
        colors_secondary=[random.choice(colors) for _ in range(random.randint(0, 2))] if random.random() > 0.5 else [],
        pattern=random.choice(patterns),
        material=random.choice(materials),
        fit=random.choice(fits),
        formality=random.choice(formalities),
        season=random.sample(seasons, random.randint(1, 3)),
        features=random.sample(["long sleeve", "short sleeve", "pockets", "hood", "zipper"], random.randint(0, 2)) if random.random() > 0.5 else [],
        brand_or_logo_visible=random.random() > 0.7,
        notes="[MOCK MODE] This is demo data. Add your OpenAI API key for real AI analysis."
    )

def encode_image(image_path: str) -> str:
    """Encode image to base64 for OpenAI API"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def tag_item(image_path: str) -> ItemTags:
    """Analyze a single clothing item and return structured tags"""
    base64_image = encode_image(image_path)
    
    prompt = """Analyze this clothing item image and return a JSON object with the following structure:
{
  "slot": "one of: top, bottom, shoes, outerwear, accessory, dress, other",
  "type": "specific type (e.g., 't-shirt', 'jeans', 'sneakers', 'jacket', 'sunglasses')",
  "color_primary": "main color (e.g., 'black', 'white', 'blue', 'red')",
  "colors_secondary": ["array of secondary colors if any"],
  "pattern": "pattern type (e.g., 'solid', 'striped', 'plaid', 'polka dot', 'floral')",
  "material": "material (e.g., 'cotton', 'denim', 'leather', 'polyester', 'wool')",
  "fit": "fit style (e.g., 'slim', 'regular', 'loose', 'oversized', 'fitted')",
  "formality": "formality level (e.g., 'casual', 'business casual', 'formal', 'sporty')",
  "season": ["array of applicable seasons: 'spring', 'summer', 'fall', 'winter'"],
  "features": ["array of notable features like 'long sleeve', 'hood', 'pockets', etc."],
  "brand_or_logo_visible": true or false,
  "notes": "any additional relevant notes about the item"
}

Return ONLY valid JSON, no markdown formatting or additional text."""

    # Check if we should use mock mode
    client = get_client()
    if client is None or USE_MOCK_MODE:
        print("⚠️  Running in MOCK MODE - using demo data. Set OPENAI_API_KEY for real AI analysis.")
        return generate_mock_tags(image_path)

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        data = json.loads(content)
        
        return ItemTags(
            slot=data.get("slot", "other"),
            type=data.get("type", "unknown"),
            color_primary=data.get("color_primary", "unknown"),
            colors_secondary=data.get("colors_secondary", []),
            pattern=data.get("pattern", "solid"),
            material=data.get("material", "unknown"),
            fit=data.get("fit", "regular"),
            formality=data.get("formality", "casual"),
            season=data.get("season", []),
            features=data.get("features", []),
            brand_or_logo_visible=data.get("brand_or_logo_visible", False),
            notes=data.get("notes", "")
        )
    except Exception as e:
        # Return default tags on error
        print(f"Error analyzing image: {e}")
        return ItemTags(
            slot="other",
            type="unknown",
            color_primary="unknown",
            colors_secondary=[],
            pattern="solid",
            material="unknown",
            fit="regular",
            formality="casual",
            season=[],
            features=[],
            brand_or_logo_visible=False,
            notes=f"Error: {str(e)}"
        )

def separate_clothing_items(image_path: str) -> List[dict]:
    """Analyze a photo of a person/outfit and separate into individual clothing items"""
    base64_image = encode_image(image_path)
    
    prompt = """This image contains a person wearing clothing or multiple clothing items. 
Analyze the image and identify each distinct article of clothing visible.

For each clothing item, provide:
1. A description of where it appears in the image (e.g., "top left", "center", "person wearing")
2. The clothing item type

Return a JSON array of objects, each with:
{
  "description": "brief description of the item and its location in the image",
  "item_type": "type of clothing (e.g., 'shirt', 'pants', 'shoes', 'jacket')",
  "bbox_estimate": {
    "x_min": approximate left position (0-100),
    "y_min": approximate top position (0-100),
    "x_max": approximate right position (0-100),
    "y_max": approximate bottom position (0-100)
  }
}

If multiple distinct items are visible (like separate pieces on a rack), list them all.
If it's a person wearing an outfit, separate each visible clothing piece (top, bottom, shoes, accessories).

Return ONLY valid JSON array, no markdown formatting."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        items = json.loads(content)
        
        # For now, we'll treat each identified item as needing separate analysis
        # In a more advanced implementation, we could crop images based on bbox estimates
        return items if isinstance(items, list) else []
    except Exception as e:
        print(f"Error separating clothing items: {e}")
        return [{
            "description": "full image",
            "item_type": "unknown",
            "bbox_estimate": {"x_min": 0, "y_min": 0, "x_max": 100, "y_max": 100}
        }]

def tag_item_with_context(image_path: str, item_context: dict) -> ItemTags:
    """Analyze a specific clothing item from an outfit image using context"""
    base64_image = encode_image(image_path)
    
    description = item_context.get("description", "")
    item_type = item_context.get("item_type", "unknown")
    
    prompt = f"""This image contains a person wearing clothing or multiple clothing items. 
Focus specifically on this item: {description} (appears to be: {item_type}).

Analyze ONLY this specific clothing item and return a JSON object with the following structure:
{{
  "slot": "one of: top, bottom, shoes, outerwear, accessory, dress, other",
  "type": "specific type (e.g., 't-shirt', 'jeans', 'sneakers', 'jacket', 'sunglasses')",
  "color_primary": "main color (e.g., 'black', 'white', 'blue', 'red')",
  "colors_secondary": ["array of secondary colors if any"],
  "pattern": "pattern type (e.g., 'solid', 'striped', 'plaid', 'polka dot', 'floral')",
  "material": "material (e.g., 'cotton', 'denim', 'leather', 'polyester', 'wool')",
  "fit": "fit style (e.g., 'slim', 'regular', 'loose', 'oversized', 'fitted')",
  "formality": "formality level (e.g., 'casual', 'business casual', 'formal', 'sporty')",
  "season": ["array of applicable seasons: 'spring', 'summer', 'fall', 'winter'"],
  "features": ["array of notable features like 'long sleeve', 'hood', 'pockets', etc."],
  "brand_or_logo_visible": true or false,
  "notes": "any additional relevant notes about the item"
}}

Return ONLY valid JSON, no markdown formatting or additional text."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        data = json.loads(content)
        
        return ItemTags(
            slot=data.get("slot", "other"),
            type=data.get("type", item_type),
            color_primary=data.get("color_primary", "unknown"),
            colors_secondary=data.get("colors_secondary", []),
            pattern=data.get("pattern", "solid"),
            material=data.get("material", "unknown"),
            fit=data.get("fit", "regular"),
            formality=data.get("formality", "casual"),
            season=data.get("season", []),
            features=data.get("features", []),
            brand_or_logo_visible=data.get("brand_or_logo_visible", False),
            notes=data.get("notes", "")
        )
    except Exception as e:
        print(f"Error analyzing item with context: {e}")
        # Fallback to regular tagging
        return tag_item(image_path)

