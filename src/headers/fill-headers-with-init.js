import tryCatch from 'try_catch'

const EMSG_INIT_BAD_TYPE = 'No matching constructor signature.'
const EMSG_INIT_ITEM_BAD_TYPE = 'The value provided is neither an array, nor does it have indexed properties.'
const EMSG_INIT_ITEM_BAD_LENGTH = 'Pair should contain exactly two items.'

const fillHeadersWithInit = (headers, init) => {
  const pairs = tryCatch(() => {
    if (typeof init !== 'object') { // may iterate like an empty object
      throw new TypeError()
    }

    // When iterating an instance of headers, multiple values are represented as a comma delimited string. The `set-cookie` header may contain a single value that has a comma, and will therefore be corrupted. The workaround for now is to use `headers._raw()['set-cookie']` to get the array of values. In order to preserve the array, instead of iterating the instance of headers, we will iterate its raw object store.
    // https://github.com/bitinn/node-fetch/issues/251
    if (typeof init._raw === 'function') {
      init = init._raw()
    }
    return init[Symbol.iterator] ? init : Object.entries(init)
  }, () => {
    throw new TypeError(EMSG_INIT_BAD_TYPE)
  })

  for (let pair of pairs) {
    if (typeof pair !== 'object') {
      throw new TypeError(EMSG_INIT_ITEM_BAD_TYPE)
    }

    pair = [ ...pair ] // make Set act like an array

    if (pair.length !== 2) {
      throw new TypeError(EMSG_INIT_ITEM_BAD_LENGTH)
    }

    const [ name, right ] = pair
    const values = Array.isArray(right) ? right : [ right ]
    values.forEach(v => headers.append(name, v))
  }
}

export default fillHeadersWithInit
