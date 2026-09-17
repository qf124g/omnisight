# -*- coding: utf-8 -*-
"""HTTP 接口层。"""
import base64
import json
import os
import queue
import uuid
from typing import Generator, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import config
from ..database import SessionLocal
from ..models import GenerationRecord
from ..providers.base import BaseProvider
from ..providers.dashscope_provider import DashScopeProvider
from ..schemas import GenerateRequest, TaskResponse
from ..services.event_bus import event_bus
from ..services.generation_service import GenerationService

router = APIRouter()

provider: BaseProvider = DashScopeProvider()
service = GenerationService(provider)


def get_db():
    """提供数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate", response_model=TaskResponse)
def generate(req: GenerateRequest) -> TaskResponse:
    """提交一个生成任务，立即返回任务 id，由后台线程异步处理。"""
    if req.mode not in ("text", "image", "image_to_text"):
        raise HTTPException(status_code=400, detail="不支持的生成类型")

    image_local_path = None
    if req.mode == "image_to_text":
        if not req.image_base64:
            raise HTTPException(status_code=400, detail="图片理解需要上传图片")
        image_local_path = _save_base64_image(req.image_base64)

    task_id = service.create_task(req.mode, req.prompt, image_local_path=image_local_path)
    return _to_task_response(task_id)


@router.get("/tasks", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db)) -> List[TaskResponse]:
    """返回生成历史，按时间倒序。"""
    records = (
        db.query(GenerationRecord)
        .order_by(GenerationRecord.id.desc())
        .limit(100)
        .all()
    )
    return [_record_to_response(r) for r in records]


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)) -> TaskResponse:
    """查询单个任务状态。"""
    record = db.get(GenerationRecord, task_id)
    if record is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _record_to_response(record)


@router.get("/tasks/{task_id}/stream")
def stream_task(task_id: int) -> StreamingResponse:
    """以 SSE 方式订阅任务进度与最终结果。"""
    return StreamingResponse(_sse_generator(task_id), media_type="text/event-stream")


def _sse_generator(task_id: int) -> Generator[str, None, None]:
    q = event_bus.subscribe(task_id)
    try:
        # 连接建立时先补发当前状态，避免任务已完成导致事件丢失
        db = SessionLocal()
        record = db.get(GenerationRecord, task_id)
        if record is not None:
            if record.status == "done":
                yield _sse({
                    "type": "done",
                    "result_text": record.result_text,
                    "result_url": record.result_url,
                })
                return
            if record.status == "error":
                yield _sse({"type": "error", "error": record.error})
                return
            yield _sse({"type": "status", "status": record.status})
        db.close()

        while True:
            try:
                event = q.get(timeout=15)
            except queue.Empty:
                yield ": keep-alive\n\n"
                continue
            yield _sse(event)
            if event.get("type") in ("done", "error"):
                break
    finally:
        event_bus.unsubscribe(task_id)


def _sse(event) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _save_base64_image(data_url: str) -> str:
    """把前端传来的 base64 data URL 保存为本地文件，返回绝对路径。"""
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    raw = base64.b64decode(data_url)
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    path = os.path.join(config.UPLOAD_DIR, f"{uuid.uuid4().hex}.png")
    with open(path, "wb") as f:
        f.write(raw)
    return path


def _record_to_response(r: GenerationRecord) -> TaskResponse:
    return TaskResponse(
        id=r.id,
        mode=r.mode,
        prompt=r.prompt,
        status=r.status,
        result_text=r.result_text,
        result_url=r.result_url,
        error=r.error,
        created_at=r.created_at,
    )


def _to_task_response(task_id: int) -> TaskResponse:
    db = SessionLocal()
    record = db.get(GenerationRecord, task_id)
    resp = _record_to_response(record)
    db.close()
    return resp