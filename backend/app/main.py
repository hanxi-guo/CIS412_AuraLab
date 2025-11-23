"""FastAPI application entrypoint."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import DEFAULT_PORT, MEDIA_ROOT
from .deps import init_db
from .routes import campaigns, posts


def create_app() -> FastAPI:
    """Build and configure the FastAPI app."""
    application = FastAPI(title="AuraLab Backend", version="0.1.0")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    application.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

    application.include_router(campaigns.router)
    application.include_router(posts.router)

    @application.on_event("startup")
    def on_startup() -> None:
        """Initialize database tables on startup."""
        init_db()

    return application


app = create_app()


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=DEFAULT_PORT, reload=True)
