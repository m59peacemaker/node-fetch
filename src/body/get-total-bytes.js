import typeofObject from 'typeof-object'
import isNil from 'is-nil'

const getTotalBytes = body => {
  if (isNil(body)) {
    return 0
  } else if (typeof body === 'string') {
    return Buffer.byteLength(body)
  } else if (typeofObject(body) === 'Blob') {
    return body.size
  } else if (Buffer.isBuffer(body)) {
    return body.length
  } else if (typeofObject(body) === 'FormData' && body.hasKnownLength()) {
    return body.getLengthSync()
  } else {
    return null
  }
}

export default getTotalBytes
