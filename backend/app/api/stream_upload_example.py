# -*- coding: utf-8 -*-
"""fetch 流式上传音频的示例后端接口。

演示如何用 FastAPI 流式读取请求体（request.stream()），
并在读取的同时向前端回传进度事件（SSE）。
注意：本文件为独立示例，未挂载到主路由，按需在 main.py 中 include_router 即可。
"""
import json
import os
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from .. import config

router = APIRouter()


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/asr/stream-upload")
async def stream_upload_audio(request: Request) -> StreamingResponse:
    """流式接收音频字节，边收边回传进度，最后返回总字节数。"""

    sample_rate = request.headers.get("X-Sample-Rate", "16000")

    async def gen():
        chunks = []
        total = 0
        # request.stream() 会在请求体分块到达时逐个产出，实现真正的流式读取
        async for chunk in request.stream():
            chunks.append(chunk)
            total += len(chunk)
            yield _sse({"type": "progress", "received": total})

        audio_bytes = b"".join(chunks)
        # 实际项目中可在这里调用 ASR 识别，此处仅示例保存并回传结果
        os.makedirs(config.UPLOAD_DIR, exist_ok=True)
        path = os.path.join(config.UPLOAD_DIR, f"{uuid.uuid4().hex}.wav")
        with open(path, "wb") as f:
            f.write(audio_bytes)

        yield _sse({"type": "done", "text": f"已接收 {total} 字节音频，采样率 {sample_rate}"})

    return StreamingResponse(gen(), media_type="text/event-stream")