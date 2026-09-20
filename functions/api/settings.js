export async function onRequestGet(context) {
  const { env, request } = context
  const kv = env.KV

  const raw = await kv.get('admin:settings')
  let sitePassword = false
  let sitePasswordHash = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      sitePassword = !!parsed.sitePassword
      sitePasswordHash = parsed.sitePasswordHash || null
    } catch {}
  }

  let verified = false
  if (sitePassword && sitePasswordHash) {
    const cookieHeader = request.headers.get('Cookie')
    const cookieToken = cookieHeader?.match(/site_password=([^;]+)/)?.[1]
    if (cookieToken && cookieToken.length > 0) {
      const sessionRecord = await kv.get(`site_password:session:${cookieToken}`)
      if (sessionRecord) {
        try {
          const { expiresAt } = JSON.parse(sessionRecord)
          if (Date.now() < expiresAt) {
            verified = true
          }
        } catch {}
      }
    }
  }

  return Response.json({ sitePassword, verified })
}
