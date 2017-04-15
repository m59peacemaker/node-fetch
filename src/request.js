import typeofObject from 'typeof-object'
import isNil from 'is-nil'
import alwaysPick from 'just-pick'
import pick from 'object.pick'

import { format as formatUrl, parse as parseUrl } from 'url'
import Headers from './headers.js'
import Body, { extractContentType } from './body'
import getContentType from './body/get-content-type'
import Stream, {PassThrough} from 'stream'
import consumeBody from './body/consume'
import Blob, { BUFFER } from './blob.js'

// TODO:
// initProps?
// requestProps?
const props = [
  'body',
  'bodyUsed',
  'headers',
  'method',
  'redirect',

  'size',
  'timeout',

  'agent',
  'compress',
  'counter',
  'follow'
]

const defaultInit = {
  body: null,
  bodyUsed: false,
  headers: {},
  method: 'GET',
  redirect: 'follow',

  size: 0,
  timeout: 0,

  compress: true,
  counter: 0,
  follow: 20
}

const clone = ({ body, bodyUsed }) => {
  // TODO: perhaps this check belongs in the caller
  if (bodyUsed) {
    throw new Error('cannot clone body after it is used')
  }

  // TODO: find a way to clone FormData

  if (body instanceof Stream && typeofObject(body) !== 'FormData') {
    const p = new PassThrough()
    body.pipe(p)
    return p
  }

  return body
}

const normalizeUrl = input => isNil(input.href) ? String(input) : input.href

const normalizeBody = body => {
  if (isNil(body)) {
    return null
  } else if (
    typeof body === 'string' ||
    typeofObject(body) === 'Blob' ||
    Buffer.isBuffer(body) ||
    body instanceof Stream
  ) {
    return body
  }
  return String(body)
}

const Request = function (input, init) {

  // TODO: write tests for type check
  // TODO: TypeError: Failed to construct 'Request':
  if (arguments.length < 1 ) {
    throw new TypeError('1 argument required, but only 0 present.')
  }

  const params = typeofObject(input) === 'Request' ?
    { url: input.url, init: alwaysPick(input, props) } :
    { url: normalizeUrl(input) }

  const parsedUrl = parseUrl(params.url)

  // TODO: write instanceof Request test
  const request = Object.assign(
    Object.create(Request.prototype),
    defaultInit,
    params.init,
    init
  )

  request.method = request.method.toUpperCase()
  request.headers = new Headers(request.headers)

  if (!isNil(request.body)) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      throw new TypeError('Request with GET/HEAD method cannot have body')
    }

    request.body = normalizeBody(clone(request))

    const contentType = getContentType(request.body)
    if (!isNil(contentType) && !request.headers.has('Content-Type')) {
      request.headers.append('Content-Type', contentType)
    }
  }

  // TODO: test pass with this removed...
  // request[DISTURBED] = false
  // there seems to be no tests to for this body disturbed stuff

  request._url = parsedUrl

  const url = formatUrl(request._url)
  request.url = url

  const _clone = () => Request(request)

  const arrayBuffer = () => consumeBody(request.body, request)
    .then(buffer => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength)
    )

  const blob = () => {
    const contentType = request.headers && request.headers.get('content-type') || ''
    return consumeBody(request.body, request)
      .then(buffer => Object.assign(
        // Prevent copying
        new Blob([], { type: contentType }),
        { [BUFFER]: buffer }
      ))
  }

  const json = () => consumeBody(request.body, request)
    .then(buffer => JSON.parse(buffer.toString()))

  const text = () => consumeBody(request.body, request)
    .then(buffer => buffer.toString())

  const buffer = () => consumeBody(request.body, request)

  const textConverted = () => consumeBody(request.body, request)
    .then(buffer => convertBody(buffer, request.headers))

  const methods = {
    clone: _clone,
    arrayBuffer,
    blob,
    json,
    text,
    buffer,
    textConverted
  }

  Object.assign(request, methods)

  // TODO: figure out / test immutable request

  /*props.forEach(key => {
    Object.defineProperty(request, key, {
      writable: false
    })
  })*/

  Object.defineProperty(request, Symbol.toStringTag, {
    value: 'Request',
    writable: false,
    enumerable: false,
  })

  return request
}

export default Request
