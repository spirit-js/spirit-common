const http = require("http")

class Request {
  constructor(url, method) {
    this.method = method
    this.hostname = "localhost"
    this.path = "/"
    this.port = 3009
    this.headers = {}
    return this
  }

  send(body) {
    this.body = body
    return this
  }

  set(k, v) {
    this.headers[k] = v
    return this
  }

  end(cb) {
    const req = http.request({
      method: this.method,
      path: this.path,
      hostname: this.hostname,
      port: this.port,
      headers: this.headers
    }, (res) => {
      let buf = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => {
        buf += chunk
      })

      res.on("end", () => {
        res.status = res.statusCode
        console.log(buf)
        res.body = buf
        cb(null, res)
      })
    })

    req.on("abort", () => {
      console.log("[client] client aborting")
    })

    req.on("aborted", () => {
      console.log("[client] server aborted")
    })

    req.on("socket", () => {
      console.log("[client] connecting")
    })

    req.on("response", () => {
      console.log("[client] got response")
    })

    req.on("close", () => {
      console.log("[client] closed")
    })

    req.on("error", (err) => {
      console.log("[client] err:", err)
      cb(err)
    })

    req.write(this.body)
    req.end()
  }
}

module.exports = {
  get: (url) => {
    return new Request(url, "GET")
  }
}
