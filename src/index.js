import http from 'http'
import https from 'https'
import zlib from 'zlib'
import { PassThrough } from 'stream'
import { resolve as resolveUrl } from 'url'

import Headers from './headers'
import Request from './request'
import Response from './response'
import FetchError from './fetch-error'

import writeToStream from './body/write-to-stream'
import getNodeRequestOptions from './lib/get-node-request-options'
import isRedirect from './lib/is-redirect'

// per fetch spec, for any request with 303 response, or POST request with 301/302 response, use GET when following redirect
const redirectMustUseGET = (request, response) => {
  const { method } = request
  const { statusCode } = response
  return statusCode === 303
    || ( (statusCode === 301 || statusCode === 302) && method === 'POST' )
}

const fetch = (input, opts) => {

  // wrap http.request into fetch
  return new Promise((resolve, reject) => {
    // build request object
    const request = new Request(input, opts)
    const options = getNodeRequestOptions(request)

    const send = (options.protocol === 'https:' ? https : http).request

    // http.request only supports string as host header, this hack makes custom host header possible
    if (options.headers.host) {
      options.headers.host = options.headers.host[0]
    }

    // send request
    const req = send(options)
    let reqTimeout

    if (request.timeout) {
      req.once('socket', socket => {
        reqTimeout = setTimeout(() => {
          req.abort()
          reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'))
        }, request.timeout)
      })
    }

    req.on('error', err => {
      clearTimeout(reqTimeout)
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err))
    })

    req.on('response', res => {
      clearTimeout(reqTimeout)

      // handle redirect
      if (isRedirect(res.statusCode) && request.redirect !== 'manual') {
        if (request.redirect === 'error') {
          reject(new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect'))
          return
        }

        if (request.counter >= request.follow) {
          reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'))
          return
        }

        if (!res.headers.location) {
          reject(new FetchError(`redirect location header missing at: ${request.url}`, 'invalid-redirect'))
          return
        }

        if (redirectMustUseGET(request, res)) {
          request.method = 'GET'
          request.body = null
          request.headers.delete('content-length')
        }

        request.counter++

        resolve(fetch(resolveUrl(request.url, res.headers.location), request))
        return
      }

      // normalize location header for manual redirect mode
      const headers = new Headers()
      for (const name of Object.keys(res.headers)) {
        if (Array.isArray(res.headers[name])) {
          for (const val of res.headers[name]) {
            headers.append(name, val)
          }
        } else {
          headers.append(name, res.headers[name])
        }
      }
      if (request.redirect === 'manual' && headers.has('location')) {
        headers.set('location', resolveUrl(request.url, headers.get('location')))
      }

      // prepare response
      let body = res.pipe(new PassThrough())
      const responseOptions = {
        url: request.url
        , status: res.statusCode
        , statusText: res.statusMessage
        , headers: headers
        , size: request.size
        , timeout: request.timeout
      }

      // HTTP-network fetch step 16.1.2
      const codings = headers.get('Content-Encoding')

      // HTTP-network fetch step 16.1.3: handle content codings

      // in following scenarios we ignore compression support
      // 1. compression support is disabled
      // 2. HEAD request
      // 3. no Content-Encoding header
      // 4. no content response (204)
      // 5. content not modified response (304)
      if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
        resolve(new Response(body, responseOptions))
        return
      }

      // Be less strict when decoding compressed responses, since sometimes
      // servers send slightly invalid responses that are still accepted
      // by common browsers.
      // Always using Z_SYNC_FLUSH is what cURL does.
      const zlibOptions = {
        flush: zlib.Z_SYNC_FLUSH,
        finishFlush: zlib.Z_SYNC_FLUSH
      }

      // for gzip
      if (codings == 'gzip' || codings == 'x-gzip') {
        body = body.pipe(zlib.createGunzip(zlibOptions))
        return resolve(new Response(body, responseOptions))
      }

      // for deflate
      if (codings === 'deflate' || codings === 'x-deflate') {
        // handle the infamous raw deflate response from old servers
        // a hack for old IIS and Apache servers
        res.pipe(new PassThrough()).once('data', chunk => {
          // see http://stackoverflow.com/questions/37519828
          if ((chunk[0] & 0x0F) === 0x08) {
            console.log(chunk[0])
            body = body.pipe(zlib.createInflate(zlibOptions))
          } else {
            body = body.pipe(zlib.createInflateRaw(zlibOptions))
          }
          resolve(new Response(body, responseOptions))
        })
        return
      }

      // otherwise, use response as-is
      resolve(new Response(body, responseOptions))
    })

    writeToStream(request.body, req)
  })

}

export default fetch

export {
  Headers,
  Request,
  Response,
  FetchError
}
