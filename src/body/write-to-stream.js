import isNil from 'is-nil'
import typeofObject from 'typeof-object'
import { BUFFER } from '../blob.js'

const writeBodyToStream = (body, stream) => {
  if (isNil(body)) {
    stream.end()
  } else if (typeofObject(body) === 'String' || Buffer.isBuffer(body)) {
    stream.write(body)
    stream.end()
  } else if (typeofObject(body) === 'Blob') {
    stream.write(body[BUFFER])
    stream.end()
  } else { // body is stream
    body.pipe(stream)
  }
}

export default writeBodyToStream
