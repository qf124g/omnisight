import type { Mode, TaskRecord } from './types'

export async function generate(
  mode: Mode,
  prompt: string,
  imageBase64?: string,
): Promise<TaskRecord> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, prompt, image_base64: imageBase64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.detail || `请求失败: ${res.status}`)
  }
  return res.json()
}

export async function listTasks(): Promise<TaskRecord[]> {
  const res = await fetch('/api/tasks')
  return res.json()
}

export type StreamEvent =
  | { type: 'status'; status: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; result_text?: string; result_url?: string }
  | { type: 'error'; error?: string }

// 订阅任务进度，返回一个取消订阅的函数
export function streamTask(taskId: number, onEvent: (e: StreamEvent) => void): () => void {
  const es = new EventSource(`/api/tasks/${taskId}/stream`)
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as StreamEvent)
    } catch {
      // 忽略无法解析的消息
    }
  }
  return () => es.close()
}