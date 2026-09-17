# -*- coding: utf-8 -*-
"""请求与响应的数据结构定义。"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    """创建生成任务的请求体。"""

    mode: str  # text / image / image_to_text / tts / asr
    prompt: str = ""
    image_base64: Optional[str] = None  # 图生文模式下的图片（data URL）
    audio_base64: Optional[str] = None  # 语音识别模式下的音频（data URL）
    sample_rate: Optional[int] = None  # 语音识别音频的采样率（Hz），由前端解码音频获得
    language_hints: Optional[List[str]] = None  # 语音识别的语种提示，如 ["zh","en"]


class TaskResponse(BaseModel):
    """任务信息。"""

    id: int
    mode: str
    prompt: str
    status: str
    result_text: Optional[str] = None
    result_url: Optional[str] = None
    error: Optional[str] = None
    is_favorite: bool = False
    created_at: datetime