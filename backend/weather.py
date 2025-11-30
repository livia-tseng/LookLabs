import httpx
import os
from typing import Optional, Dict

# Using OpenWeatherMap API (free tier available)
# You can also use other free weather APIs
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_weather(location: str = "Los Angeles") -> Dict:
    """Get current weather for a location"""
    if not WEATHER_API_KEY:
        # Return mock weather data if no API key
        return {
            "location": location,
            "temperature": 72,
            "condition": "Sunny",
            "icon": "☀️",
            "description": "Clear sky",
            "mock": True
        }
    
    try:
        params = {
            "q": location,
            "appid": WEATHER_API_KEY,
            "units": "imperial"
        }
        response = httpx.get(WEATHER_API_URL, params=params, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            return {
                "location": location,
                "temperature": int(data["main"]["temp"]),
                "condition": data["weather"][0]["main"],
                "icon": get_weather_icon(data["weather"][0]["main"]),
                "description": data["weather"][0]["description"],
                "mock": False
            }
    except Exception as e:
        print(f"Weather API error: {e}")
    
    # Fallback to mock data
    return {
        "location": location,
        "temperature": 72,
        "condition": "Sunny",
        "icon": "☀️",
        "description": "Clear sky",
        "mock": True
    }

def get_weather_icon(condition: str) -> str:
    """Map weather condition to emoji icon"""
    icons = {
        "Clear": "☀️",
        "Clouds": "☁️",
        "Rain": "🌧️",
        "Drizzle": "🌦️",
        "Thunderstorm": "⛈️",
        "Snow": "❄️",
        "Mist": "🌫️",
        "Fog": "🌫️"
    }
    return icons.get(condition, "🌤️")

def get_season_colors() -> list:
    """Get popular colors for current season"""
    from datetime import datetime
    month = datetime.now().month
    
    # Determine season
    if month in [12, 1, 2]:  # Winter
        return ["#000000", "#FFFFFF", "#4A4A4A", "#8B4513", "#2F4F4F"]  # Black, White, Gray, Brown, Dark Slate
    elif month in [3, 4, 5]:  # Spring
        return ["#FFB6C1", "#98FB98", "#87CEEB", "#FFD700", "#FFA07A"]  # Pink, Light Green, Sky Blue, Gold, Light Salmon
    elif month in [6, 7, 8]:  # Summer
        return ["#FF6347", "#FFD700", "#00CED1", "#FF69B4", "#32CD32"]  # Tomato, Gold, Dark Turquoise, Hot Pink, Lime Green
    else:  # Fall
        return ["#8B4513", "#A0522D", "#CD853F", "#D2691E", "#B22222"]  # Saddle Brown, Sienna, Peru, Chocolate, Fire Brick

