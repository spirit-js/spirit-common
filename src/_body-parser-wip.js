/*
 * This is a work in progress, ignore for now...
 */

const Promise = require("bluebird")

const get_content_type = (t) => {
}

const parser = (typ, buf) => {
  
}

const read = (stream, typ, size, max_read) => {
  const encoding = "utf8"
  const buf = Buffer.from("", encoding)
  let len = 0

  if (max_read === undefined) max_read = 0

  typ = get_content_type(typ)

  // nothing to do & not an error
  if (typeof typ === "undefined" || size === 0) {
    return Promise.resolve()
  }

  if (size > max_read) {
    return Promise.reject("Content is larger than the maximum read limit")
  }

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      len += chunk.length

      if (len > size || (max_read !== 0 && len > max_read)) {
        // reject and close stream
        return stream.close()
        //reject("Content exceeded maximum read limit or content-length mismatch")
      }

      buf.push(chunk)
    })

    stream.on("error", (err) => {
      reject(err)
    })

    stream.on("close", () => {
      reject("closed early")
    })

    stream.on("end", () => {
      if (buf.length === 0) {
        resolve()
      } else {
        resolve(parser(typ, buf))
      }
    })
  })
}

const middleware = (handler) => {
  return (request) => {
    return read(request.req(), request.headers["content-type"], request.headers["content-length"])
      .then((body) => {
        request.body = body
        return handler(request)
      })
  }
}

module.exports = {
  parser,
  read,
  middleware
}
