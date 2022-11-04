const fs = require('fs')
const { parse } = require('@vue/compiler-sfc')

const cache = new Map()

// 根据文件名，读取对应的.vue文件，并解析
exports.parseSFC = filename => {
  const content = fs.readFileSync(filename, 'utf-8')
  const { descriptor, errors } = parse(content, {
    filename
  })

  if (errors) {
    // TODO
  }

  const prev = cache.get(filename)
  cache.set(filename, descriptor)
  // descriptor翻译是描述符，我猜是vue编译出来的内容
  // prev是上次编译出来的内容
  return [descriptor, prev]
}
