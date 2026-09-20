import { setAuthCookie, addToken } from './auth.js'
import { hashPassword } from '../hash.js'

export async function onRequestGet(context) {
  const { env } = context
  const kv = env.KV

  const password = await kv.get('admin:password')
  if (password) {
    return Response.json({ error: '操作不允许' }, { status: 403 })
  }
  return Response.json({ needsSetup: true })
}

export async function onRequestPost(context) {
  const { env } = context
  const kv = env.KV

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

  const existing = await kv.get('admin:password')
  if (existing) {
    return Response.json({ error: '操作不允许' }, { status: 403 })
  }

  const hash = await hashPassword(password)

  await kv.put('admin:password', hash)

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
