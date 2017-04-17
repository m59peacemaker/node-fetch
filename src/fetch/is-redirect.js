const isRedirect = code => /^30[12378]$/.test(code)

export default isRedirect
