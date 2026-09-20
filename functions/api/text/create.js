import { checkRateLimit, getClientIp } from '../rate-limit.js'

function generateId() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const num = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0
  return String(10000 + (num % 90000))
}

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let token = ''
  for (let i = 0; i < 6; i++) {
    token += chars[bytes[i] % chars.length]
  }
  return token
}

const MAX_CONTENT_LENGTH = 1400000

function calculateExpiresAt(expiryValue, expiryUnit) {
  if (expiryUnit === 'count') return null
  const now = Date.now()
  switch (expiryUnit) {
    case 'day': return now + expiryValue * 86400000
    case 'hour': return now + expiryValue * 3600000
    case 'minute': return now + expiryValue * 60000
    default: return null
  }
}

export async function onRequestPost(context) {
  const { env, request } = context
  const kv = env.KV

  const ip = getClientIp(request)
  if (!(await checkRateLimit(kv, ip, 'create'))) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  const settingsRaw = await kv.get('admin:settings')
  let settings = { sitePassword: false }
  if (settingsRaw) {
    try { settings = JSON.parse(settingsRaw) } catch {}
  }

  if (settings.sitePassword) {
    const cookieHeader = request.headers.get('Cookie')
    const cookieToken = cookieHeader?.match(/site_password=([^;]+)/)?.[1]
    if (!cookieToken || cookieToken.length === 0) {
      return Response.json({ error: '站点密码验证失败' }, { status: 403 })
    }
    const sessionRecord = await kv.get(`site_password:session:${cookieToken}`)
    if (!sessionRecord) {
      return Response.json({ error: '站点密码验证失败' }, { status: 403 })
    }
    try {
      const { expiresAt } = JSON.parse(sessionRecord)
      if (Date.now() >= expiresAt) {
        return Response.json({ error: '站点密码验证失败' }, { status: 403 })
      }
    } catch {
      return Response.json({ error: '站点密码验证失败' }, { status: 403 })
    }
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { content, expiryValue = 1, expiryUnit = 'day', mode = 'id', encrypted = false } = body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return Response.json({ error: '文本内容不能为空' }, { status: 400 })
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return Response.json({ error: '文本内容过长' }, { status: 400 })
  }

  if (!['day', 'hour', 'minute', 'count'].includes(expiryUnit)) {
    return Response.json({ error: '无效的有效期单位' }, { status: 400 })
  }

  const numValue = parseInt(expiryValue)
  if (isNaN(numValue) || numValue < 1) {
    return Response.json({ error: '有效期数值无效' }, { status: 400 })
  }

  if (expiryUnit === 'day' && numValue > 30) {
    return Response.json({ error: '天数最多 30 天' }, { status: 400 })
  }
  if (expiryUnit === 'hour' && numValue > 720) {
    return Response.json({ error: '小时数最多 720（即 30 天）' }, { status: 400 })
  }
  if (expiryUnit === 'minute' && numValue > 43200) {
    return Response.json({ error: '分钟数最多 43200（即 30 天）' }, { status: 400 })
  }

  if (!['id', 'link'].includes(mode)) {
    return Response.json({ error: '无效的分享模式' }, { status: 400 })
  }

  if (encrypted === true && mode !== 'link') {
    return Response.json({ error: '加密模式仅支持分享链接' }, { status: 400 })
  }

  let identifier = null

  if (mode === 'id') {
    for (let i = 0; i < 10; i++) {
      const candidate = generateId()
      const existing = await kv.get(`text:${candidate}`)
      if (!existing) {
        identifier = candidate
        break
      }
    }
    if (!identifier) {
      return Response.json({ error: '生成 ID 失败，请重试' }, { status: 500 })
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const candidate = generateToken()
      const existing = await kv.get(`text:${candidate}`)
      if (!existing) {
        identifier = candidate
        break
      }
    }
    if (!identifier) {
      return Response.json({ error: '生成 Token 失败，请重试' }, { status: 500 })
    }
  }

  const record = {
    id: identifier,
    content: content.trim(),
    createdAt: Date.now(),
    shareType: mode,
    encrypted: !!encrypted,
    expiryType: expiryUnit === 'count' ? 'count' : 'time',
    expiryValue: numValue,
    expiryUnit,
    expiresAt: calculateExpiresAt(numValue, expiryUnit),
    currentViews: 0,
    isActive: true
  }

  const MAX_COUNT_TTL = 86400

  await kv.put(`text:${identifier}`, JSON.stringify(record), record.expiresAt
    ? { expirationTtl: Math.ceil((record.expiresAt - Date.now()) / 1000) + 600 }
    : { expirationTtl: MAX_COUNT_TTL })

  if (mode === 'id') {
    return Response.json({ id: identifier })
  } else {
    return Response.json({ token: identifier })
  }
}
