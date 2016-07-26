const parser = require("co-body")

module.exports = (handler) => {
  return (request) => {
    return parser(request.req())
      .then((body) => {
        request.body = body
        return handler(request)
      })
      .catch((err) => {
        // this could be an actual err,
        // or a unknown content-type err (not important)
        // but just surpress all
        return handler(request)
      })
  }
}
