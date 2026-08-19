"""FastAPI 入口：中间件链（CORS → 访问日志 → 异常处理），路由注册，静态上传目录。"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.exception import register_exception_handlers
from routers import auth, cms, files, public

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="TP 全屋家居 API",
    version="0.1.0",
    description="前台展示 + 后台管理统一 API（公开 /api/public，受保护 /api/* Bearer）",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(cms.router)
app.include_router(files.router)

# 本地存储文件静态暴露（Nginx 生产同规则）
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health", tags=["system"])
def api_health():
    from core.response import ok
    return ok({"status": "up", "version": app.version})
