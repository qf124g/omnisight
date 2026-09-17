# -*- coding: utf-8 -*-
"""全局配置。"""
import os

from dotenv import load_dotenv

load_dotenv()

# 百炼 API Key，模型提供方会从该值读取
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")

# 项目根目录（backend/）与数据目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(DATA_DIR, "outputs")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")

# SQLite 数据库连接地址
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"