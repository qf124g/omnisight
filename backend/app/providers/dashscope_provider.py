# -*- coding: utf-8 -*-
"""基于阿里云百炼 DashScope 的模型提供方实现。"""
import os
import time
import uuid
import urllib.request
from http import HTTPStatus
from typing import Generator

import dashscope
from dashscope import Generation, ImageSynthesis, MultiModalConversation

from .. import config
from .base import BaseProvider


class DashScopeProvider(BaseProvider):
    """调用通义千问 / 万相 / 千问 VL 实现三类多模态能力。"""

    TEXT_MODEL = "qwen-plus"
    IMAGE_MODEL = "wanx-v1"
    VL_MODEL = "qwen-vl-plus"

    def __init__(self) -> None:
        dashscope.api_key = config.DASHSCOPE_API_KEY

    def generate_text(self, prompt: str) -> Generator[str, None, None]:
        """流式生成文本。"""
        responses = Generation.call(
            model=self.TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            result_format="message",
            stream=True,
            incremental_output=True,
        )
        for response in responses:
            if response.status_code == HTTPStatus.OK:
                chunk = response.output.choices[0].message.content
                if chunk:
                    yield chunk
            else:
                raise RuntimeError(f"文生文调用失败: {response.code} {response.message}")

    def text_to_image(self, prompt: str) -> str:
        """文生图：异步提交任务并轮询，成功后下载图片到本地目录。"""
        rsp = ImageSynthesis.async_call(
            model=self.IMAGE_MODEL,
            prompt=prompt,
            n=1,
            size="1024*1024",
        )
        if rsp.status_code != HTTPStatus.OK:
            raise RuntimeError(f"文生图提交失败: {rsp.code} {rsp.message}")

        task_id = rsp.output.task_id
        while True:
            result = ImageSynthesis.fetch(task=task_id)
            status = result.output.task_status
            if status == "SUCCEEDED":
                url = result.output.results[0].url
                return self._download_image(url)
            if status in ("FAILED", "CANCELED"):
                raise RuntimeError(f"文生图任务失败: {result.output.code} {result.output.message}")
            time.sleep(2)

    def image_to_text(self, image_local_path: str, prompt: str) -> str:
        """图生文：SDK 会自动上传本地文件并解析。"""
        messages = [
            {
                "role": "user",
                "content": [
                    {"image": f"file://{image_local_path}"},
                    {"text": prompt},
                ],
            }
        ]
        response = MultiModalConversation.call(model=self.VL_MODEL, messages=messages)
        if response.status_code == HTTPStatus.OK:
            return self._extract_vl_text(response.output.choices[0].message.content)
        raise RuntimeError(f"图生文调用失败: {response.code} {response.message}")

    @staticmethod
    def _extract_vl_text(content) -> str:
        """千问 VL 的 content 可能是字符串也可能是分段列表。"""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(item.get("text", "") for item in content if isinstance(item, dict))
        return str(content)

    @staticmethod
    def _download_image(url: str) -> str:
        """把云端图片下载到本地输出目录，返回绝对路径。"""
        os.makedirs(config.OUTPUT_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.png"
        local_path = os.path.join(config.OUTPUT_DIR, filename)
        urllib.request.urlretrieve(url, local_path)
        return local_path