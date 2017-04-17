import setTypeofObject from '../lib/set-typeof-object'
import { sanitizeName, sanitizeValue } from './sanitize'
import fillHeadersWithInit from './fill-headers-with-init'
import MakeIterator from './make-iterator'

const EMSG_CONSTRUCT = `Failed to construct 'Headers'`

const Headers = function (init) {

  const map = Object.create(null)

  const getMapKeys = () => Object.keys(map).sort()

  const has = name => !!map[sanitizeName(name)]

  const set = (name, value) => {
    map[sanitizeName(name)] = [ sanitizeValue(value) ]
  }

  const append = (name, value) => {
    if (has(name)) {
      map[sanitizeName(name)].push(sanitizeValue(value))
    } else {
      set(name, value)
    }
  }

  const del = name => {
    delete map[sanitizeName(name)]
  }

  const get = name => {
    const list = map[sanitizeName(name)]
    return list ? list.join(',') : null
  }

  const forEach = cb => {
    return getMapKeys().forEach(key => {
      return cb(get(key), key, headers)
    })
  }

  const makeIterator = MakeIterator(getMapKeys)
  const entries = makeIterator(name => [ name, get(name) ])
  const keys = makeIterator(name => name)
  const values = makeIterator(name => get(name))

  const headers = Object.assign(
    Object.create(Headers.prototype),
    {
      append,
      delete: del,
      entries,
      get,
      has,
      keys,
      set,
      values,
      forEach,
      _raw: () => map
    }
  )

  headers[Symbol.iterator] = entries

  setTypeofObject('Headers', headers)

  Object.keys(headers).forEach(key => {
    Object.defineProperty(headers, key, {
      enumerable: false
    })
  })

  try {
    if (arguments.length) {
      fillHeadersWithInit(headers, init)
    }
  } catch (err) {
    err.message = `${EMSG_CONSTRUCT}: ${err.message}`
    throw err
  }

  return headers
}

export default Headers
