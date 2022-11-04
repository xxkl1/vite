const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const ws = require('ws')
const serve = require('serve-handler')
const vue = require('./vueMiddleware')
const { createFileWatcher } = require('./fileWatcher')
const { sendJS } = require('./utils')

const hmrProxy = fs.readFileSync(path.resolve(__dirname, './hmrProxy.js'))

// 创键http服务
const server = http.createServer((req, res) => {
  // 根据url的路径，进行功能切换
  const pathname = url.parse(req.url).pathname
  if (pathname === '/__hmrProxy') {
    // 如果是/__hmrProxy，那么是获取触发代理的的js文件
    // 发送当前路径下的hmrProxy.js到浏览器
    sendJS(res, hmrProxy)
  } else if (pathname.endsWith('.vue')) {
    // 如果是.vue结尾，进行对应vue文件的解析
    vue(req, res)
  } else {
    // 如果上述逻辑都不是的话，那么进行文件浏览器的服务
    serve(req, res)
  }
})

const wss = new ws.Server({ server })
const sockets = new Set()
wss.on('connection', (socket) => {
  sockets.add(socket)
  socket.send(JSON.stringify({ type: 'connected'}))
  socket.on('close', () => {
    sockets.delete(socket)
  })
})

createFileWatcher((payload) =>
  sockets.forEach((s) => s.send(JSON.stringify(payload)))
)

server.listen(3000, () => {
  console.log('Running at http://localhost:3000')
})
