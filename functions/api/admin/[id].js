import { verifyAdmin } from './auth.js'
import { checkRateLimit, getClientIp } from '../rate-limit.js'

const KV_PREFIX = 'text:'

export async function onRequestGet(context) {
  const { env, params, request } = context
  const kv = env.KV
  const id = params.id

  if (!/^\d{5}$/.test(id)) {
    return Response.json({ error: '无效的文本 ID' }, { status: 400 })
  }

  const key = KV_PREFIX + id

  const admin = await verifyAdmin(request, kv)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

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

  return Response.json({
    id: record.id,
    content: record.content,
    createdAt: record.createdAt,
    expiryType: record.expiryType,
    expiryValue: record.expiryValue,
    expiryUnit: record.expiryUnit,
    expiresAt: record.expiresAt,
    maxViews: record.expiryType === 'count' ? record.expiryValue : null,
    currentViews: record.currentViews,
    isActive: record.isActive,
    encrypted: record.encrypted || false
  })
}

export async function onRequestDelete(context) {
  const { env, params, request } = context
  const kv = env.KV
  const id = params.id

  if (!/^\d{5}$/.test(id)) {
    return Response.json({ error: '无效的文本 ID' }, { status: 400 })
  }

  const key = KV_PREFIX + id

  const admin = await verifyAdmin(request, kv)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  const raw = await kv.get(key)
  if (!raw) {
    return Response.json({ error: '未找到该文本' }, { status: 404 })
  }

  await kv.delete(key)
  return Response.json({ success: true })
}
