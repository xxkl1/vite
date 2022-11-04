const fs = require('fs')
const url = require('url')
const path = require('path')
const qs = require('querystring')
const { parseSFC } = require('./parseSFC')
const { compileTemplate } = require('@vue/compiler-sfc')
const { sendJS } = require('./utils')

module.exports = (req, res) => {
  const parsed = url.parse(req.url, true)
  const query = parsed.query
  const filename = path.join(process.cwd(), parsed.pathname.slice(1))
  // 根据文件名获取编译出来的.vue文件的内容
  const [descriptor] = parseSFC(filename)
  // 如果没有指定query.type，那么进行普通逻辑处理
  if (!query.type) {
    let code = ``
    // TODO use more robust rewrite
    if (descriptor.script) {
      code += descriptor.script.content.replace(
        `export default`,
        'const script ='
      )
      code += `\nexport default script`
    }
    if (descriptor.template) {
      code += `\nimport { render } from ${JSON.stringify(
        parsed.pathname + `?type=template${query.t ? `&t=${query.t}` : ``}`
      )}`
      code += `\nscript.render = render`
    }
    if (descriptor.style) {
      // TODO
    }
    code += `\nscript.__hmrId = ${JSON.stringify(parsed.pathname)}`
    return sendJS(res, code)
  }

  // 如果指定query.type是模板，那么进行进行编译输出
  if (query.type === 'template') {
    const { code, errors } = compileTemplate({
      source: descriptor.template.content,
      filename,
      compilerOptions: {
        runtimeModuleName: '/vue.js'
      }
    })

    if (errors) {
      // TODO
    }
    return sendJS(res, code)
  }

  if (query.type === 'style') {
    // TODO
    return
  }

  // TODO custom blocks
}
