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

const fetch = (input, init) => new Promise((resolve, reject) => {
  const request = new Request(input, init)
  const nodeRequestOptions = makeNodeRequestOptions(request)
  const makeNodeRequest = (nodeRequestOptions.protocol === 'https:' ? https : http).request

  const nodeRequest = makeNodeRequest(nodeRequestOptions)
  let nodeRequestTimeout

  if (request.timeout) {
    nodeRequest.once('socket', socket => {
      nodeRequestTimeout = setTimeout(() => {
        nodeRequest.abort()
        return reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'))
      }, request.timeout)
    })
  }

  nodeRequest.on('error', err => {
    clearTimeout(nodeRequestTimeout)
    return reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err))
  })

  nodeRequest.on('response', res => {
    clearTimeout(nodeRequestTimeout)

    const response = nodeResponseToFetchResponse(res)

    if (isRedirect(response.status) && request.redirect !== 'manual') {
      return handleRedirect(request, response).then(resolve).catch(reject)
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

    // prepare body
    // HTTP-network fetch step 16.1.3: handle contentEncodings
    return (shouldNotCompress(request, response)
      ? Promise.resolve(response.body)
      : compressBody(response.body, response.headers.get('Content-Encoding'), res)
    )
      .catch(err => response.body) // just use body as is

      .then(body => resolve(new Response(body, responseInit)))
  })

  return writeBodyToStream(request.body, nodeRequest)
})

export default fetch
