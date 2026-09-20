import { verifyAdmin } from './auth.js'
import { hashSitePassword } from '../hash.js'

async function getSettings(kv) {
  const raw = await kv.get('admin:settings')
  if (!raw) return { sitePassword: false, sitePasswordHash: null }
  try {
    return JSON.parse(raw)
  } catch {
    return { sitePassword: false, sitePasswordHash: null }
  }
}

export async function onRequestGet(context) {
  const { env, request } = context
  const kv = env.KV

  const admin = await verifyAdmin(request, kv)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  const settings = await getSettings(kv)
  return Response.json({
    sitePassword: !!settings.sitePassword,
    hasPassword: !!settings.sitePasswordHash
  })
}

export async function onRequestPost(context) {
  const { env, request } = context
  const kv = env.KV

  const admin = await verifyAdmin(request, kv)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const current = await getSettings(kv)

  if (typeof body.sitePassword === 'boolean') {
    current.sitePassword = body.sitePassword
  }

  if (typeof body.password === 'string' && body.password.length >= 6) {
    current.sitePasswordHash = await hashSitePassword(body.password)
  }

  if (body.sitePassword === true && !current.sitePasswordHash) {
    return Response.json({ error: '请设置站点密码' }, { status: 400 })
  }

  await kv.put('admin:settings', JSON.stringify(current))

  const list = await kv.list({ prefix: 'site_password:session:' })
  for (const key of list.keys) {
    await kv.delete(key.name)
  }

  return Response.json({ success: true })
}
