import { Alert, Image, Spin, Typography } from 'antd'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
}

function renderAssistant(message: ChatMessage) {
  if (message.status === 'error') {
    return <Alert type="error" message="生成失败" description={message.error} showIcon />
  }

  const loading = message.status === 'pending' || message.status === 'running'

  if (message.mode === 'image') {
    if (message.imageUrl) {
      return <Image src={message.imageUrl} alt="生成图片" className="msg-image" />
    }
    if (loading) {
      return (
        <div className="loading-box">
          <Spin />
          <span>图片生成中，通常需要数十秒...</span>
        </div>
      )
    }
    return <Typography.Text type="secondary">暂无图片</Typography.Text>
  }

  if (message.mode === 'tts') {
    if (message.audioUrl) {
      return <audio controls src={message.audioUrl} className="audio-player" />
    }
    if (loading) {
      return (
        <div className="loading-box">
          <Spin />
          <span>语音合成中...</span>
        </div>
      )
    }
    return <Typography.Text type="secondary">暂无音频</Typography.Text>
  }

  if (message.text) {
    return <Typography.Paragraph className="result-text">{message.text}</Typography.Paragraph>
  }
  if (loading) {
    return (
      <div className="loading-box">
        <Spin />
        <span>生成中...</span>
      </div>
    )
  }
  return <Typography.Text type="secondary">暂无结果</Typography.Text>
}

function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'msg-row is-user' : 'msg-row is-assistant'}>
      <div className={isUser ? 'msg-bubble msg-user' : 'msg-bubble msg-assistant'}>
        {isUser ? (
          <>
            {message.imageUrl && <Image src={message.imageUrl} className="msg-image" />}
            {message.audioUrl && <audio controls src={message.audioUrl} className="msg-audio" />}
            {message.text && <div className="msg-user-text">{message.text}</div>}
          </>
        ) : (
          renderAssistant(message)
        )}
      </div>
    </div>
  )
}

export default MessageBubble