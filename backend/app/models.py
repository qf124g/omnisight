# -*- coding: utf-8 -*-
"""数据库模型。"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from .database import Base


class GenerationRecord(Base):
    """一次生成任务的历史记录。"""

    __tablename__ = "generation_records"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String(32), nullable=False)  # text / image / image_to_text / tts / asr
    prompt = Column(Text, nullable=False, default="")
    status = Column(String(16), nullable=False, default="pending")  # pending / running / done / error
    result_text = Column(Text, nullable=True)   # 文生文、图生文、语音识别的结果文本
    result_url = Column(String(512), nullable=True)  # 文生图、语音合成的媒体访问路径
    error = Column(Text, nullable=True)
    is_favorite = Column(Boolean, nullable=False, default=False)  # 是否收藏
    created_at = Column(DateTime, default=datetime.now)