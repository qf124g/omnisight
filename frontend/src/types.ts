export type Mode = 'text' | 'image' | 'image_to_text' | 'tts' | 'asr'

export type TaskStatus = 'pending' | 'running' | 'done' | 'error'

export interface TaskRecord {
  id: number
  mode: Mode
  prompt: string
  status: TaskStatus
  result_text?: string | null
  result_url?: string | null
  error?: string | null
  is_favorite: boolean
  created_at: string
}