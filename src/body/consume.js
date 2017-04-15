import { BUFFER } from '../blob.js'
import typeofObject from 'typeof-object'
import FetchError from '../fetch-error.js'
import isNil from 'is-nil'

/**
 * Decode buffers into utf-8 string
 *
 * @return  Promise
 */
const consume = ({ body, size, timeout, url }) => {

  if (isNil(body)) {
    return Promise.resolve(new Buffer(0))
  }

  if (typeof body === 'string') {
    return Promise.resolve(new Buffer(body))
  }

  if (typeofObject(body) === 'Blob') {
    return Promise.resolve(body[BUFFER])
  }

  if (Buffer.isBuffer(body)) {
    return Promise.resolve(body)
  }

  let accum = []
  let accumBytes = 0
  let abort = false

  return new Promise((resolve, reject) => {
    let resTimeout

    // allow timeout on slow response body
    if (timeout) {
      resTimeout = setTimeout(() => {
        abort = true
        reject(new FetchError(`Response timeout while trying to fetch ${url} (over ${timeout}ms)`, 'body-timeout'))
      }, timeout)
    }

    // handle stream error, such as incorrect content-encoding
    body.on('error', err => {
      // TODO: should this abort? seems like it should
      // abort = true // tests pass with or without this
      reject(new FetchError(`Invalid response body while trying to fetch ${url}: ${err.message}`, 'system', err))
    })

    body.on('data', chunk => {
      if (abort || isNil(chunk)) {
        return
      }

      if (size && accumBytes + chunk.length > size) {
        abort = true
        return reject(new FetchError(`content size at ${url} over limit: ${size}`, 'max-size'))
      }

      accumBytes += chunk.length
      accum.push(chunk)
    })

    body.on('end', () => {
      if (abort) {
        return
      }

      clearTimeout(resTimeout)
      resolve(Buffer.concat(accum))
    })
  })
}

export default consume
