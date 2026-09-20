import { defineConfig } from 'vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { mockKV, initMockData } from './mock-kv.js'

function cloudflareDevPlugin() {
  initMockData()

  return {
    name: 'cloudflare-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        res.setHeader('Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:3000; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
        )
        next()
      })
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/') && !req.url.startsWith('/t/') && !req.url.startsWith('/admin/')) {
          return next()
        }

        const url = new URL(req.url, 'http://localhost')
        const method = req.method

        let body = null
        if (method === 'POST' || method === 'PUT') {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const raw = Buffer.concat(chunks).toString()
          if (raw) {
            try { body = JSON.parse(raw) } catch (e) { console.warn('[Body Parse]', e.message) }
          }
        }

        const request = new Request(url.href, {
          method,
          headers: Object.fromEntries(Object.entries(req.headers).filter(([k]) => k !== 'host')),
          body: body ? JSON.stringify(body) : undefined
        })

        const context = {
          env: { KV: mockKV },
          request,
          params: {},
          next: () => {}
        }

        try {
          let handler
          const pathname = url.pathname

          if (pathname === '/api/text/create' && method === 'POST') {
            const mod = await import('./functions/api/text/create.js')
            handler = mod.onRequestPost
          } else if (pathname.match(/^\/api\/text\/[^/]+$/) && method === 'GET') {
            const id = pathname.split('/')[3]
            context.params = { id }
            const mod = await import('./functions/api/text/[id].js')
            handler = mod.onRequestGet
          } else if (pathname.match(/^\/api\/text\/[^/]+$/) && method === 'DELETE') {
            const id = pathname.split('/')[3]
            context.params = { id }
            const mod = await import('./functions/api/text/[id].js')
            handler = mod.onRequestDelete
          } else if (pathname === '/api/admin/setup' && method === 'GET') {
            const mod = await import('./functions/api/admin/setup.js')
            handler = mod.onRequestGet
          } else if (pathname === '/api/admin/setup' && method === 'POST') {
            const mod = await import('./functions/api/admin/setup.js')
            handler = mod.onRequestPost
          } else if (pathname === '/api/admin/login' && method === 'POST') {
            const mod = await import('./functions/api/admin/login.js')
            handler = mod.onRequestPost
          } else if (pathname === '/api/admin/check' && method === 'GET') {
            const mod = await import('./functions/api/admin/check.js')
            handler = mod.onRequestGet
          } else if (pathname === '/api/admin/list' && method === 'GET') {
            const mod = await import('./functions/api/admin/list.js')
            handler = mod.onRequestGet
          } else if (pathname === '/api/admin/logout' && method === 'POST') {
            const mod = await import('./functions/api/admin/logout.js')
            handler = mod.onRequestPost
          } else if (pathname === '/api/admin/settings' && method === 'GET') {
            const mod = await import('./functions/api/admin/settings.js')
            handler = mod.onRequestGet
          } else if (pathname === '/api/admin/settings' && method === 'POST') {
            const mod = await import('./functions/api/admin/settings.js')
            handler = mod.onRequestPost
          } else if (pathname === '/api/admin/change-password' && method === 'POST') {
            const mod = await import('./functions/api/admin/change-password.js')
            handler = mod.onRequestPost
          } else if (pathname === '/admin/settings' && method === 'GET') {
            const html = readFileSync(resolve(__dirname, 'admin-settings.html'), 'utf-8')
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(html)
            return
          } else if (pathname.match(/^\/api\/admin\/[^/]+$/) && method === 'GET') {
            const id = pathname.split('/')[3]
            context.params = { id }
            const mod = await import('./functions/api/admin/[id].js')
            handler = mod.onRequestGet
          } else if (pathname.match(/^\/api\/admin\/[^/]+$/) && method === 'DELETE') {
            const id = pathname.split('/')[3]
            context.params = { id }
            const mod = await import('./functions/api/admin/[id].js')
            handler = mod.onRequestDelete
          } else if (pathname === '/api/settings' && method === 'GET') {
            const mod = await import('./functions/api/settings.js')
            handler = mod.onRequestGet
          } else if (pathname === '/api/verify-site-password' && method === 'POST') {
            const mod = await import('./functions/api/verify-site-password.js')
            handler = mod.onRequestPost
          } else if (pathname.match(/^\/api\/t\/[^/]+$/) && method === 'GET') {
            const token = pathname.split('/')[3]
            context.params = { token }
            const mod = await import('./functions/api/t/[token].js')
            handler = mod.onRequestGet
          } else if (pathname === '/admin' && method === 'GET') {
            const html = readFileSync(resolve(__dirname, 'admin.html'), 'utf-8')
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(html)
            return
          } else if (pathname === '/admin/login' && method === 'GET') {
            const html = readFileSync(resolve(__dirname, 'admin-login.html'), 'utf-8')
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(html)
            return
          } else if (pathname.match(/^\/t\/[^/]+$/) && method === 'GET') {
            const html = readFileSync(resolve(__dirname, 't.html'), 'utf-8')
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(html)
            return
          }

          if (handler) {
            const response = await handler(context)
            res.writeHead(response.status, Object.fromEntries(response.headers))
            const text = await response.text()
            res.end(text)
          } else {
            res.writeHead(404)
            res.end(JSON.stringify({ error: 'Not Found' }))
          }
        } catch (err) {
          console.error('[API Error]', err)
          res.writeHead(500)
          res.end(JSON.stringify({ error: 'Internal Server Error' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [cloudflareDevPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        create: resolve(__dirname, 'create.html'),
        admin: resolve(__dirname, 'admin.html'),
        'admin-settings': resolve(__dirname, 'admin-settings.html'),
        'admin-login': resolve(__dirname, 'admin-login.html'),
        view: resolve(__dirname, 't.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3000
  }
})
