from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from time import perf_counter

from env_bootstrap import load_backend_env
from logging_config import configure_logging, get_logger

load_backend_env()

from routes import auth, practice, study
from routes import gesture
from routes import conversation
from routes import youtube
from services.supabase_store import get_store

configure_logging()
logger = get_logger("handspeak.main")

app = FastAPI(title="HandSpeak API", version="1.0.0")

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(practice.router)
app.include_router(study.router)
app.include_router(gesture.router)
app.include_router(conversation.router)
app.include_router(youtube.router)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = perf_counter()
    try:
        response = await call_next(request)
    except Exception as error:
        elapsed_ms = (perf_counter() - start) * 1000
        logger.exception(
            "request_failed method=%s path=%s ms=%.2f error=%s",
            request.method,
            request.url.path,
            elapsed_ms,
            type(error).__name__,
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    elapsed_ms = (perf_counter() - start) * 1000
    logger.info(
        "request method=%s path=%s status=%s ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.on_event("startup")
def warmup_gesture_models() -> None:
    try:
        get_store().ensure_schema()
    except Exception as error:
        logger.warning("database_not_ready error_type=%s error=%s", type(error).__name__, error)

    # Warm up each model independently so static and dynamic do not block each other.
    from services.static_gesture_service import start_static_service_warmup
    from services.gesture_recognition import start_dynamic_service_warmup

    static_started = start_static_service_warmup()
    dynamic_started = start_dynamic_service_warmup()
    logger.info("gesture_warmup_started static=%s dynamic=%s", static_started, dynamic_started)


@app.get("/")
def root():
    logger.info("root_health_check")
    return {"message": "HandSpeak API is running 🐠"}
