import { _checkInvalidHeaderChar, _checkIsHttpToken } from '_http_common'

const EMSG_CONSTRUCT = `Failed to construct 'Headers'`
const EMSG_INIT_BAD_TYPE = 'No matching constructor signature.'
const EMSG_INIT_ITEM_BAD_TYPE = 'The value provided is neither an array, nor does it have indexed properties.'
const EMSG_INIT_ITEM_BAD_LENGTH = 'Pair should contain exactly two items.'
const EMSG_BAD_NAME = 'Invalid name'
const EMSG_BAD_VALUE = 'Invalid value'

const sanitizeName = name => {
  name = String(name)
  if (!_checkIsHttpToken(name)) {
    throw new TypeError(`${EMSG_BAD_NAME} "${name}"`)
  }
  return name.toLowerCase()
}

const sanitizeValue = value => {
  value = String(value).trim()
  if (_checkInvalidHeaderChar(value)) {
    throw new TypeError(`${EMSG_BAD_VALUE} "${value}"`)
  }
  return value
}

const fillWithInit = (headers, init) => {
  let pairs
  try {
    if (typeof init !== 'object') {
      throw new TypeError()
    }
    pairs = init[Symbol.iterator] ? init : Object.entries(init)
  } catch (err) {
    throw new TypeError(EMSG_INIT_BAD_TYPE)
  }

  for (let pair of pairs) {
    if (typeof pair !== 'object') {
      throw new TypeError(EMSG_INIT_ITEM_BAD_TYPE)
    }

    pair = [ ...pair ] // make Set act like an array

    if (pair.length !== 2) {
      throw new TypeError(EMSG_INIT_ITEM_BAD_LENGTH)
    }

    headers.append(pair[0], pair[1])
  }
}

// TODO: guard https://fetch.spec.whatwg.org/#concept-headers-guard

const Headers = function (init) {

  const map = Object.create(null)

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

  const delete_ = name => {
    delete map[sanitizeName(name)]
  }

  const get = name => {
    const list = map[sanitizeName(name)]
    if (!list) {
      return null
    }
    return list.join(',')
  }

  const getMapKeys = () => Object.keys(map).sort()

  const makeIterator = (getNext) => {
    const Iterator = () => {
      let idx = 0

      return {
        [Symbol.iterator]: Iterator,
        next: () => {
          const names = getMapKeys()
          if (idx < names.length) {
            const name = names[idx]
            ++idx
            return { done: false, value: getNext(name) }
          } else {
            return { done: true }
          }
        }
      }
    }

    return Iterator
  }

  const forEach = cb => {
    return getMapKeys().forEach(key => {
      return cb(get(key), key, headers)
    })
  }

  const entries = makeIterator(name => [ name, get(name) ])
  const keys = makeIterator(name => name)
  const values = makeIterator(name => get(name))

  const headers = Object.assign(Object.create(Headers.prototype), {
    append,
    delete: delete_,
    entries,
    get,
    has,
    keys,
    set,
    values,
    forEach,
    raw: () => map
  })

  headers[Symbol.iterator] = entries

  Object.keys(headers).forEach(key => {
    Object.defineProperty(headers, key, {
      enumerable: false
    })
  })

  Object.defineProperty(headers, Symbol.toStringTag, {
    value: 'Headers',
    writable: false,
    enumerable: false
  })

  try {
    if (arguments.length) {
      fillWithInit(headers, init)
    }
  } catch (err) {
    err.message = `${EMSG_CONSTRUCT}: ${err.message}`
    throw err
  }

  return headers
}

export default Headers
