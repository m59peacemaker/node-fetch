import consumeBodyCore from './consume'
import convertBody from './convert'
import Blob, { BUFFER } from '../blob.js'

const defaults = {
  bodyUsed: false,
  size: 0,
  timeout: 0
}

const mixin = instance => {

  const consumeBody = () => {
    const { body, size, timeout, url } = instance
    if (instance.bodyUsed) {
      return Promise.reject(new Error(`body used already for: ${url}`))
    }
    instance.bodyUsed = true
    return consumeBodyCore({ body, size, timeout, url })
  }

  const arrayBuffer = () => consumeBody(instance)
    .then(buffer => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ))

  const blob = () => {
    const contentType = instance.headers && instance.headers.get('content-type') || ''
    return consumeBody()
      .then(buffer => Object.assign( // prevent copying
        new Blob([], { type: contentType }),
        { [BUFFER]: buffer }
      ))
  }

  const buffer = () => consumeBody()

  const json = () => consumeBody()
    .then(buffer => JSON.parse(buffer.toString()))

  const text = () => consumeBody()
    .then(buffer => buffer.toString())

  const textConverted = () => consumeBody()
    .then(buffer => {
      return convertBody(buffer, instance.headers)})

  Object.keys(defaults).forEach(k => {
    instance[k] = instance[k] || defaults[k]
  })

  return Object.assign(instance, {
    arrayBuffer,
    blob,
    json,
    text,
    buffer,
    textConverted
  })
}

export default mixin
