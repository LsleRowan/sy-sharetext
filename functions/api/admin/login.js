import { setAuthCookie, addToken } from './auth.js'
import { checkRateLimit, getClientIp } from '../rate-limit.js'
import { verifyPassword } from '../hash.js'

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 3600000

async function getLoginFailures(kv, ip) {
  const raw = await kv.get(`admin:login_lockout:${ip}`)
  if (!raw) return { count: 0, lockedUntil: 0 }
  try {
    return JSON.parse(raw)
  } catch {
    return { count: 0, lockedUntil: 0 }
  }
}

async function recordLoginFailure(kv, ip) {
  const failures = await getLoginFailures(kv, ip)
  failures.count++
  if (failures.count >= LOCKOUT_THRESHOLD) {
    failures.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
  }
  await kv.put(`admin:login_lockout:${ip}`, JSON.stringify(failures), {
    expirationTtl: Math.ceil(LOCKOUT_DURATION_MS / 1000) + 60
  })
}

async function clearLoginFailures(kv, ip) {
  await kv.delete(`admin:login_lockout:${ip}`)
}

export async function onRequestPost(context) {
  const { env, request } = context
  const kv = env.KV

  const ip = getClientIp(request)

  const failures = await getLoginFailures(kv, ip)
  if (failures.lockedUntil && Date.now() < failures.lockedUntil) {
    return Response.json({ error: '登录尝试次数过多，请稍后再试' }, { status: 429 })
  }

  if (!(await checkRateLimit(kv, ip, 'login'))) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { password } = body

  if (!password || typeof password !== 'string' || password.length < 6) {
    return Response.json({ error: '密码至少需要 6 个字符' }, { status: 400 })
  }

  const storedHash = await kv.get('admin:password')
  if (!storedHash) {
    return Response.json({ error: '用户名或密码错误' }, { status: 401 })
  }

  if (!(await verifyPassword(password, storedHash))) {
    await recordLoginFailure(kv, ip)
    return Response.json({ error: '用户名或密码错误' }, { status: 401 })
  }

  await clearLoginFailures(kv, ip)

  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  await addToken(kv, token)

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setAuthCookie(token, context.request)
    }
  })
}
