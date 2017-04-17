import { PassThrough } from 'stream'
import zlib from 'zlib'
import cloneBody from '../body/clone'

// Be less strict when decoding compressed responses, since sometimes
// servers send slightly invalid responses that are still accepted
// by common browsers.
// Always using Z_SYNC_FLUSH is what cURL does.
const zlibOptions = {
  flush: zlib.Z_SYNC_FLUSH,
  finishFlush: zlib.Z_SYNC_FLUSH
}

const encodings = {
  gzip: [ 'gzip', 'x-gzip' ],
  deflate: [ 'deflate', 'x-deflate' ]
}

const compressBody = (body, contentEncoding) => new Promise((resolve, reject) => {
  if (encodings.gzip.includes(contentEncoding)) {
    return resolve(body.pipe(zlib.createGunzip(zlibOptions)))
  } else if (encodings.deflate.includes(contentEncoding)) {
    // handle the infamous raw deflate response from old servers
    // a hack for old IIS and Apache servers


    const ref = { body }
    // TODO: the way cloneBody works by replacing the original `body` reference, is lame and ugly
    cloneBody(ref).pipe(new PassThrough()).once('data', chunk => {
    //res.pipe(new PassThrough()).once('data', chunk => {
      // see http://stackoverflow.com/questions/37519828
      // TODO: this check may deserve to be it's own package with tests
      const dest = (chunk[0] & 0x0F) === 0x08
        ? zlib.createInflate(zlibOptions)
        : zlib.createInflateRaw(zlibOptions)
      return resolve(ref.body.pipe(dest))
    })
  } else {
    return reject(new TypeError('given contentEncoding not supported'))
  }
})

export default compressBody
