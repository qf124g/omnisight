import { useCallback, useEffect, useRef, useState } from 'react'
import { Typography } from 'antd'
import InputPanel from '../components/InputPanel'
import MessageBubble from '../components/MessageBubble'
import HistoryDrawer from '../components/HistoryDrawer'
import { generate, listTasks, streamTask, toggleFavorite } from '../api'
import type { ChatMessage, Mode, TaskRecord, TaskStatus } from '../types'

function Workbench() {
  const [mode, setMode] = useState<Mode>('text')
  const [prompt, setPrompt] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [audioSampleRate, setAudioSampleRate] = useState<number | null>(null)
  const [language, setLanguage] = useState('auto')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<TaskRecord[]>([])
  const stopRef = useRef<(() => void) | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const refreshHistory = useCallback(async () => {
    const tasks = await listTasks()
    setHistory(tasks)
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    return () => stopRef.current?.()
  }, [])

  // 仅当用户停留在底部附近时才自动滚动，避免上滚后被强制拉回底部
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 80) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const completedCount = messages.filter(
    (m) => m.role === 'assistant' && (m.status === 'done' || m.status === 'error'),
  ).length

  useEffect(() => {
    if (completedCount > 0) refreshHistory()
  }, [completedCount, refreshHistory])

  const loading = messages.some(
    (m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'running'),
  )

  const onGenerate = async () => {
    if (loading) return
    if (!prompt.trim() && mode !== 'asr') return
    if (mode === 'image_to_text' && !imageBase64) return
    if (mode === 'asr' && (!audioBase64 || !audioSampleRate)) return

    const languageHints = mode === 'asr' && language !== 'auto' ? [language] : undefined
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      mode,
      text: prompt,
      imageUrl: mode === 'image_to_text' ? imageBase64 ?? undefined : undefined,
      audioUrl: mode === 'asr' ? audioBase64 ?? undefined : undefined,
    }
    setMessages((prev) => [...prev, userMsg])
    setPrompt('')

    try {
      const task = await generate(
        mode,
        prompt,
        imageBase64 ?? undefined,
        audioBase64 ?? undefined,
        audioSampleRate ?? undefined,
        languageHints,
      )
      const assistantId = `a-${task.id}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', mode, text: '', status: 'pending' },
      ])
      const stop = streamTask(task.id, (event) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m
            switch (event.type) {
              case 'status':
                return { ...m, status: event.status as TaskStatus }
              case 'delta':
                return { ...m, text: m.text + event.text }
              case 'done': {
                const next: ChatMessage = { ...m, status: 'done', text: event.result_text ?? m.text }
                if (m.mode === 'image') next.imageUrl = event.result_url ?? m.imageUrl
                if (m.mode === 'tts') next.audioUrl = event.result_url ?? m.audioUrl
                return next
              }
              case 'error':
                return { ...m, status: 'error', error: event.error ?? '生成失败' }
              default:
                return m
            }
          }),
        )
      })
      stopRef.current = stop
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          mode,
          text: '',
          status: 'error',
          error: err instanceof Error ? err.message : '生成失败',
        },
      ])
    }
  }

  const onSelectHistory = (item: TaskRecord) => {
    setMessages((prev) => [
      ...prev,
      { id: `hu-${item.id}`, role: 'user', mode: item.mode, text: item.prompt },
      {
        id: `ha-${item.id}`,
        role: 'assistant',
        mode: item.mode,
        text: item.result_text ?? '',
        status: item.status,
        error: item.error ?? undefined,
        imageUrl: item.mode === 'image' ? item.result_url ?? undefined : undefined,
        audioUrl: item.mode === 'tts' ? item.result_url ?? undefined : undefined,
      },
    ])
  }

  const onToggleFavorite = async (id: number) => {
    await toggleFavorite(id)
    refreshHistory()
  }

  const onModeChange = (m: Mode) => {
    setMode(m)
    setImageBase64(null)
    setAudioBase64(null)
    setAudioSampleRate(null)
    setLanguage('auto')
  }

  return (
    <div className="chat-container">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Typography.Title level={4}>多模态生成工作台</Typography.Title>
            <Typography.Text type="secondary">在下方选择模式并输入内容开始创作</Typography.Text>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
      <InputPanel
        mode={mode}
        prompt={prompt}
        loading={loading}
        onModeChange={onModeChange}
        onPromptChange={setPrompt}
        onImageBase64Change={setImageBase64}
        onAudioBase64Change={setAudioBase64}
        onAudioSampleRateChange={setAudioSampleRate}
        language={language}
        onLanguageChange={setLanguage}
        onGenerate={onGenerate}
      />
      {/* <HistoryDrawer history={history} onSelect={onSelectHistory} onToggleFavorite={onToggleFavorite} /> */}
    </div>
  )
}

export default Workbench