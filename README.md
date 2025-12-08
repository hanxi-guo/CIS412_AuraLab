# AuraLab

A social media content creation and management platform with AI-powered analysis and suggestions.

## Features

- **Campaign Management**: Create and manage social media campaigns
- **Post Editor**: Rich text editor with multi-platform preview (Instagram, Facebook, Twitter)
- **AI Analysis**: Get real-time feedback and suggestions for your content
- **Media Management**: Upload and manage images for your posts
- **Multi-Platform Support**: Preview how your content will look on different platforms

## Prerequisites

### Frontend
- Node.js 18+ and npm

### Backend
- Python 3.12+
- OpenAI API key (for AI analysis features)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CIS412_AuraLab
```

### 2. Frontend Setup

```bash
# Install dependencies
npm ci

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in the terminal).

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the repository root or `backend/` directory:

```bash
# Copy example (if available) or create new .env file
cp .env.example .env  # if .env.example exists
```

Add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

### 5. Run Backend Server

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate  # if not already activated

# Run the server
python3 -m uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`.

### 6. Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. The frontend will automatically connect to the backend API at `http://localhost:8000`

## Project Structure

```
CIS412_AuraLab/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── api.ts             # API client
│   └── types.ts           # TypeScript type definitions
├── backend/                # Backend FastAPI application
│   ├── app/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── models.py      # Database models
│   └── storage/           # Media files and database
└── public/                 # Static assets
```

## Development

### Frontend Commands

```bash
# Run development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Commands

```bash
# Run development server with auto-reload
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --reload --port 8000

# Run without reload (production-like)
python3 -m uvicorn app.main:app --port 8000
```

## Data Storage

- **Database**: SQLite database at `backend/storage/aura.db`
- **Media Files**: Stored in `backend/storage/media/{campaign_id}/`
- **Schema**: If you encounter schema errors, delete `backend/storage/aura.db` to recreate fresh tables

## API Configuration

The frontend connects to the backend API. The API base URL can be configured via environment variable:

```bash
# In your .env file or environment
VITE_API_BASE=http://localhost:8000/api
```

If not set, it defaults to `http://localhost:8000/api`.

## Known Issues & Fixes

### Image Carousel Bug Fix

**Issue**: When switching between images in the carousel, images would fail to load with `ERR_FILE_NOT_FOUND` errors.

**Root Cause**: The `useEffect` cleanup function was revoking blob URLs whenever the `imagePreviewUrls` array reference changed, even when just switching between images.

**Fix**: 
- Changed blob URL lifecycle management to only clean up on component unmount
- Added `useRef` to track all created blob URLs independently of React's render cycle
- Blob URLs are now only revoked when:
  1. An image is explicitly removed by the user
  2. The component is unmounted

This ensures blob URLs remain valid while navigating through the image carousel.

## Troubleshooting

### Backend Issues

**Schema Errors**: If you see database schema errors, delete `backend/storage/aura.db` to recreate the database with the current schema.

**AI Analysis Not Working**: Ensure your `OPENAI_API_KEY` is set correctly in the `.env` file. The AI analysis endpoints require a valid OpenAI API key.

**Port Already in Use**: If port 8000 is already in use, change it:
```bash
python3 -m uvicorn app.main:app --reload --port 8001
```
Then update `VITE_API_BASE` in your frontend environment.

### Frontend Issues

**Cannot Connect to Backend**: 
- Ensure the backend server is running on port 8000
- Check that `VITE_API_BASE` matches your backend URL
- Check browser console for CORS errors

**Images Not Loading**:
- Ensure backend is running and media files are accessible
- Check that uploaded files are within the size limit (10MB)
- Verify file permissions in `backend/storage/media/`


## License

MIT license
