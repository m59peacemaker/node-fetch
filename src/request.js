import { parse as parseUrl } from 'url'

import isNil from 'is-nil'
import typeofObject from 'typeof-object'
import pick from 'just-pick'
import tryCatch from 'try_catch'

import Headers from './headers.js'
import bodyMixin from './body/mixin'
import cloneBody from './body/clone'
import getContentType from './body/get-content-type'
import setTypeofObject from './lib/set-typeof-object'
import normalizeBody from './body/normalize'

const requestProps = [
  'body',
  'bodyUsed',
  'headers',
  'method',
  'redirect',
  'url',

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

  compress: true,
  counter: 0,
  follow: 20
}

const normalizeUrl = input => isNil(input.href) ? String(input) : input.href

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
      headers: new Headers(preparedInit.headers),
      body: normalizeBody(preparedInit.body)
    }
  )

  if (!isNil(requestValues.body)) {
    if (requestValues.method === 'GET' || requestValues.method === 'HEAD') {
      throw new TypeError('Request with GET/HEAD method cannot have body')
    }

    const contentType = getContentType(requestValues.body)
    if (!isNil(contentType) && !requestValues.headers.has('Content-Type')) {
      requestValues.headers.append('Content-Type', contentType)
    }
  }

  return requestValues
}

const Request = function (input, init) {
  // TODO: write tests for error handling messages and error types and such
  var args = arguments
  return tryCatch(() => {
    if (args.length < 1 ) {
      throw new TypeError('1 argument required, but only 0 present.')
    }

    // TODO: write instanceof Request test
    // TODO: consuming body / cloning probably should have more tests
    const request = Object.assign(
      Object.create(Request.prototype),
      makeRequestValuesObject(input, init),
      { clone: () => new Request(request, { body: cloneBody(request) }) }
    )

    bodyMixin(request)

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
