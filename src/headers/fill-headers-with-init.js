import tryCatch from 'try_catch'

const EMSG_INIT_BAD_TYPE = 'No matching constructor signature.'
const EMSG_INIT_ITEM_BAD_TYPE = 'The value provided is neither an array, nor does it have indexed properties.'
const EMSG_INIT_ITEM_BAD_LENGTH = 'Pair should contain exactly two items.'

const fillHeadersWithInit = (headers, init) => {
  const pairs = tryCatch(() => {
    if (typeof init !== 'object') { // may iterate like an empty object
      throw new TypeError()
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

    headers.append(pair[0], pair[1])
  }
}

export default fillHeadersWithInit
