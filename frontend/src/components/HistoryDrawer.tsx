import { useState } from 'react'
import { Button, Drawer, Empty, List, Tag, Tooltip } from 'antd'
import { HistoryOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import type { TaskRecord } from '../types'

const MODE_LABELS: Record<string, string> = {
  text: '文本生成',
  image: '图片生成',
  image_to_text: '图片理解',
  tts: '语音合成',
  asr: '语音识别',
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '排队中', color: 'default' },
  running: { text: '生成中', color: 'processing' },
  done: { text: '完成', color: 'success' },
  error: { text: '失败', color: 'error' },
}

interface Props {
  history: TaskRecord[]
  onSelect: (record: TaskRecord) => void
  onToggleFavorite: (id: number) => void
}

function HistoryDrawer({ history, onSelect, onToggleFavorite }: Props) {
  const [open, setOpen] = useState(false)
  const recent = history.slice(0, 10)

  return (
    <>
      <Button
        className="history-fab"
        type="primary"
        shape="circle"
        size="large"
        icon={<HistoryOutlined />}
        onClick={() => setOpen(true)}
      />
      <Drawer
        title="最近记录"
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
      >
        {recent.length === 0 ? (
          <Empty description="暂无历史记录" />
        ) : (
          <List
            dataSource={recent}
            renderItem={(item) => {
              const status = STATUS_LABELS[item.status] ?? { text: item.status, color: 'default' }
              return (
                <List.Item
                  className="history-item"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  actions={[
                    <Tooltip key="fav" title={item.is_favorite ? '取消收藏' : '收藏'}>
                      <Button
                        type="text"
                        size="small"
                        icon={item.is_favorite ? <StarFilled className="star-active" /> : <StarOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleFavorite(item.id)
                        }}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color="blue">{MODE_LABELS[item.mode] ?? item.mode}</Tag>
                        <Tag color={status.color}>{status.text}</Tag>
                      </span>
                    }
                    description={item.prompt}
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Drawer>
    </>
  )
}

export default HistoryDrawer