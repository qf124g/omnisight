# -*- coding: utf-8 -*-
"""模型提供方抽象接口，业务层只依赖这里，不直接依赖具体 SDK。"""
from abc import ABC, abstractmethod
from typing import Generator


class BaseProvider(ABC):
    """多模态生成能力的统一抽象。"""

    @abstractmethod
    def generate_text(self, prompt: str) -> Generator[str, None, None]:
        """文生文：流式产出文本片段。"""

    @abstractmethod
    def text_to_image(self, prompt: str) -> str:
        """文生图：返回本地图片文件的绝对路径。"""

    @abstractmethod
    def image_to_text(self, image_local_path: str, prompt: str) -> str:
        """图生文：传入本地图片绝对路径，返回理解结果文本。"""

    @abstractmethod
    def text_to_speech(self, text: str) -> str:
        """文生语音：传入文本，返回本地音频文件的绝对路径。"""

    @abstractmethod
    def speech_to_text(self, audio_local_path: str, audio_format: str, sample_rate: int) -> str:
        """语音识别：传入本地音频绝对路径、格式与采样率，返回识别出的文本。"""