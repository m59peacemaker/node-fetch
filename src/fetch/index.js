import http from 'http'
import https from 'https'
import { resolve as resolveUrl } from 'url'
import pick from 'just-pick'

import Headers from '../headers'
import Request from '../request'
import Response from '../response'
import FetchError from '../fetch-error'

import writeBodyToStream from '../body/write-to-stream'
import makeNodeRequestOptions from './make-node-request-options'
import nodeResponseToFetchResponse from './node-response-to-fetch-response'
import isRedirect from './is-redirect'
import handleRedirect from './handle-redirect'
import shouldNotCompress from './should-not-compress'
import compressBody from './compress-body'
import writeUnwritable from '../lib/write-unwritable'
import wait from 'timeout-then'

var promisifyOnce = function (once) {
  return function (eventName) {
    return new Promise(function (resolve, reject) {
      return once(eventName, resolve)
    })
  }
}

const fetch = (input, init) => Promise.resolve().then(() => {
  const request = new Request(input, init)
  const nodeRequestOptions = makeNodeRequestOptions(request)
  const makeNodeRequest = (nodeRequestOptions.protocol === 'https:' ? https : http).request
  let stopTimeout = () => {}

  const nodeRequest = makeNodeRequest(nodeRequestOptions)
  const once = promisifyOnce(nodeRequest.once.bind(nodeRequest))

  const timeoutPromise = !request.timeout ? new Promise(() => {}) : once('socket')
    .then(() => {
      const promise = wait(request.timeout)
      stopTimeout = () => promise.clear()
      return promise
    })
    .then(() => {
      nodeRequest.abort()
      throw new FetchError(`network timeout at: ${request.url}`, 'request-timeout')
    })

  const errorPromise = once('error')
    .then(err => {
      stopTimeout()
      throw new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err)
    })

  const responsePromise = once('response')
    .then(res => {
      stopTimeout()

      const response = nodeResponseToFetchResponse(res)

      if (isRedirect(response.status) && request.redirect !== 'manual') {
        return handleRedirect(request, response)
      }

      if (request.redirect === 'manual' && response.headers.has('location')) {
        const newLocation = resolveUrl(request.url, response.headers.get('location'))
        response.headers.set('location', newLocation)
      }

      const responseInit = Object.assign(
        {},
        pick(request, [ 'url', 'size', 'timeout' ]),
        pick(response, [ 'headers', 'status', 'statusText' ])
      )

      // HTTP-network fetch step 16.1.3: handle contentEncodings
      const preparedBodyPromise = shouldNotCompress(request, response)
        ? Promise.resolve(response.body)
        : compressBody(response.body, response.headers.get('Content-Encoding'), res)
            .catch(err => response.body) // just use body as is

      return preparedBodyPromise
        .then(body => new Response(body, responseInit))
    })

  writeBodyToStream(request.body, nodeRequest)
  return Promise.race([timeoutPromise, errorPromise, responsePromise])
})

export default fetch
