const ROUTES = {
  '/admin': '/admin.html',
  '/admin/login': '/admin-login.html',
  '/admin/settings': '/admin-settings.html',
  '/create': '/create.html',
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname

  if (path.startsWith('/t/')) {
    return context.env.ASSETS.fetch(new URL('/t.html', context.request.url))
  }

  const file = ROUTES[path]
  if (file) {
    return context.env.ASSETS.fetch(new URL(file, context.request.url))
  }

  return context.next()
}
