from __future__ import annotations
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .logging_setup import setup_logging
from .db.database import init_db
from .api.routes import router as api_router
from .rate_limit import limiter

setup_logging()
logger = logging.getLogger("skillbridge.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("SkillBridge AI backend ready (env=%s)", get_settings().app_env)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SkillBridge AI",
        description="Resume → Skill Gap → Roadmap, powered by Gemini.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RateLimitExceeded)
    async def _ratelimit(request: Request, exc: RateLimitExceeded):
        return JSONResponse(status_code=429, content={"error": "rate_limited", "detail": str(exc)})

    app.include_router(api_router)

    @app.get("/")
    def root() -> dict:
        return {"app": "SkillBridge AI", "status": "running", "docs": "/docs"}

    return app


app = create_app()
