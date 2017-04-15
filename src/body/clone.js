import Stream, { PassThrough } from 'stream'
import typeofObject from 'typeof-object'

const clone = ({ body, bodyUsed }) => {
  // TODO: perhaps this check belongs in the caller
  if (bodyUsed) {
    throw new Error('cannot clone body after it is used')
  }

  // TODO: find a way to clone FormData

  if (body instanceof Stream && typeofObject(body) !== 'FormData') {
    const p = new PassThrough()
    body.pipe(p)
    return p
  }

  return body
}

module.exports = clone
