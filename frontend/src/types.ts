export type Mode = 'text' | 'image' | 'image_to_text'

export type TaskStatus = 'pending' | 'running' | 'done' | 'error'

export interface TaskRecord {
  id: number
  mode: Mode
  prompt: string
  status: TaskStatus
  result_text?: string | null
  result_url?: string | null
  error?: string | null
  created_at: string
}