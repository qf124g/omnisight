# 多模态生成工作台

一个 React + Python 的多模态 AI 生成产品，面向个人本地使用。通过统一的输入框与模式选择，完成文本生成、图片生成、图片理解、语音合成、语音识别等多种任务，并提供历史记录、画廊与收藏。

## 功能特性

| 模式 | 能力 | 底层模型 |
| ---- | ---- | ---- |
| 文本生成 | 聊天 / 写作 / 问答（流式输出） | qwen-plus |
| 图片生成 | 文生图 | wanx-v1 |
| 图片理解 | 对上传的图片提问 | qwen-vl-plus |
| 语音合成 (TTS) | 文本转语音，输出 mp3 | cosyvoice-v3-flash |
| 语音识别 (ASR) | 音频转文本，支持中文 / 英语 / 日语 / 韩语 / 粤语 / 德语 / 法语 / 俄语 | paraformer-realtime-v2 |

其他能力：

- 历史记录：列表视图与画廊视图切换，支持「只看收藏」
- 收藏：对任意历史记录加星标
- 音频上传自动归一化为 16kHz 单声道 16-bit PCM WAV，避免编码 / 采样率不兼容

## 技术栈

- 前端：Vite + React 18 + TypeScript + Ant Design 5
- 后端：FastAPI + SQLAlchemy + SQLite
- 模型：阿里云百炼 DashScope（云 API）

## 目录结构

```
multi-mode/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/             # 路由（生成、任务、收藏）
│   │   ├── providers/       # 模型适配层（DashScope 实现）
│   │   ├── services/        # 任务调度与事件总线（SSE 流式）
│   │   ├── config.py        # 配置
│   │   ├── models.py        # 数据库模型
│   │   └── schemas.py       # 请求 / 响应结构
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React 前端
│   └── src/
│       ├── components/      # 输入、结果、历史等组件
│       ├── pages/           # 工作台页面
│       ├── api.ts           # 接口封装
│       └── types.ts         # 类型定义
├── docs/                    # 实现详解文档
└── README.md
```

## 快速开始

### 1. 后端

```bash
cd backend

# 创建虚拟环境并安装依赖
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 配置 API Key
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY（申请地址：https://bailian.console.aliyun.com/）

# 启动（默认 8000 端口）
uvicorn app.main:app --reload
```

### 2. 前端

```bash
cd frontend

npm install
npm run dev
```

打开 http://localhost:5173 即可使用。前端开发服务器通过 Vite 代理将 `/api` 与 `/outputs` 转发到后端的 `http://localhost:8000`。

## 数据存储

- 数据库：`backend/data/app.db`（SQLite，任务与收藏状态）
- 生成结果：`backend/data/outputs/`（图片、音频）
- 上传文件：`backend/data/uploads/`

以上数据目录已在 `.gitignore` 中排除。

## 相关文档

- [后端实现详解](docs/后端实现详解.md)
- [前端实现详解](docs/前端实现详解.md)
- [Python 模块导入与类的引用机制](docs/Python模块导入与类的引用机制.md)