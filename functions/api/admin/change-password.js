import { verifyAdmin } from './auth.js'
import { verifyPassword, hashPassword } from '../hash.js'

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

  const { oldPassword, newPassword } = body

  if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    return Response.json({ error: '请输入密码' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return Response.json({ error: '新密码至少需要 6 个字符' }, { status: 400 })
  }

  const storedHash = await kv.get('admin:password')
  if (!storedHash) {
    return Response.json({ error: '管理员未设置密码' }, { status: 400 })
  }

  if (!(await verifyPassword(oldPassword, storedHash))) {
    return Response.json({ error: '原密码错误' }, { status: 403 })
  }

  const newHash = await hashPassword(newPassword)
  await kv.put('admin:password', newHash)

  const list = await kv.list({ prefix: 'site_password:session:' })
  for (const key of list.keys) {
    await kv.delete(key.name)
  }

  return Response.json({ success: true })
}
