import test from 'tape'
import Headers from './'

const METHODS = [
  'append',
  'delete',
  'entries',
  'get',
  'has',
  'keys',
  'set',
  'values'
]

test('instance has spec methods', t => {
  const headers = new Headers()
  METHODS.forEach(method => {
    t.equal(typeof headers[method], 'function')
  })

  t.end()
})

test('instance has no object keys', t => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  t.equal(Object.keys(headers).length, 0)

  t.end()
})

test('instance should be instanceof Headers', t => {
  const headers = new Headers()
  t.true(headers instanceof Headers)

  t.end()
})

test('toString', t => {
  const headersString = '[object Headers]'
  const headers = new Headers()
  t.equal(headers.toString(), headersString, headersString)

  t.end()
})

test('set', t => {
  const headers = new Headers()
  headers.set('Content-Type', 'text/plain')
  t.equal(headers.get('Content-Type'), 'text/plain', 'set header')
  headers.set('Content-Type', 'text/html')
  t.equal(headers.get('Content-Type'), 'text/html', 'set header')

  t.end()
})

test('get', t => {
  const headers = new Headers()
  headers.set('Content-Type', 'text/plain')
  t.equal(headers.get('Content-Type'), 'text/plain', 'got header')
  headers.delete('Content-Type')
  t.true(headers.get('Content-Type') === null, 'returned null for non-existing header')

  t.end()
})


test('append', t => {
  const headers = new Headers()
  headers.append('a', '1')
  t.equal(headers.get('a'), '1')

  headers.append('a', '2')
  t.equal(headers.get('a'), '1,2')

  headers.set('a', '1')
  t.equal(headers.get('a'), '1')

  headers.append('a', '2')
  headers.append('a', '3')
  t.equal(headers.get('a'), '1,2,3')

  t.end()
})

test('has', t => {
  const headers = new Headers()
  headers.set('a', '1')
  t.true(headers.has('a') === true)
  headers.delete('a')
  t.true(headers.has('a') === false)
  headers.append('a', '123')
  t.true(headers.has('a'))

  t.end()
})

test('delete', t => {
  const headers = new Headers()
  headers.set('a', '1')
  headers.delete('a')
  t.equal(headers.get('a'), null)

  t.end()
})

test('construct headers with init object', t => {
  const h = new Headers({ 'Content-Type': 'text/xml', 'Breaking-Bad': '<3' })
  t.equal(h.get('Content-Type'), 'text/xml')

  t.end()
})

test('construct headers with init array', t => {
  const h = new Headers([
    [ 'Content-Type', 'text/xml' ],
    [ 'Breaking-Bad', '<3' ]
  ])
  t.equal(h.get('Breaking-Bad'), '<3')

  t.end()
})

test('construct headers with init object', t => {
  const h = new Headers({ 'set-cookie': [ 'a=1', 'b=1' ], foo: 123 })
  t.equal(h.get('Set-Cookie'), 'a=1,b=1', 'array value')
  t.equal(h.get('foo'), '123', 'number value')

  t.end()
})

test('when init header value is an array, it is treated as multiple values internally', t => {
  // https://github.com/bitinn/node-fetch/issues/251

  t.test('array of pairs', t => {
    const h = new Headers([ [ 'set-cookie', [ 'a=1', 'b=1' ] ] ])
    t.deepEqual(h._raw(), { 'set-cookie': [ 'a=1', 'b=1' ] })

    t.end()
  })

  t.test('object', t => {
    const h = new Headers({ 'set-cookie': [ 'a=1', 'b=1' ] })
    t.deepEqual(h._raw(), { 'set-cookie': [ 'a=1', 'b=1' ] })

    t.end()
  })
})

test('raw arrays are preserved when passing headers instance as init', t => {
  // see comment in fill-headers-with-init.js
  const h = new Headers({ 'set-cookie': [ 'a=1', 'b=1' ] })
  t.deepEqual(new Headers(h)._raw(), { 'set-cookie': [ 'a=1', 'b=1' ] })

  t.end()
})

test('construct headers with other iterables', t => {
  const headers = new Headers([
    new Set(['a', '1']),
    ['b', '2'],
    new Map([['a', null], ['3', null]]).keys()
  ])
  t.equal(headers.get('a'), '1,3')
  t.equal(headers.get('b'), '2')

  t.end()
})

test('construct headers with bad input should throw', t => {
  const baseMsg = `Failed to construct 'Headers':`
  const badTypeMsg = `${baseMsg} No matching constructor signature.`
  const badPairMsg = `${baseMsg} The value provided is neither an array, nor does it have indexed properties.`
  const badPairLengthMsg = `${baseMsg} Pair should contain exactly two items.`
  const badPairNameMsg = `${baseMsg} Invalid name`
  const badPairValueMsg = `${baseMsg} Invalid value`
  ;[
    {
      arg: 123,
      msg: badTypeMsg,
      diag: 'init as a number'
    },
    {
      arg: 'abc',
      msg: badTypeMsg,
      diag: 'init as a string'
    },
    {
      arg: [ 'Content-Type', 'accept' ],
      msg: badPairMsg,
      diag: 'array of strings'
    },
    {
      arg: [ [ 'Content-Type' ], [ 'accept' ] ],
      msg: badPairLengthMsg,
      diag: 'array of single value arrays'
    },
    {
      arg: { 'He y': 'ok' },
      msg: badPairNameMsg + ' "He y"',
      diag: 'illegal header name'
    },
    {
      arg: { 'He-y': 'ăk' },
      msg: badPairValueMsg + ' "ăk"',
      diag: 'illegal header value'
    }
  ].forEach(({ arg, msg, diag }) => {
    try {
      new Headers(arg)
      t.fail(diag)
    } catch (err) {
      t.pass(diag)
      t.equal(err.name, 'TypeError', 'threw TypeError')
      t.equal(err.message, msg)
    }
  })

  t.end()
})

test('throws when given illegal header', t => {
  const headers = new Headers()
  ;[
    () => new Headers({ 'He y': 'ok' }),
    () => new Headers({ 'Hé-y': 'ok' }),
    () => new Headers({ 'He-y': 'ăk' }),
    () => headers.append('Hé-y', 'ok'),
    () => headers.delete('Hé-y'),
    () => headers.get('Hé-y'),
    () => headers.has('Hé-y'),
    () => headers.set('Hé-y', 'ok')
  ].forEach(fn => {
    try {
      fn()
      t.fail('did not throw on illegal header')
    } catch (err) {
      t.equal(err.name, 'TypeError', 'threw TypeError')
    }
  })

  t.end()
})

test('instance should be iterable', t => {
  const input = {
    a: '0',
    b: '1',
    c: '2',
    d: '3',
    e: '4',
    'content-type': 'application/json'
  }
  const headers = new Headers(input)
  const h = {}
  for (const [ k, v ] of headers) {
    h[k] = v
  }
  t.deepEqual(h, input)

  t.end()
})

test('entries', t => {
  const input = {
    b: '1',
    a: '0',
    d: '3',
    c: '2'
  }
  const headers = new Headers(input)
  const iter = headers.entries()
  iter.next()
  iter.next()
  t.deepEqual(iter.next(), { done: false, value: [ 'c', '2' ] })
  iter.next()
  t.deepEqual(iter.next(), { done: true })

  const pairs = []
  for (const p of headers.entries()) {
    pairs.push(p)
  }
  t.deepEqual(pairs, [
    [ 'a', '0' ],
    [ 'b', '1' ],
    [ 'c', '2' ],
    [ 'd', '3' ]
  ], 'entries are iterable and sorted by key')

  t.end()
})

test('keys', t => {
  const input = {
    b: '1',
    a: '0',
    d: '3',
    c: '2'
  }
  const keys = []
  const headers = new Headers(input)
  for (const k of headers.keys()) {
    keys.push(k)
  }
  t.deepEqual(keys, [ 'a', 'b', 'c', 'd' ], 'keys are iterable and sorted')

  t.end()
})

test('values', t => {
  const input = {
    b: '1',
    a: '0',
    d: '3',
    c: '2'
  }
  const values = []
  const headers = new Headers(input)
  for (const k of headers.values()) {
    values.push(k)
  }
  t.deepEqual(values, [ '0', '1', '2', '3' ], 'values are iterable and sorted by key')

  t.end()
})

test('leading and trailing whitespace is trimmed from values', t => {
  const headers = new Headers({ a: ' 1 ' })
  t.equal(headers.get('a'), '1', 'passed in init')

  headers.set('b', ' 2 ')
  t.equal(headers.get('b'), '2', 'set by set()')

  headers.set('c', ' 3 ')
  headers.append('c', ' 3 ')
  t.equal(headers.get('c'),'3,3', 'set by set() and appended to with append()')

  headers.append('d', ' 4 ')
  t.equal(headers.get('d'),'4', 'set by append()')

  t.end()
})

test('ignores unsupported attributes while reading headers', t => {
  const FakeHeader = function () {}
  FakeHeader.prototype.z = 'fake'

  const init = Object.assign(new FakeHeader(), {
    a: 'string',
    b: [ '1', '2' ],
    c: '',
    d: [],
    e: 1,
    f: [ 1, 2 ],
    g: { a: 1 },
    h: undefined,
    i: null,
    j: NaN,
    k: true,
    l: false,
    m: new Buffer('test')
  })

  const h = new Headers(init)
  h.set('n', [1, 2])
  h.append('n', ['3', 4])

  t.deepEqual(h._raw(), {
    a: [ 'string' ],
    b: [ '1','2' ],
    c: [ '' ],
    e: [ '1' ],
    f: [ '1', '2' ],
    g: [ '[object Object]' ],
    h: [ 'undefined' ],
    i: [ 'null' ],
    j: [ 'NaN' ],
    k: [ 'true' ],
    l: [ 'false' ],
    m: [ 'test' ],
    n: [ '1,2', '3,4' ]
  })

  t.equal(h.get('a'), 'string')
  t.equal(h.get('b'), '1,2')
  t.equal(h.get('c'), '')
  t.equal(h.get('d'), null)
  t.equal(h.get('e'), '1')
  t.equal(h.get('f'), '1,2')
  t.equal(h.get('g'), '[object Object]')
  t.equal(h.get('h'), 'undefined')
  t.equal(h.get('i'), 'null')
  t.equal(h.get('j'), 'NaN')
  t.equal(h.get('k'), 'true')
  t.equal(h.get('l'), 'false')
  t.equal(h.get('m'), 'test')
  t.equal(h.get('n'), '1,2,3,4')
  t.equal(h.get('z'), null)

  t.end()
})

test('doest not mutate init headers', t => {
  const h1 = new Headers({ a: '1' })

  const h2 = new Headers(h1)
  h2.set('b', '1');

  const h3 = new Headers(h2)
  h3.append('a', '2')

  t.deepEqual(h1._raw(), { a: [ '1' ] })
  t.deepEqual(h2._raw(), { a: [ '1' ], b: [ '1' ] })
  t.deepEqual(h3._raw(), { a: [ '1', '2' ], b: [ '1' ] })

  t.end()
})


