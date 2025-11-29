"""Runtime configuration for backend CRUD service."""
import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

# Load environment variables from the nearest .env (repo root or backend/.env)
load_dotenv(find_dotenv())


BASE_DIR = Path(__file__).resolve().parent.parent

# SQLite file path
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'storage' / 'aura.db'}")

# Media storage root
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "storage" / "media"))

# Server settings
DEFAULT_PORT = int(os.getenv("PORT", "8000"))

# Validation limits
TITLE_MAX = 120
CAPTION_MAX = 4000
BRIEF_MAX = 2000
CAMPAIGN_NAME_MAX = 80
BRAND_VOICE_MAX = 8
BRAND_VOICE_TAG_MAX_LEN = 32
MEDIA_MAX_PER_POST = 5
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
