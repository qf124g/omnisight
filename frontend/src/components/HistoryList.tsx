import { useState } from 'react'
import { Button, Card, Col, Empty, Image, List, Row, Segmented, Tag, Tooltip } from 'antd'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import type { TaskRecord } from '../types'

const MODE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
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

function HistoryList({ history, onSelect, onToggleFavorite }: Props) {
  const [view, setView] = useState<'list' | 'gallery'>('list')
  const [onlyFavorite, setOnlyFavorite] = useState(false)

  const visible = onlyFavorite ? history.filter((r) => r.is_favorite) : history
  const mediaRecords = visible.filter((r) => r.status === 'done' && r.result_url)

  const renderFavorite = (item: TaskRecord) => (
    <Tooltip title={item.is_favorite ? '取消收藏' : '收藏'}>
      <Button
        type="text"
        size="small"
        icon={item.is_favorite ? <StarFilled className="star-active" /> : <StarOutlined />}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(item.id)
        }}
      />
    </Tooltip>
  )

  return (
    <Card
      title="历史记录"
      extra={
        <Button
          type={onlyFavorite ? 'primary' : 'default'}
          size="small"
          onClick={() => setOnlyFavorite(!onlyFavorite)}
        >
          只看收藏
        </Button>
      }
    >
      <div className="history-toolbar">
        <Segmented
          block
          options={[
            { label: '列表', value: 'list' },
            { label: '画廊', value: 'gallery' },
          ]}
          value={view}
          onChange={(value) => setView(value as 'list' | 'gallery')}
        />
      </div>

      {view === 'list' ? (
        visible.length === 0 ? (
          <Empty description="暂无历史记录" />
        ) : (
          <List
            dataSource={visible}
            renderItem={(item) => {
              const status = STATUS_LABELS[item.status] ?? { text: item.status, color: 'default' }
              return (
                <List.Item
                  className="history-item"
                  actions={[renderFavorite(item)]}
                  onClick={() => onSelect(item)}
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
        )
      ) : mediaRecords.length === 0 ? (
        <Empty description="暂无可展示的媒体结果" />
      ) : (
        <Row gutter={[12, 12]}>
          {mediaRecords.map((item) => (
            <Col key={item.id} xs={12} sm={8}>
              <div className="gallery-item">
                <div className="gallery-media-box" onClick={() => onSelect(item)}>
                  {item.mode === 'image' ? (
                    <Image src={item.result_url!} alt={item.prompt} className="gallery-media" />
                  ) : (
                    <audio controls src={item.result_url!} className="gallery-audio" />
                  )}
                </div>
                <div className="gallery-meta">
                  <Tag color="blue">{MODE_LABELS[item.mode] ?? item.mode}</Tag>
                  {renderFavorite(item)}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </Card>
  )
}

export default HistoryList