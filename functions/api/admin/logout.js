import { clearAuthCookie, removeToken } from './auth.js'

export async function onRequestPost(context) {
  const { env, request } = context
  const kv = env.KV

  const cookieHeader = request.headers.get('Cookie')
  const token = cookieHeader?.match(/admin_token=([^;]+)/)?.[1]
  if (token) {
    await removeToken(kv, token)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearAuthCookie()
    }
  })
}
