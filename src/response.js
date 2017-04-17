import { STATUS_CODES } from 'http'
import Headers from './headers'
import normalizeBody from './body/normalize'
import cloneBody from './body/clone'
import bodyMixin from './body/mixin'
import setTypeofObject from './lib/set-typeof-object'
import pick from 'just-pick'

const responseProperties = [
  'url',
  'status',
  'statusText',
  'headers',
  'ok',

  'size',
  'timeout'
]

const defaultInit = {
  headers: [],
  status: 200,
  statusText: STATUS_CODES[200]
}

const Response = function (body = null, init) {
  const preparedInit = Object.assign({}, defaultInit, init)

  // TODO: instanceof test
  const response = Object.assign(
    Object.create(Response.prototype),
    preparedInit,
    {
      //body: normalizeBody(body),
      body,
      headers: new Headers(preparedInit.headers),
      ok: preparedInit.status >= 200 && preparedInit.status < 300,
      clone: () => new Response(cloneBody(response), pick(response, responseProperties))
    }
  )

  // TODO: typeofObject test
  setTypeofObject('Response', response)

  // TODO: immutability

  bodyMixin(response)

  return response
}

export default Response
