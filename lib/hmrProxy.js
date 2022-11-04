// This file runs in the browser.

// 连接ws，ws的路径就是当前http服务器的路径
const socket = new WebSocket(`ws://${location.host}`)

// Listen for messages
// 处理ws的通知
socket.addEventListener('message', ({ data }) => {
  const { type, path, index } = JSON.parse(data)
  switch (type) {
    // 事件1：ws服务器告诉客户端，ws已经连接成功
    case 'connected':
      console.log(`[vds] connected.`)
      break
    // 事件2：ws服务器告诉客户端，需要进行重新加载
    case 'reload':
      import(`${path}?t=${Date.now()}`).then(m => {
        __VUE_HMR_RUNTIME__.reload(path, m.default)
        console.log(`[vds][hmr] ${path} reloaded.`)
      })
      break
    case 'rerender':
      // 事件3：ws服务器告诉客户端，需要进行重新渲染
      import(`${path}?type=template&t=${Date.now()}`).then(m => {
        __VUE_HMR_RUNTIME__.rerender(path, m.render)
        console.log(`[vds][hmr] ${path} template updated.`)
      })
      break
    case 'update-style':
      // 事件4：ws服务器告诉客户端，需要进行样式的更新
      import(`${path}?type=style&index=${index}&t=${Date.now()}`).then(m => {
        // TODO style hmr
      })
      break
    case 'full-reload':
      // 事件5：ws服务器告诉客户端，需要进行完全的重新加载
      location.reload()
  }
})

// ping server
// 处理ws的关闭
socket.addEventListener('close', () => {
  console.log(`[vds] server connection lost. polling for restart...`)
  // ws关闭后，使用定时器，看是否能重新连接ws，如果重新连接成功，进行页面重载重新运行全部逻辑
  setInterval(() => {
    new WebSocket(`ws://${location.host}`).addEventListener('open', () => {
      location.reload()
    })
  }, 1000)
})
