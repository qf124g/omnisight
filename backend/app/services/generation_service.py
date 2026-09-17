# -*- coding: utf-8 -*-
"""生成任务的业务编排：创建记录、后台执行、状态流转与结果落库。"""
import os
import threading
from typing import List, Optional

from ..database import SessionLocal
from ..models import GenerationRecord
from ..providers.base import BaseProvider
from .event_bus import event_bus


class GenerationService:
    """统一封装文生文、文生图、图生文三类生成任务。"""

    def __init__(self, provider: BaseProvider) -> None:
        self._provider = provider

    def create_task(
        self,
        mode: str,
        prompt: str,
        image_local_path: Optional[str] = None,
        audio_local_path: Optional[str] = None,
        audio_format: str = "wav",
        sample_rate: Optional[int] = None,
        language_hints: Optional[List[str]] = None,
    ) -> int:
        """创建任务记录并启动后台线程执行，返回任务 id。"""
        db = SessionLocal()
        record = GenerationRecord(mode=mode, prompt=prompt, status="pending")
        db.add(record)
        db.commit()
        task_id = record.id
        db.close()

        thread = threading.Thread(
            target=self._run,
            args=(task_id, mode, prompt, image_local_path, audio_local_path, audio_format, sample_rate, language_hints),
            daemon=True,
        )
        thread.start()
        return task_id

    def _run(
        self,
        task_id: int,
        mode: str,
        prompt: str,
        image_local_path: Optional[str],
        audio_local_path: Optional[str],
        audio_format: str,
        sample_rate: Optional[int],
        language_hints: Optional[List[str]],
    ) -> None:
        db = SessionLocal()
        record = db.get(GenerationRecord, task_id)
        record.status = "running"
        db.commit()

        try:
            if mode == "text":
                self._run_text(db, record, prompt)
            elif mode == "image":
                self._run_image(db, record, prompt)
            elif mode == "image_to_text":
                self._run_image_to_text(db, record, image_local_path or "", prompt)
            elif mode == "tts":
                self._run_tts(db, record, prompt)
            elif mode == "asr":
                self._run_asr(db, record, audio_local_path or "", audio_format, sample_rate, language_hints)
        except Exception as exc:  # noqa: BLE001
            record.status = "error"
            record.error = str(exc)
            db.commit()
            event_bus.publish(task_id, {"type": "error", "error": str(exc)})
        finally:
            db.close()

    def _run_text(self, db, record: GenerationRecord, prompt: str) -> None:
        parts = []
        for chunk in self._provider.generate_text(prompt):
            parts.append(chunk)
            event_bus.publish(record.id, {"type": "delta", "text": chunk})
        record.result_text = "".join(parts)
        record.status = "done"
        db.commit()
        event_bus.publish(record.id, {"type": "done", "result_text": record.result_text})

    def _run_image(self, db, record: GenerationRecord, prompt: str) -> None:
        local_path = self._provider.text_to_image(prompt)
        filename = os.path.basename(local_path)
        record.result_url = f"/outputs/{filename}"
        record.status = "done"
        db.commit()
        event_bus.publish(record.id, {"type": "done", "result_url": record.result_url})

    def _run_image_to_text(self, db, record: GenerationRecord, image_local_path: str, prompt: str) -> None:
        result = self._provider.image_to_text(image_local_path, prompt)
        record.result_text = result
        record.status = "done"
        db.commit()
        event_bus.publish(record.id, {"type": "done", "result_text": result})

    def _run_tts(self, db, record: GenerationRecord, prompt: str) -> None:
        local_path = self._provider.text_to_speech(prompt)
        filename = os.path.basename(local_path)
        record.result_url = f"/outputs/{filename}"
        record.status = "done"
        db.commit()
        event_bus.publish(record.id, {"type": "done", "result_url": record.result_url})

    def _run_asr(self, db, record: GenerationRecord, audio_local_path: str, audio_format: str, sample_rate: int, language_hints: Optional[List[str]]) -> None:
        result = self._provider.speech_to_text(audio_local_path, audio_format, sample_rate, language_hints)
        record.result_text = result
        record.status = "done"
        db.commit()
        event_bus.publish(record.id, {"type": "done", "result_text": result})