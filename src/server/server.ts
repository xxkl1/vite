import { promises as fs } from 'fs'
import path from 'path'
import http, { Server } from 'http'
import url from 'url'
import WebSocket from 'ws'
import serve from 'serve-handler'
import { vueMiddleware } from './vueCompiler'
import { resolveModule } from './moduleResolver'
import { createFileWatcher } from './watcher'
import { sendJS } from './utils'
import { rewrite } from './moduleRewriter'

const log = console.log.bind(console)

export interface ServerConfig {
  port?: number
  cwd?: string
}

export async function createServer({
  port = 3000,
  cwd = process.cwd()
}: ServerConfig = {}): Promise<Server> {
  const hmrClientCode = await fs.readFile(
    path.resolve(__dirname, '../client/client.js')
  )
  log('createServer')

  const server = http.createServer(async (req, res) => {
    const pathname = url.parse(req.url!).pathname!
    log('pathname:\n', pathname)
    if (pathname === '/__hmrClient') {
      return sendJS(res, hmrClientCode)
    } else if (pathname.startsWith('/__modules/')) {
      // __modules，会指定到对应的node_modules的目录下的文件
      return resolveModule(pathname.replace('/__modules/', ''), cwd, res)
    } else if (pathname.endsWith('.vue')) {
      return vueMiddleware(cwd, req, res)
    } else if (pathname.endsWith('.js')) {
      const filename = path.join(cwd, pathname.slice(1))
      try {
        const content = await fs.readFile(filename, 'utf-8')
        const cNew = rewrite(content)
        return sendJS(res, rewrite(cNew))
      } catch (e) {
        if (e.code === 'ENOENT') {
          // fallthrough to serve-handler
        } else {
          console.error(e)
        }
      }
    }

    // 如果上面的都不是，那么静态服务器运行index.html
    serve(req, res, {
      public: cwd ? path.relative(process.cwd(), cwd) : '/',
      // 这句话是，无论访问任何路径，都重定向到index.html
      rewrites: [{ source: '**', destination: '/index.html' }]
    })
  })

  const wss = new WebSocket.Server({ server })
  const sockets = new Set<WebSocket>()

  wss.on('connection', (socket) => {
    sockets.add(socket)
    socket.send(JSON.stringify({ type: 'connected' }))
    socket.on('close', () => {
      sockets.delete(socket)
    })
  })

  wss.on('error', (e: Error & { code: string }) => {
    if (e.code !== 'EADDRINUSE') {
      console.error(e)
    }
  })

  createFileWatcher(cwd, (payload) =>
    sockets.forEach((s) => s.send(JSON.stringify(payload)))
  )

  return new Promise((resolve, reject) => {
    server.on('error', (e: Error & { code: string }) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`port ${port} is in use, trying another one...`)
        setTimeout(() => {
          server.close()
          server.listen(++port)
        }, 100)
      } else {
        console.error(e)
        reject(e)
      }
    })

    server.on('listening', () => {
      console.log(`Running at http://localhost:${port}`)
      resolve(server)
    })

    server.listen(port)
  })
}
