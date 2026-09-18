import { useEffect, useState, type ReactNode } from 'react'
import { Button, Dropdown, Input, Select, Upload, message } from 'antd'
import {
  AppstoreOutlined,
  AudioOutlined,
  CloseOutlined,
  EyeOutlined,
  FileTextOutlined,
  PictureOutlined,
  SendOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { Mode } from '../types'

const MODES: { label: string; value: Mode; icon: ReactNode }[] = [
  { label: '文本生成', value: 'text', icon: <FileTextOutlined /> },
  { label: '图片生成', value: 'image', icon: <PictureOutlined /> },
  { label: '图片理解', value: 'image_to_text', icon: <EyeOutlined /> },
  { label: '语音合成', value: 'tts', icon: <SoundOutlined /> },
  { label: '语音识别', value: 'asr', icon: <AudioOutlined /> },
]

const ASR_LANGUAGES: { label: string; value: string }[] = [
  { label: '自动识别', value: 'auto' },
  { label: '中文', value: 'zh' },
  { label: '英语', value: 'en' },
  { label: '日语', value: 'ja' },
  { label: '韩语', value: 'ko' },
  { label: '粤语', value: 'yue' },
  { label: '德语', value: 'de' },
  { label: '法语', value: 'fr' },
  { label: '俄语', value: 'ru' },
]

const PLACEHOLDER: Record<Mode, string> = {
  text: '输入你的问题或需求，例如：写一段关于秋天的散文',
  image: '描述你想生成的画面，例如：一只坐在窗边的橘猫，阳光洒落',
  image_to_text: '输入你想了解图片的问题，例如：这张图里有什么？',
  tts: '输入要合成语音的文本，例如：你好，欢迎使用多模态工作台',
  asr: '上传音频后点击发送，可输入提示语（可选）',
}

// 将解码后的音频统一编码为 16-bit PCM 单声道 WAV，避免识别服务无法解码高采样率或高位深音频
function encodeWav(buffer: AudioBuffer): Blob {
  const channels = 1
  const sampleRate = buffer.sampleRate
  const frameCount = buffer.length
  const bytesPerSample = 2
  const dataSize = frameCount * channels * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData = buffer.getChannelData(0)
  let offset = 44
  for (let i = 0; i < frameCount; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([view], { type: 'audio/wav' })
}

interface Props {
  mode: Mode
  prompt: string
  loading: boolean
  onModeChange: (mode: Mode) => void
  onPromptChange: (prompt: string) => void
  onImageBase64Change: (dataUrl: string | null) => void
  onAudioBase64Change: (dataUrl: string | null) => void
  onAudioSampleRateChange: (rate: number | null) => void
  language: string
  onLanguageChange: (lang: string) => void
  onGenerate: () => void
}

function InputPanel({
  mode,
  prompt,
  loading,
  onModeChange,
  onPromptChange,
  onImageBase64Change,
  onAudioBase64Change,
  onAudioSampleRateChange,
  language,
  onLanguageChange,
  onGenerate,
}: Props) {
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([])
  const [audioFileList, setAudioFileList] = useState<UploadFile[]>([])

  // 切换模式时清空已上传附件
  useEffect(() => {
    setImageFileList([])
    setAudioFileList([])
  }, [mode])

  const handleImageChange = ({ fileList: list }: { fileList: UploadFile[] }) => {
    const latest = list.slice(-1)
    setImageFileList(latest)
    const file = latest[0]
    if (file && file.originFileObj) {
      const reader = new FileReader()
      reader.onload = () => onImageBase64Change(reader.result as string)
      reader.readAsDataURL(file.originFileObj)
    }
  }

  const handleAudioChange = async ({ fileList: list }: { fileList: UploadFile[] }) => {
    const latest = list.slice(-1)
    setAudioFileList(latest)
    const file = latest[0]
    if (!file || !file.originFileObj) {
      onAudioBase64Change(null)
      onAudioSampleRateChange(null)
      return
    }

    try {
      const arrayBuffer = await file.originFileObj.arrayBuffer()

      // 解码原始音频
      const decodeContext = new AudioContext()
      const decoded = await decodeContext.decodeAudioData(arrayBuffer)
      await decodeContext.close()

      // 统一重采样为 16kHz 单声道，避免 24-bit、44.1kHz 等多声道音频无法识别
      const sampleRate = 16000
      const offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(decoded.duration * sampleRate),
        sampleRate,
      )
      const source = offlineContext.createBufferSource()
      source.buffer = decoded
      source.connect(offlineContext.destination)
      source.start()
      const rendered = await offlineContext.startRendering()

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('音频编码失败'))
        reader.readAsDataURL(encodeWav(rendered))
      })

      onAudioBase64Change(dataUrl)
      onAudioSampleRateChange(sampleRate)
    } catch {
      onAudioBase64Change(null)
      onAudioSampleRateChange(null)
      message.error('音频解码失败，请确认上传的是有效音频文件')
    }
  }

  const handleRemoveImage = () => {
    setImageFileList([])
    onImageBase64Change(null)
  }

  const handleRemoveAudio = () => {
    setAudioFileList([])
    onAudioBase64Change(null)
    onAudioSampleRateChange(null)
  }

  const showImageAttachment = mode === 'image_to_text' && Boolean(imageFileList[0])
  const showAudioAttachment = mode === 'asr' && Boolean(audioFileList[0])

  return (
    <div className="chat-input-area">
      <div className="chat-input-box">
        {(showImageAttachment || showAudioAttachment) && (
          <div className="chat-attachments">
            {showImageAttachment && (
              <span className="chat-attachment">
                <PictureOutlined className="chat-attachment-icon" />
                <span className="chat-attachment-name">{imageFileList[0]?.name}</span>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={handleRemoveImage} />
              </span>
            )}
            {showAudioAttachment && (
              <span className="chat-attachment">
                <AudioOutlined className="chat-attachment-icon" />
                <span className="chat-attachment-name">{audioFileList[0]?.name}</span>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={handleRemoveAudio} />
              </span>
            )}
          </div>
        )}
        <Input.TextArea
          className="chat-textarea"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={PLACEHOLDER[mode]}
          autoSize={{ minRows: 2, maxRows: 8 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              onGenerate()
            }
          }}
        />
        <div className="chat-input-actions">
          <Dropdown
            trigger={['click']}
            menu={{
              items: MODES.map((m) => ({ key: m.value, icon: m.icon, label: m.label })),
              selectedKeys: [mode],
              onClick: ({ key }) => onModeChange(key as Mode),
            }}
          >
            <Button type="text" icon={<AppstoreOutlined />} title="选择模式" />
          </Dropdown>
          {mode === 'image_to_text' && (
            <Upload
              accept="image/*"
              maxCount={1}
              fileList={imageFileList}
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleImageChange}
            >
              <Button type="text" icon={<PictureOutlined />} disabled={loading} />
            </Upload>
          )}
          {mode === 'asr' && (
            <Upload
              accept="audio/*"
              maxCount={1}
              fileList={audioFileList}
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleAudioChange}
            >
              <Button type="text" icon={<AudioOutlined />} disabled={loading} />
            </Upload>
          )}
          {mode === 'asr' && (
            <Select
              className="chat-lang-select"
              size="small"
              value={language}
              onChange={onLanguageChange}
              options={ASR_LANGUAGES}
            />
          )}
          <Button
            className="chat-send"
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={onGenerate}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default InputPanel