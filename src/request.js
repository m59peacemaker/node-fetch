import { format as formatUrl, parse as parseUrl } from 'url'
import Stream from 'stream'

import typeofObject from 'typeof-object'
import isNil from 'is-nil'
import pick from 'just-pick'

import Headers from './headers.js'
import Blob, { BUFFER } from './blob.js'
import getContentType from './body/get-content-type'
import consumeBody from './body/consume'
import cloneBody from './body/clone'
import setTypeofObject from './lib/set-typeof-object'
import tryCatch from 'try_catch'

const requestProps = [
  'body',
  'bodyUsed',
  'headers',
  'method',
  'redirect',
  'url',

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

const makeRequestValuesObject = (input, init) => {
  const params = typeofObject(input) === 'Request'
    ? { url: input.url, init: pick(input, requestProps) }
    : { url: normalizeUrl(input) }

  const preparedInit = Object.assign(
    {},
    defaultInit,
    params.init,
    init
  )

  const requestValues = Object.assign(
    preparedInit,
    {
      url: params.url,
      _url: parseUrl(params.url), // TODO: rename to _parsedUrl and/or hide better some other way
      method: preparedInit.method.toUpperCase(),
      headers: new Headers(preparedInit.headers)
    }
  )

  if (!isNil(requestValues.body)) {
    if (requestValues.method === 'GET' || requestValues.method === 'HEAD') {
      throw new TypeError('Request with GET/HEAD method cannot have body')
    }

    requestValues.body = normalizeBody(cloneBody(requestValues))

    const contentType = getContentType(requestValues.body)
    if (!isNil(contentType) && !requestValues.headers.has('Content-Type')) {
      requestValues.headers.append('Content-Type', contentType)
    }
  }

  return requestValues
}

const addRequestFunctions = (Request, request) => {
  const clone = () => Request(request)

  const arrayBuffer = () => consumeBody(request.body, request)
    .then(buffer => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength)
    )

  const blob = () => {
    const contentType = request.headers && request.headers.get('content-type') || ''
    return consumeBody(request.body, request)
      .then(buffer => Object.assign(
        // prevent copying
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

  return Object.assign(request, {
    clone,
    arrayBuffer,
    blob,
    json,
    text,
    buffer,
    textConverted
  })
}

const Request = function (input, init) {
  // TODO: write tests for error handling messages and error types and such
  var args = arguments
  return tryCatch(() => {
    if (args.length < 1 ) {
      throw new TypeError('1 argument required, but only 0 present.')
    }

    // TODO: write instanceof Request test
    const request = Object.assign(
      Object.create(Request.prototype),
      makeRequestValuesObject(input, init)
    )

    addRequestFunctions(Request, request)

    // TODO: write typeofObject test
    setTypeofObject('Request', request)

    // TODO: request values ought to be immutable
    // TODO: should throw if something tries to use body after it has been used

    return request
  }, (err) => {
    err.message = `Failed to construct 'Request': ${err.message}`
    throw err
  })
}

export default Request
