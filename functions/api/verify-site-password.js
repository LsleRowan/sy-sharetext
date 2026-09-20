import { checkRateLimit, getClientIp } from './rate-limit.js'
import { verifySitePassword } from './hash.js'

export async function onRequestPost(context) {
  const { env, request } = context
  const kv = env.KV

  const ip = getClientIp(request)
  if (!(await checkRateLimit(kv, ip, 'login'))) {
    return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  const settingsRaw = await kv.get('admin:settings')
  let settings = { sitePassword: false, sitePasswordHash: null }
  if (settingsRaw) {
    try { settings = JSON.parse(settingsRaw) } catch {}
  }

  if (!settings.sitePassword || !settings.sitePasswordHash) {
    return Response.json({ success: true })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { password } = body
  if (!password || typeof password !== 'string') {
    return Response.json({ error: '请输入密码' }, { status: 400 })
  }

  if (!(await verifySitePassword(password, settings.sitePasswordHash))) {
    return Response.json({ error: '密码错误' }, { status: 403 })
  }

  const proto = request?.headers?.get('x-forwarded-proto') || 'https'
  const secure = proto === 'https' ? '; Secure' : ''

  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  const now = Date.now()
  const expiresAt = now + 7 * 86400000
  await kv.put(`site_password:session:${token}`, JSON.stringify({ expiresAt }), {
    expirationTtl: 7 * 86400
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `site_password=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Strict${secure}`
    }
  })
}
