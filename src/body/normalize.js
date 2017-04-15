import isNil from 'is-nil'
import typeofObject from 'typeof-object'
import Stream from 'stream'

const isStringStreamBufferOrBlob = x => typeof x === 'string'
  || x instanceof Stream
  || Buffer.isBuffer(x)
  || typeofObject(x) === 'Blob'

const normalizeBody = body => {
  if (isNil(body)) {
    return null
  } else if (isStringStreamBufferOrBlob(body)) {
    return body
  }
  return String(body)
}

export default normalizeBody
