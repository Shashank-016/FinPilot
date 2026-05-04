import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Base, engine
from app.routes.assistant_routes import router as assistant_router
from app.routes.cashflow_routes import router as cashflow_router
from app.routes.goal_routes import router as goal_router
from app.routes.health_routes import router as health_router
from app.routes.insight_routes import router as insight_router
from app.routes.transaction_routes import router as transaction_router
from app.routes.user_routes import router as user_router

logger = logging.getLogger(__name__)

app = FastAPI(title="AI Financial Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("Incoming request: %s", request.url)
    return await call_next(request)


app.include_router(transaction_router)
app.include_router(user_router)
app.include_router(goal_router)
app.include_router(insight_router)
app.include_router(cashflow_router)
app.include_router(assistant_router)
app.include_router(health_router)
