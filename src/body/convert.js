/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */
function convert (buffer, headers) {
  const ct = headers.get('content-type')
  let charset = 'utf-8'
  let res, str

  // header
  if (ct) {
    res = /charset=([^]*)/i.exec(ct)
  }

  // no charset in content type, peek at response body for at most 1024 bytes
  str = buffer.slice(0, 1024).toString()

  // html5
  if (!res && str) {
    res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str)
  }

  // html4
  if (!res && str) {
    res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str)

    if (res) {
      res = /charset=(.*)/i.exec(res.pop())
    }
  }

  // xml
  if (!res && str) {
    res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str)
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
  return convert(
    buffer
    , 'UTF-8'
    , charset
  ).toString()
}

export default convert
