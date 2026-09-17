import { Alert, Card, Empty, Image, Spin, Typography } from 'antd'
import type { Mode } from '../types'

interface ActiveTask {
  taskId: number
  status: string
  resultText: string
  resultUrl: string
  error: string
  done: boolean
}

interface Props {
  mode: Mode
  active: ActiveTask | null
}

function ResultPanel({ mode, active }: Props) {
  const renderContent = () => {
    if (!active) {
      return <Empty description="暂无结果，输入内容后点击生成" />
    }

    if (active.status === 'error') {
      return <Alert type="error" message="生成失败" description={active.error} showIcon />
    }

    const loading = !active.done && active.status !== 'error'

    if (mode === 'image') {
      if (active.resultUrl) {
        return <Image src={active.resultUrl} alt="生成图片" />
      }
      if (loading) {
        return (
          <div className="loading-box">
            <Spin />
            <span>图片生成中，通常需要数十秒...</span>
          </div>
        )
      }
      return <Empty description="暂无图片" />
    }

    if (mode === 'tts') {
      if (active.resultUrl) {
        return <audio controls src={active.resultUrl} className="audio-player" />
      }
      if (loading) {
        return (
          <div className="loading-box">
            <Spin />
            <span>语音合成中...</span>
          </div>
        )
      }
      return <Empty description="暂无音频" />
    }

    if (active.resultText) {
      return (
        <Typography.Paragraph className="result-text">
          {active.resultText}
        </Typography.Paragraph>
      )
    }

    if (loading) {
      return (
        <div className="loading-box">
          <Spin />
          <span>生成中...</span>
        </div>
      )
    }

    return <Empty description="暂无结果" />
  }

  return <Card title="结果">{renderContent()}</Card>
}

export default ResultPanel