# LookLabs - AI-Powered Outfit Generator

A web application that uses AI to analyze clothing items, manage a digital closet, and generate random outfits based on filters.

## Features

- 📸 **Photo Upload**: Upload single clothing items or photos of people/outfits
- 🤖 **AI Analysis**: Automatically analyzes clothing items using OpenAI's GPT-4 Vision API
  - Detects clothing type, color, pattern, material, fit, formality, season, and more
  - Separates multiple items from a single outfit photo
- 👗 **Digital Closet**: View and manage all your clothing items in one place
  - Filter by type, color, and other attributes
  - Delete unwanted items
- 🎲 **Outfit Generator**: Randomly generate outfits from your closet
  - Apply filters by formality, season, and color
  - Visual mannequin display of generated outfits

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: SQLite (via SQLAlchemy)
- **AI**: OpenAI GPT-4 Vision API
- **Image Processing**: Pillow (PIL)

## Setup

### Prerequisites

- Python 3.8+
- OpenAI API key (optional - app can run in demo mode without it)

### Installation

1. Clone the repository:
```bash
cd LookLabs
```

2. Create and activate a virtual environment (recommended):
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory (optional):
```bash
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///./closet.db
STORAGE_DIR=./storage
```

**Note**: The app can run in **demo mode** without an API key! It will use mock data for testing. See `GET_API_KEY.md` for instructions on getting an OpenAI API key for real AI analysis.

4. Create the storage directory:
```bash
mkdir -p storage
```

### Running the Application

**Option 1: Use the provided script (recommended)**
```bash
./run.sh
```

**Option 2: Manual startup**

1. Activate the virtual environment (if not already active):
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Start the FastAPI server:
```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Usage

### Adding Items to Your Closet

1. **Single Item**: 
   - Go to the "Upload" tab
   - Click "Choose File" under "Single Item"
   - Select a photo of a single piece of clothing
   - Review the preview and click "Upload & Analyze"
   - The AI will analyze the item and add it to your closet

2. **Outfit/Person Photo**:
   - Go to the "Upload" tab
   - Click "Choose File" under "Outfit / Person"
   - Select a photo of someone wearing clothes or multiple items
   - The AI will automatically detect and separate each clothing item
   - Each item will be analyzed and added to your closet separately

### Viewing Your Closet

- Go to the "My Closet" tab
- Use the filters to narrow down items by:
  - Type (top, bottom, shoes, etc.)
  - Color
- Click "Delete" on any item to remove it from your closet

### Generating Outfits

1. Go to the "Generate Outfit" tab
2. (Optional) Apply filters:
   - **Formality**: Casual, Business Casual, Formal, Sporty
   - **Season**: Spring, Summer, Fall, Winter
   - **Primary Color**: Filter items by their main color
3. Click "Generate Outfit"
4. View the generated outfit on the mannequin and in the item list below
5. Click "Generate Another" to create a new random outfit

## API Endpoints

### Items

- `POST /items` - Upload a single clothing item
- `POST /items/outfit` - Upload a photo with multiple items/person
- `GET /items` - List all items in the closet
- `DELETE /items/{item_id}` - Delete a specific item

### Images

- `GET /images/{filename}` - Retrieve stored clothing images

### Outfits

- `POST /outfits/generate?formality=...&season=...&color=...` - Generate a random outfit

## Project Structure

```
LookLabs/
├── backend/
│   ├── app.py          # FastAPI application and routes
│   ├── models.py       # SQLAlchemy database models
│   ├── schemas.py      # Pydantic schemas
│   ├── db.py           # Database configuration
│   └── vision.py       # OpenAI API integration for image analysis
├── frontend/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styling
│   └── app.js          # Frontend JavaScript
├── storage/            # Directory for uploaded images
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## How It Works

1. **Image Analysis**: When you upload a photo, it's sent to OpenAI's GPT-4 Vision API which analyzes the clothing item(s) and extracts structured attributes:
   - Slot (top, bottom, shoes, etc.)
   - Type, color, pattern, material
   - Fit, formality level
   - Applicable seasons
   - Additional features

2. **Closet Storage**: Each analyzed item is stored in a SQLite database with all its attributes and a reference to the stored image file.

3. **Outfit Generation**: When generating an outfit, the app:
   - Filters items based on your criteria
   - Groups items by slot (top, bottom, shoes, etc.)
   - Randomly selects one item from each slot
   - Displays the complete outfit on a visual mannequin

## Notes

- The AI may take a few seconds to analyze each image
- Large images are automatically resized to 1024x1024 for performance
- Images are stored in the `storage/` directory
- The database file (`closet.db`) is created automatically on first run

## Future Enhancements

- Image cropping for individual items from outfit photos
- Outfit saving and favorites
- Style recommendations based on color theory
- Integration with shopping APIs
- Mobile app version

## License

MIT License

## Credits

Built with FastAPI, OpenAI GPT-4 Vision, and modern web technologies.