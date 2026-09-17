import { useState } from 'react'
import { Button, Card, Input, Segmented, Upload } from 'antd'
import { AudioOutlined, InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { Mode } from '../types'

const MODES: { label: string; value: Mode }[] = [
  { label: '文本生成', value: 'text' },
  { label: '图片生成', value: 'image' },
  { label: '图片理解', value: 'image_to_text' },
  { label: '语音合成', value: 'tts' },
  { label: '语音识别', value: 'asr' },
]

const PLACEHOLDER: Record<Mode, string> = {
  text: '输入你的问题或需求，例如：写一段关于秋天的散文',
  image: '描述你想生成的画面，例如：一只坐在窗边的橘猫，阳光洒落',
  image_to_text: '输入你想了解图片的问题，例如：这张图里有什么？',
  tts: '输入要合成语音的文本，例如：你好，欢迎使用多模态工作台',
  asr: '上传音频后点击生成，可输入提示语（可选）',
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
  onGenerate,
}: Props) {
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([])
  const [audioFileList, setAudioFileList] = useState<UploadFile[]>([])

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

  const handleAudioChange = ({ fileList: list }: { fileList: UploadFile[] }) => {
    const latest = list.slice(-1)
    setAudioFileList(latest)
    const file = latest[0]
    if (!file || !file.originFileObj) {
      onAudioBase64Change(null)
      onAudioSampleRateChange(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => onAudioBase64Change(reader.result as string)
    reader.readAsDataURL(file.originFileObj)

    // 用浏览器解码音频拿到真实采样率，供后端语音识别使用
    const audioContext = new AudioContext()
    file.originFileObj
      .arrayBuffer()
      .then((buffer) => audioContext.decodeAudioData(buffer))
      .then((decoded) => onAudioSampleRateChange(decoded.sampleRate))
      .catch(() => onAudioSampleRateChange(null))
      .finally(() => audioContext.close())
  }

  return (
    <Card title="创作">
      <div className="workbench-form">
        <Segmented
          block
          options={MODES}
          value={mode}
          onChange={(value) => onModeChange(value as Mode)}
        />

        {mode === 'image_to_text' && (
          <Upload.Dragger
            maxCount={1}
            fileList={imageFileList}
            beforeUpload={() => false}
            onChange={handleImageChange}
            listType="picture"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽图片到此处</p>
          </Upload.Dragger>
        )}

        {mode === 'asr' && (
          <Upload.Dragger
            maxCount={1}
            fileList={audioFileList}
            beforeUpload={() => false}
            onChange={handleAudioChange}
            accept="audio/*"
          >
            <p className="ant-upload-drag-icon">
              <AudioOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽音频到此处（支持 wav/mp3 等）</p>
          </Upload.Dragger>
        )}

        <Input.TextArea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={PLACEHOLDER[mode]}
          autoSize={{ minRows: 4, maxRows: 10 }}
        />

        <Button block type="primary" onClick={onGenerate} loading={loading}>
          生成
        </Button>
      </div>
    </Card>
  )
}

export default InputPanel