import { _checkInvalidHeaderChar, _checkIsHttpToken } from '_http_common'

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

export {
  sanitizeName,
  sanitizeValue
}
