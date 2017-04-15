import typeofObject from 'typeof-object'

const getContentType = body => {
  switch (typeofObject(body)) {
    case 'String': return 'text/plain;charset=UTF-8'
    case 'FormData': return `multipart/form-data;boundary=${body.getBoundary()}`
    case 'Blob': return body.type || null
    default: return null
  }
}

export default getContentType
