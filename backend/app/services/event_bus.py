# -*- coding: utf-8 -*-
"""进程内的任务事件总线，用于向后端 SSE 推送任务进度与结果。"""
import queue
from typing import Any, Dict


class EventBus:
    """每个任务维护一个阻塞队列，SSE 连接从队列中读取事件。"""

    def __init__(self) -> None:
        self._queues: Dict[int, "queue.Queue[Any]"] = {}

    def subscribe(self, task_id: int) -> "queue.Queue[Any]":
        return self._queues.setdefault(task_id, queue.Queue())

    def publish(self, task_id: int, event: Dict[str, Any]) -> None:
        q = self._queues.get(task_id)
        if q is not None:
            q.put(event)

    def unsubscribe(self, task_id: int) -> None:
        self._queues.pop(task_id, None)


event_bus = EventBus()