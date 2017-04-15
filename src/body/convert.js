import { convert as convertEncoding } from 'encoding'

function convertBody(buffer, headers) {
  const contentType = headers.get('content-type')
  let charset = 'utf-8'
  let res, string

  // header
  if (contentType) {
    res = /charset=([^;]*)/i.exec(contentType)
  }

  // no charset in content type, peek at response body for at most 1024 bytes
  string = buffer.slice(0, 1024).toString()

  // html5
  if (!res && string) {
    res = /<meta.+?charset=(['"])(.+?)\1/i.exec(string)
  }

  // html4
  if (!res && string) {
    res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(string)

    if (res) {
      res = /charset=(.*)/i.exec(res.pop())
    }
  }

  // xml
  if (!res && string) {
    res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(string)
  }

  // found charset
  if (res) {
    charset = res.pop()

    // prevent decode issues when sites use incorrect encoding
    // ref: https://hsivonen.fi/encoding-menu/
    if (charset === 'gb2312' || charset === 'gbk') {
      charset = 'gb18030'
    }
  }

  // turn raw buffers into a single utf-8 buffer
  return convertEncoding(
    buffer
    , 'UTF-8'
    , charset
  ).toString()
}

export default convertBody
