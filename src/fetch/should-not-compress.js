// in following scenarios we ignore compression support
// 1. compression support is disabled
// 2. HEAD request
// 3. no Content-Encoding header
// 4. no content response (204)
// 5. content not modified response (304)


const shouldNotCompress = (request, response) => !request.compress
  || request.method === 'HEAD'
  || [ 204, 304 ].includes(response.status)
  || !response.headers.has('content-encoding')

export default shouldNotCompress
