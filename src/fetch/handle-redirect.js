import { resolve as resolveUrl } from 'url'
import fetch from './'
import FetchError from '../fetch-error'
import writeUnwritable from '../lib/write-unwritable'

// any request with 303 response, or POST request with 301/302 response, must use GET when following redirect
const redirectMustUseGET = (request, response) => {
  return response.status === 303
    || ( [ 301, 302 ].includes(response.status) && request.method === 'POST' )
}

const handleRedirect = (request, response) => {
  let err
  if (request.redirect === 'error') {
    err = [ `redirect mode is set to error: ${request.url}`, 'no-redirect' ]
  }

  if (request._followCount >= request.follow) {
    err = [ `maximum redirect reached at: ${request.url}`, 'max-redirect' ]
  }

  if (!response.headers.has('location')) {
    err = [ `redirect location header missing at: ${request.url}`, 'invalid-redirect' ]
  }

  if (err) {
    return Promise.reject(new FetchError(...err))
  }

  if (redirectMustUseGET(request, response)) {
    writeUnwritable('method', 'GET', request)
    writeUnwritable('body', null, request)
    request.headers.delete('content-length')
  }

  writeUnwritable('_followCount', request._followCount + 1, request)

  return fetch(resolveUrl(request.url, response.headers.get('location')), request)
}

export default handleRedirect
