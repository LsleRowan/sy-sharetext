import { verifyAdmin } from '../admin/auth.js'
import { checkRateLimit, getClientIp } from '../rate-limit.js'

const KV_PREFIX = 'text:'

function formatTime(ms) {
  if (ms <= 0) return '已过期'
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} 天`
  if (hours > 0) return `${hours} 小时`
  if (minutes > 0) return `${minutes} 分钟`
  return '不到 1 分钟'
}

export async function onRequestGet(context) {
  const { env, params, request } = context
  const kv = env.KV
  const token = params.token

  if (!/^[a-zA-Z0-9]{6}$/.test(token)) {
    return Response.json({ error: '无效的链接 Token' }, { status: 400 })
  }

  const key = KV_PREFIX + token

  const ip = getClientIp(request)
  if (!(await checkRateLimit(kv, ip, 'fetch'))) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  const raw = await kv.get(key)
  if (!raw) {
    return Response.json({ error: '未找到该文本' }, { status: 404 })
  }

  let record
  try {
    record = JSON.parse(raw)
  } catch {
    return Response.json({ error: '数据损坏' }, { status: 500 })
  }

  if (!record.isActive) {
    return Response.json({ error: '该文本已失效' }, { status: 410 })
  }

  if (record.expiresAt && Date.now() > record.expiresAt) {
    record.isActive = false
    await kv.put(key, JSON.stringify(record), { expirationTtl: 86400 })
    return Response.json({ error: '该文本已失效' }, { status: 410 })
  }

  if (record.expiryType === 'count' && record.currentViews >= record.expiryValue) {
    record.isActive = false
    await kv.put(key, JSON.stringify(record), { expirationTtl: 86400 })
    return Response.json({ error: '该文本已失效' }, { status: 410 })
  }

  const admin = await verifyAdmin(request, kv)

  if (!admin) {
    record.currentViews++

    if (record.expiryType === 'count' && record.currentViews >= record.expiryValue) {
      record.isActive = false
    }

    await kv.put(key, JSON.stringify(record))
  }

  const expiry = record.expiryType === 'count'
    ? `${Math.max(0, record.expiryValue - record.currentViews)} 次`
    : formatTime(record.expiresAt - Date.now())

  return Response.json({
    id: record.id,
    content: record.content,
    encrypted: record.encrypted || false,
    expiry
  })
}
