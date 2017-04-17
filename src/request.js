import isNil from 'is-nil'
import typeofObject from 'typeof-object'
import pick from 'just-pick'
import tryCatch from 'try_catch'

import Headers from './headers'
import bodyMixin from './body/mixin'
import cloneBody from './body/clone'
import normalizeBody from './body/normalize'
import getBodyContentType from './body/get-content-type'
import setTypeofObject from './lib/set-typeof-object'

const EMSG_CONSTRUCT = `Failed to construct 'Request'`
const EMSG_ARG_REQUIRED = '1 argument required, but only 0 present.'
const EMSG_BODY_PROHIBITED = 'Request with GET/HEAD method cannot have body'

const requestProperties = [
  'body',
  'bodyUsed',
  'headers',
  'method',
  'redirect',
  'url',

  // TODO: document that these options are available to pass through to http.request
  // node http.request options
  'family',
  'localAddress',
  'socketPath',
  'agent',
  'timeout',

  // non-spec options for fetch in node
  'compress',
  'follow',

  '_followCount'
]

const defaultInit = {
  body: null,
  headers: {},
  method: 'GET',
  redirect: 'follow',

  compress: true,
  follow: 20,

  // TODO: document _followCount
  // should only be passed in internally
  _followCount: 0
}

const normalizeUrl = input => isNil(input.href) ? String(input) : input.href

const makeRequestValuesObject = (input, init) => {
  const params = typeofObject(input) === 'Request'
    ? { url: input.url, init: pick(input, requestProperties) }
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
      method: preparedInit.method.toUpperCase(),
      headers: new Headers(preparedInit.headers),
      body: normalizeBody(preparedInit.body)
    }
  )

  if (!isNil(requestValues.body)) {
    if (requestValues.method === 'GET' || requestValues.method === 'HEAD') {
      throw new TypeError(EMSG_BODY_PROHIBITED)
    }

    const contentType = getBodyContentType(requestValues.body)
    if (!isNil(contentType) && !requestValues.headers.has('Content-Type')) {
      requestValues.headers.append('Content-Type', contentType)
    }
  }

  return requestValues
}

const Request = function (input, init) {
  // TODO: write tests for error checks
  var args = arguments
  return tryCatch(() => {
    if (args.length < 1 ) {
      throw new TypeError(EMSG_ARG_REQUIRED)
    }

    // TODO: write instanceof Request test
    // TODO: consuming body / cloning probably should have more tests
    const request = Object.assign(
      Object.create(Request.prototype),
      makeRequestValuesObject(input, init),
      {
        clone: () => new Request(request, { body: cloneBody(request) })
      }
    )

    bodyMixin(request)

    // TODO: write typeofObject test
    setTypeofObject('Request', request)

    // TODO: test immutability
    requestProperties.forEach(key => {
      Object.defineProperty(request, key, {
        writable: false
      })
    })

    return request
  }, (err) => {
    err.message = `${EMSG_CONSTRUCT}: ${err.message}`
    throw err
  })
}

export default Request
