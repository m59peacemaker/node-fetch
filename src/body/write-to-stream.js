const typeofObject = require('typeof-object')
import { BUFFER } from '../blob.js'

const writeToStream = (body, stream) => {
  if (body === null) {
    stream.end()
  } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
    stream.write(body)
    stream.end()
  } else if (typeofObject(body) === 'Blob') {
    stream.write(body[BUFFER])
    stream.end()
  } else { // body is stream
    body.pipe(stream)
  }
}

export default writeToStream
