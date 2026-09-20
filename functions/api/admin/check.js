import { verifyAdmin } from './auth.js'

export async function onRequestGet(context) {
  const { env, request } = context
  const admin = await verifyAdmin(request, env.KV)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }
  return Response.json({ ok: true })
}
