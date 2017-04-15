import Stream, { PassThrough } from 'stream'
import typeofObject from 'typeof-object'

const cloneStream = stream => {
  const clone = new PassThrough()
  stream.pipe(clone)
  return clone
}

const cloneBody = instance => {
  const { body, bodyUsed } = instance

  if (bodyUsed) {
    throw new Error('cannot clone body after it is used')
  }

  // TODO: find a way to clone FormData

  if (body instanceof Stream && typeofObject(body) !== 'FormData') {
    instance.body = cloneStream(body)
    return cloneStream(body)
  }

  return body
}

export default cloneBody
