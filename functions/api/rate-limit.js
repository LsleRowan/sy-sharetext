const RATE_LIMITS = {
  login:   { max: 5,  windowMs: 60000 },
  create:  { max: 10, windowMs: 60000 },
  fetch:   { max: 30, windowMs: 60000 },
}

export async function checkRateLimit(kv, ip, action) {
  const limit = RATE_LIMITS[action]
  if (!limit) return true

  const key = `ratelimit:${action}:${ip}`
  const now = Date.now()

  let record
  try {
    const raw = await kv.get(key)
    record = raw ? JSON.parse(raw) : { timestamps: [] }
  } catch {
    record = { timestamps: [] }
  }

  record.timestamps = record.timestamps.filter(t => now - t < limit.windowMs)

  if (record.timestamps.length >= limit.max) {
    return false
  }

  record.timestamps.push(now)
  await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(limit.windowMs / 1000) + 10 })

  const recheck = await kv.get(key)
  if (recheck) {
    try {
      const current = JSON.parse(recheck)
      const recent = current.timestamps.filter(t => now - t < limit.windowMs)
      if (recent.length > limit.max) {
        current.timestamps = current.timestamps.filter(t => t !== now)
        await kv.put(key, JSON.stringify(current), { expirationTtl: Math.ceil(limit.windowMs / 1000) + 10 })
        return false
      }
    } catch {}
  }

  return true
}

export function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}
