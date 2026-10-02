from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.routes import router
from src.services.model import embed_fn_from_model, load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = load_model()
    app.state.model = model
    app.state.embed_fn = embed_fn_from_model(model)
    yield


app = FastAPI(
    title="Laya (Python)",
    version="0.1.0",
    description="Loads the Laya model and the question file named by predict's key, shortlists its questions, and returns answers. Swagger UI is at /docs.",
    lifespan=lifespan,
)

app.include_router(router)
