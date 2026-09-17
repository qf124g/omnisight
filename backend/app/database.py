# -*- coding: utf-8 -*-
"""数据库连接与会话管理。"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config

# SQLite 数据库文件与文件目录必须提前存在
for _dir in (config.DATA_DIR, config.OUTPUT_DIR, config.UPLOAD_DIR):
    os.makedirs(_dir, exist_ok=True)

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """ORM 基类。"""