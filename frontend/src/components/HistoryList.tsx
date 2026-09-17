import { Card, Empty, List, Tag } from 'antd'
import type { TaskRecord } from '../types'

const MODE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  image_to_text: '图片理解',
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
}

function HistoryList({ history, onSelect }: Props) {
  return (
    <Card title="历史记录">
      {history.length === 0 ? (
        <Empty description="暂无历史记录" />
      ) : (
        <List
          dataSource={history}
          renderItem={(item) => {
            const status = STATUS_LABELS[item.status] ?? { text: item.status, color: 'default' }
            return (
              <List.Item className="history-item" onClick={() => onSelect(item)}>
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
    </Card>
  )
}

export default HistoryList