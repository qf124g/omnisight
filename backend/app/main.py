# -*- coding: utf-8 -*-
"""FastAPI 应用入口。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .api.routes import router
from .database import Base, engine

# 建表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="多模态生成工作台")

# 本地开发时前端通过 Vite 代理访问，CORS 兜底
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# 生成结果图片的静态访问
app.mount("/outputs", StaticFiles(directory=config.OUTPUT_DIR), name="outputs")