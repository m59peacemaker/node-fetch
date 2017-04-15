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

const DISTURBED = Symbol('disturbed')

const props = [
  'body',
  'bodyUsed',
  'method',
  'redirect',
  'headers',

  'size',
  'timeout',

  'agent',
  'compress',
  'counter',
  'follow'
]

const defaultInit = {
  body: null,
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
  if (bodyUsed) {
    throw new Error('cannot clone body after it is used')
  }

  // TODO: we can't clone the form-data object without having it as a dependency
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

export default class Request {
  constructor(input, init = {}) {

    // TODO: write tests for type check
    // TODO: TypeError: Failed to construct 'Request':
    if (arguments.length < 1 ) {
      throw new TypeError('1 argument required, but only 0 present.')
    }

    const params = typeofObject(input) === 'Request' ?
      { url: input.url, init: alwaysPick(input, props) } :
      { url: normalizeUrl(input) }

    const parsedUrl = parseUrl(params.url)

    const request = Object.assign(
      {},
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

    // TODO: maybe don't need to delete this once OOP is done away with
    delete request.bodyUsed
    Object.assign(this, request)

    // test passed with this removed...
    this[DISTURBED] = false

    this._url = parsedUrl

    Object.defineProperty(this, Symbol.toStringTag, {
      value: 'Request',
      writable: false,
      enumerable: false,
    })
  }

  get url() {
    return formatUrl(this._url)
  }

  /**
   * Clone this request
   *
   * @return  Request
   */
  clone() {
    return new Request(this)
  }

  get bodyUsed() {
    return this[DISTURBED]
  }

  arrayBuffer() {
    return consumeBody(this.body, this).then(buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  }

  blob() {
    let ct = this.headers && this.headers.get('content-type') || ''
    return consumeBody(this.body, this).then(buffer => Object.assign(
      // Prevent copying
      new Blob([], {
        type: ct.toLowerCase()
      }),
      {
        [BUFFER]: buffer
      }
    ))
  }

  json() {
    return consumeBody(this.body, this).then(buffer => JSON.parse(buffer.toString()))
  }

  text() {
    return consumeBody(this.body, this).then(buffer => buffer.toString())
  }

  buffer() {
    return consumeBody(this.body, this)
  }

  textConverted() {
    return consumeBody(this.body, this).then(buffer => convertBody(buffer, this.headers))
  }
}

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
  value: 'RequestPrototype',
  writable: false,
  enumerable: false,
  configurable: true
})
