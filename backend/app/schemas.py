# -*- coding: utf-8 -*-
"""请求与响应的数据结构定义。"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    """创建生成任务的请求体。"""

    mode: str  # text / image / image_to_text
    prompt: str = ""
    image_base64: Optional[str] = None  # 图生文模式下的图片（data URL）


class TaskResponse(BaseModel):
    """任务信息。"""

    id: int
    mode: str
    prompt: str
    status: str
    result_text: Optional[str] = None
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime