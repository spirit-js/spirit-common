const if_mod = require("../../index.js").middleware.ifmod
const Promise = require("bluebird")

describe("Middleware: if-modified", () => {

  const req = {
    method: "GET",
    headers: {
      "if-modified-since": new Date()
    }
  }

  const req_ts = req.headers["if-modified-since"]

  it("last-mod matches", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {"Last-Modified": req_ts},
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    mw(req).then((response) => {
      expect(response.status).toBe(304)
      expect(response.headers).toEqual({
        "Last-Modified": req_ts
      })
      //expect(response.body).toBe(undefined)
      done()
    })
  })

  it("last-mod exists but doesn't match", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {"Last-Modified": new Date()},
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    mw(req).then((response) => {
      expect(response.status).toBe(200)
      expect(response.headers["Last-Modified"]).not.toBe(req_ts)
      expect(response.body).toBe("abc123")
      done()
    })
  })

  it("leaves as-is if no last-mod", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {},
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    mw(req).then((response) => {
      expect(response.status).toBe(200)
      expect(Object.keys(response.headers).length).toBe(0)
      expect(response.body).toBe("abc123")
      done()
    })
  })

  it("if-none-match matches", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {
          eTag: "686897696a7c876b7e"
        },
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    const r = {
      method: "GET",
      headers: {
        "if-none-match": "686897696a7c876b7e"
      }
    }

    mw(r).then((response) => {
      expect(response.status).toBe(304)
      expect(Object.keys(response.headers).length).toBe(1)
      // TODO currently doesn't strip body
      //expect(response.body).toBe(undefined)
      done()
    })
  })

  it("if-none-match exists but does not match", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {
          etag: "686897696a7c876b7e11111"
        },
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    const r = {
      method: "GET",
      headers: {
        "if-none-match": "686897696a7c876b7e"
      }
    }

    mw(r).then((response) => {
      expect(response.status).toBe(200)
      expect(Object.keys(response.headers).length).toBe(1)
      expect(response.body).toBe("abc123")
      done()
    })
  })

  it("if-none-match exists but does not match and if-modified is skipped", (done) => {
    const ts = Date.now()
    const mw = if_mod((request) => {
      const resp = {
        status: 200,
        headers: {
          etag: "686897696a7c876b7e11111",
          "Last-Modified": ts
        },
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    const r = {
      method: "GET",
      headers: {
        "if-none-match": "686897696a7c876b7e",
        "if-modified-since": ts
      }
    }

    mw(r).then((response) => {
      expect(response.status).toBe(200)
      expect(Object.keys(response.headers).length).toBe(2)
      expect(response.body).toBe("abc123")
      done()
    })
  })

  // same tests as "if-last-mod matches" which will run
  // the middleware
  // but change the response status to see that it ignores
  it("ignores non 2xx responses", (done) => {
    const mw = if_mod((request) => {
      const resp = {
        status: 199,
        headers: {"Last-Modified": req_ts},
        body: "abc123"
      }
      return Promise.resolve(resp)
    })

    mw(req).then((response) => {
      expect(response.status).toBe(199)
      expect(response.headers).toEqual({
        "Last-Modified": req_ts
      })
      expect(response.body).toBe("abc123")
      done()
    })
  })

  it("handles non-response returns (by just exiting early)", (done) => {
    const next = () => {
      return Promise.resolve(undefined)
    }
    const mw = if_mod(next)
    mw(req).then((result) => {
      expect(result).toBe(undefined)
      done()
    })
  })

/*
  const shared = require("./_shared")
  shared({
    middleware: if_mod,
    req: req
  })
*/
})
