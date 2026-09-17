import { Layout, Typography } from 'antd'
import { ThunderboltFilled } from '@ant-design/icons'
import Workbench from './pages/Workbench'

const { Header, Content } = Layout

function App() {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <ThunderboltFilled />
        </div>
        <Typography.Title level={4} className="app-title">
          多模态生成工作台
        </Typography.Title>
      </Header>
      <Content className="app-content">
        <Workbench />
      </Content>
    </Layout>
  )
}

export default App