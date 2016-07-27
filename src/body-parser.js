// TODO
// implementation relies on raw-body thus global Promise to exist

const typeis = require("type-is")
const inflate = require("inflation")
const parser = require("raw-body")
const qs = require("querystring")

const types = {
  json: {
    type_string: ["json", "application/*+json", "application/csp-report"],
    run: (req, opts) => {
      opts.limit = opts.limit || "1mb"
      return parser(req, opts).then((result) => {
        return JSON.parse(result)
      })
    }
  },

  form: {
    type_string: ["urlencoded"],
    run: (req, opts) => {
      opts.limit = opts.limit || "56kb"
      return parser(req, opts).then((result) => {
        return qs.parse(result)
      })
    }
  },

  text: {
    type_string: ["text"],
    run: (req, opts) => {
      opts.limit = opts.limit || "1mb"
      return parser(req, opts)
    }
  }
}

const default_opts = (opts, req) => {
  const len = req.headers["content-length"]
  const encoding = req.headers["content-encoding"] || "identity"
  if (len && encoding === "identity") opts.length = ~~len
  opts.encoding = opts.encoding || "utf8"
  return opts
}

module.exports = (opts) => {
  const check = Object.keys(types)
  if (opts === undefined) opts = {}
  check.forEach((t) => {
    if (opts[t] === undefined) opts[t] = {}
  })

  return (handler) => {
    return (request) => {
      const req = request.req()
      const ctype = request.headers["content-type"]
      // typeis() already does these checks, but do it here
      // for quicker exit
      if (typeis.hasBody(req) === false || ctype === undefined) {
        return handler(request)
      }

      for (var i = 0; i < check.length; i++) {
        var t = check[i]
        if (opts[t] !== false
            && typeis.is(ctype, types[t].type_string)) {
          return types[t].run(inflate(req), default_opts(opts[t], req))
            .then((body) => {
              request.body = body
              return handler(request)
            })
        }
      }

      return handler(request)
    }
  }
}
