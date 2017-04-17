import { PassThrough } from 'stream'
import Response from '../response'

const nodeResponseToFetchResponse = res => new Response(res.pipe(new PassThrough()), {
  url: res.url,
  status: res.statusCode,
  statusText: res.statusMessage,
  headers: res.headers
})

export default nodeResponseToFetchResponse
