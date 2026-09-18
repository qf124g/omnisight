// 示例：用 fetch + ReadableStream 流式上传音频，并用流式读取服务端响应。
// 与现有 api.ts 中 base64 一次性上传（先生成 /generate，再用 EventSource 订阅）的区别：
//   1. 请求体是 ReadableStream，音频分块发送，边读边传，可实时观察上传进度；
//   2. 响应体用 response.body.getReader() 手动按字节读取并解析，而非 EventSource。
// 本文件为演示用，未接入主流程。

export type StreamAudioEvent =
  | { type: 'progress'; received: number }
  | { type: 'done'; text: string }
  | { type: 'error'; error?: string }

interface StreamUploadOptions {
  audioBlob: Blob
  sampleRate: number
  onEvent: (e: StreamAudioEvent) => void
  signal?: AbortSignal
}

// 把音频 Blob 按固定大小切块，构造成可读流作为请求体。
function blobToChunkedStream(blob: Blob, chunkSize: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const source = blob.stream().getReader()
      try {
        while (true) {
          const { done, value } = await source.read()
          if (done) break
          // 再把 value 切成 chunkSize 大小的小块逐块 enqueue，便于观察上传进度
          for (let i = 0; i < value.length; i += chunkSize) {
            controller.enqueue(value.slice(i, i + chunkSize))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

// 解析 SSE 文本：按 "\n\n" 切帧，再取出 data: 字段并 JSON 解析。
function parseSseChunk(buffer: string): { events: StreamAudioEvent[]; rest: string } {
  const events: StreamAudioEvent[] = []
  let rest = buffer
  let idx = rest.indexOf('\n\n')
  while (idx !== -1) {
    const frame = rest.slice(0, idx)
    rest = rest.slice(idx + 2)
    const dataLine = frame.split('\n').find((line) => line.startsWith('data:'))
    if (dataLine) {
      try {
        events.push(JSON.parse(dataLine.slice(5).trim()) as StreamAudioEvent)
      } catch {
        // 忽略解析失败的帧
      }
    }
    idx = rest.indexOf('\n\n')
  }
  return { events, rest }
}

export async function streamUploadAudio({
  audioBlob,
  sampleRate,
  onEvent,
  signal,
}: StreamUploadOptions): Promise<void> {
  const stream = blobToChunkedStream(audioBlob, 64 * 1024)

  // duplex: 'half' 是关键：允许请求体是一个流，浏览器才会以 chunked 方式边读边发
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers: {
      'Content-Type': 'audio/wav',
      'X-Sample-Rate': String(sampleRate),
    },
    body: stream,
    duplex: 'half',
    signal,
  }

  const res = await fetch('/api/asr/stream-upload', init)
  if (!res.ok || !res.body) {
    throw new Error(`请求失败: ${res.status}`)
  }

  // 手动读取流式响应，逐字节解码并解析 SSE 事件
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunk(buffer)
    buffer = rest
    for (const event of events) onEvent(event)
  }
}