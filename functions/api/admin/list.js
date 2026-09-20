import { verifyAdmin } from './auth.js'

const KV_PREFIX = 'text:'

export async function onRequestGet(context) {
  const { env, request } = context
  const kv = env.KV

  const admin = await verifyAdmin(request, kv)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20))

  const list = await kv.list({ prefix: KV_PREFIX })
  const texts = []

  for (const key of list.keys) {
    const raw = await kv.get(key.name)
    if (!raw) continue

    try {
      const record = JSON.parse(raw)
      const id = key.name.slice(KV_PREFIX.length)

      if (search && !id.toLowerCase().includes(search.toLowerCase())) {
        continue
      }

      texts.push({
        id,
        createdAt: record.createdAt,
        expiryType: record.expiryType,
        expiryValue: record.expiryValue,
        expiryUnit: record.expiryUnit,
        expiresAt: record.expiresAt,
        maxViews: record.expiryType === 'count' ? record.expiryValue : null,
        currentViews: record.currentViews,
        isActive: record.isActive
      })
    } catch (e) {
      console.warn('[List Parse Error]', key.name, e.message)
    }
  }

  texts.sort((a, b) => b.createdAt - a.createdAt)

  const total = texts.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const paged = texts.slice(start, start + pageSize)

  return Response.json({ texts: paged, total, page, pageSize, totalPages })
}
