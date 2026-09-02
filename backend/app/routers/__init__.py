from fastapi import APIRouter
from app.routers.auth import router as auth_router
from app.routers.predict import router as predict_router
from app.routers.admin import router as admin_router
from app.routers.dataset import router as dataset_router
from app.routers.routes import router as routes_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth_router)
api_router.include_router(predict_router)
api_router.include_router(admin_router)
api_router.include_router(dataset_router)
api_router.include_router(routes_router)
