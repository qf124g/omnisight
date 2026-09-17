import { useState } from 'react'
import { Button, Card, Input, Segmented, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { Mode } from '../types'

const MODES: { label: string; value: Mode }[] = [
  { label: '文本生成', value: 'text' },
  { label: '图片生成', value: 'image' },
  { label: '图片理解', value: 'image_to_text' },
]

const PLACEHOLDER: Record<Mode, string> = {
  text: '输入你的问题或需求，例如：写一段关于秋天的散文',
  image: '描述你想生成的画面，例如：一只坐在窗边的橘猫，阳光洒落',
  image_to_text: '输入你想了解图片的问题，例如：这张图里有什么？',
}

interface Props {
  mode: Mode
  prompt: string
  loading: boolean
  onModeChange: (mode: Mode) => void
  onPromptChange: (prompt: string) => void
  onImageBase64Change: (dataUrl: string | null) => void
  onGenerate: () => void
}

function InputPanel({
  mode,
  prompt,
  loading,
  onModeChange,
  onPromptChange,
  onImageBase64Change,
  onGenerate,
}: Props) {
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleUploadChange = ({ fileList: list }: { fileList: UploadFile[] }) => {
    const latest = list.slice(-1)
    setFileList(latest)
    const file = latest[0]
    if (file && file.originFileObj) {
      const reader = new FileReader()
      reader.onload = () => onImageBase64Change(reader.result as string)
      reader.readAsDataURL(file.originFileObj)
    }
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
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUploadChange}
            listType="picture"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽图片到此处</p>
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