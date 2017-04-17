import { parse as parseUrl } from 'url'
import isNil from 'is-nil'
import Headers from '../headers'
import getTotalBytes from '../body/get-total-bytes'

const USER_AGENT = 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'

function getNodeRequestOptions(request) {
  const parsedUrl = parseUrl(request.url)
  const headers = new Headers(request.headers)

  // fetch step 3
  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*')
  }

  // Basic fetch
  if (!parsedUrl.protocol || !parsedUrl.hostname) {
    throw new TypeError('Only absolute URLs are supported')
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new TypeError('Only HTTP(S) protocols are supported')
  }

  // HTTP-network-or-cache fetch steps 5-9
  let contentLengthValue = null
  if (isNil(request.body) && /^(POST|PUT)$/i.test(request.method)) {
    contentLengthValue = '0'
  }
  if (!isNil(request.body)) {
    const totalBytes = getTotalBytes(request.body)
    if (typeof totalBytes === 'number') {
      contentLengthValue = String(totalBytes)
    }
  }
  if (contentLengthValue) {
    headers.set('Content-Length', contentLengthValue)
  }

  // HTTP-network-or-cache fetch step 12
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', USER_AGENT)
  }

  // HTTP-network-or-cache fetch step 16
  if (request.compress) {
    headers.set('Accept-Encoding', 'gzip,deflate')
  }
  if (!headers.has('Connection') && !request.agent) {
    headers.set('Connection', 'close')
  }

  // HTTP-network fetch step 4
  // chunked encoding is handled by Node.js

  const rawHeaders = headers._raw()

  // http.request does not accept `host` as an array, take first one
  if (rawHeaders.host) {
    rawHeaders.host = rawHeaders.host[0]
  }

  return Object.assign({}, parsedUrl, {
    method: request.method,
    headers: rawHeaders,
    agent: request.agent
  })
}

export default getNodeRequestOptions
