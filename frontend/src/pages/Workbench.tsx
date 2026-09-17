import { useCallback, useEffect, useRef, useState } from 'react'
import { Col, Row } from 'antd'
import InputPanel from '../components/InputPanel'
import ResultPanel from '../components/ResultPanel'
import HistoryList from '../components/HistoryList'
import { generate, listTasks, streamTask, toggleFavorite } from '../api'
import type { Mode, TaskRecord } from '../types'

interface ActiveTask {
  taskId: number
  status: string
  resultText: string
  resultUrl: string
  error: string
  done: boolean
}

function Workbench() {
  const [mode, setMode] = useState<Mode>('text')
  const [prompt, setPrompt] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [audioSampleRate, setAudioSampleRate] = useState<number | null>(null)
  const [language, setLanguage] = useState('auto')
  const [active, setActive] = useState<ActiveTask | null>(null)
  const [history, setHistory] = useState<TaskRecord[]>([])
  const stopRef = useRef<(() => void) | null>(null)

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

  const loading = active !== null && !active.done && active.status !== 'error'

  const onGenerate = async () => {
    if (!prompt.trim() && mode !== 'asr') return
    if (mode === 'image_to_text' && !imageBase64) return
    if (mode === 'asr' && !audioBase64) return
    if (mode === 'asr' && !audioSampleRate) return

    stopRef.current?.()
    const languageHints = mode === 'asr' && language !== 'auto' ? [language] : undefined

    try {
      const task = await generate(mode, prompt, imageBase64 ?? undefined, audioBase64 ?? undefined, audioSampleRate ?? undefined, languageHints)
      setActive({
        taskId: task.id,
        status: 'pending',
        resultText: '',
        resultUrl: '',
        error: '',
        done: false,
      })

      const stop = streamTask(task.id, (event) => {
        console.log('streamTask', event)
        setActive((prev) => {
          if (!prev || prev.taskId !== task.id) return prev
          switch (event.type) {
            case 'status':
              return { ...prev, status: event.status }
            case 'delta':
              return { ...prev, resultText: prev.resultText + event.text }
            case 'done':
              return {
                ...prev,
                status: 'done',
                resultText: event.result_text ?? prev.resultText,
                resultUrl: event.result_url ?? prev.resultUrl,
                done: true,
              }
            case 'error':
              return { ...prev, status: 'error', error: event.error ?? '生成失败', done: true }
            default:
              return prev
          }
        })
      })
      stopRef.current = stop
    } catch (err) {
      setActive({
        taskId: 0,
        status: 'error',
        resultText: '',
        resultUrl: '',
        error: err instanceof Error ? err.message : '生成失败',
        done: true,
      })
    }
  }

  useEffect(() => {
    if (active?.done) {
      refreshHistory()
    }
  }, [active?.done, refreshHistory])

  const onSelectHistory = (item: TaskRecord) => {
    setActive({
      taskId: item.id,
      status: item.status,
      resultText: item.result_text ?? '',
      resultUrl: item.result_url ?? '',
      error: item.error ?? '',
      done: item.status === 'done' || item.status === 'error',
    })
    setMode(item.mode)
  }

  const onToggleFavorite = async (id: number) => {
    await toggleFavorite(id)
    refreshHistory()
  }

  const onModeChange = (m: Mode) => {
    setMode(m)
    setActive(null)
    setImageBase64(null)
    setAudioBase64(null)
    setAudioSampleRate(null)
    setLanguage('auto')
  }

  return (
    <Row gutter={16}>
      <Col xs={24} lg={12}>
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
        <div className="gap-box" />
        <ResultPanel mode={mode} active={active} />
      </Col>
      <Col xs={24} lg={12}>
        <HistoryList history={history} onSelect={onSelectHistory} onToggleFavorite={onToggleFavorite} />
      </Col>
    </Row>
  )
}

export default Workbench