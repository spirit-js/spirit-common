"use strict"
const rewire = require("rewire")
const def = rewire("../lib/defaults")

const spirit = require("spirit")

describe("defaults internal", () => {
  let _config = {}
  let _mwlist = []

  const make_test_middleware = (test_string) => {
    test_string = "_" + test_string
    return (handler) => {
      return (request) => {
        request.called += test_string
        return handler(request).then((resp) => {
          resp += test_string
          return resp
        })
      }
    }
  }

  beforeEach(() => {
    _config = {
      a: true,
      b: { a: 1 },
      c: { d: { test: true }, f: false }
    }

    _mwlist = [
      { name: "a", fn: ()=>{} },
      { name: "b", fn: ()=>{} },
      { name: "c", x: "d", fn: ()=>{} },
      { name: "c", x: "f", fn: ()=>{} },
      { name: "log", fn: make_test_middleware("log") },
      { name: "ifmod", fn: make_test_middleware("ifmod") },
    ]
  })

  describe("defaults", () => {
    const _middleware_list = def.middleware_list
    let mock_req

    beforeEach(() => {
      mock_req = {
        called: "",
        headers: {},
        req: () => { return mock_req }
      }
      def.__set__("middleware_list", _mwlist)
    })

    afterEach(() => {
      def.__set__("middleware_list", _middleware_list)
    })

    it("returns a middleware that runs through a set of middlewares in correct order", (done) => {
      const middleware = def.defaults("api")
      expect(typeof middleware).toBe("function")
      expect(middleware.length).toBe(1)
      const handler = (req) => {
        expect(req.called).toBe("_log_ifmod")
        return "ok"
      }
      const fn = middleware(handler)

      fn(mock_req).then((resp) => {
        expect(resp).toBe("ok_ifmod_log")
        done()
      })
    })

    it("handles promise errors appropriately", (done) => {
      const middleware = def.defaults("site")
      const handler = (req) => {
        expect(req.called).toBe("_log_ifmod")
        throw "ok"
      }
      const fn = middleware(handler)

      fn(mock_req).catch((err) => {
        expect(err).toBe("ok")
        done()
      })
    })

    // basically, it can be re-used with spirit.compose
    it("returns a middleware than can be composed again", (done) => {
      let should_throw = false
      const defaults = def.defaults("api")
      const handler = (req) => {
        if (should_throw) throw "err"

        expect(req.called).toBe("_log_ifmod_custom")
        should_throw = true
        return "ok"
      }
      const test_mw = make_test_middleware("custom")
      const comp = spirit.compose(handler, [defaults, test_mw])

      comp(mock_req).then((resp) => {
        expect(resp).toBe("ok_custom_ifmod_log")
        comp(mock_req).catch((err) => {
          expect(err).toBe("err")
          done()
        })
      })
    })

    it("works fine with express middleware (they are wrapped correctly)", (done) => {
      const make_express_mw = (test_str) => {
        return (options) => {
          return (req, res, next) => {
            req.called += "_" + test_str
            mock_req.options.push(options)
            next()
          }
        }
      }

      _mwlist.push({ name: "session", fn: make_express_mw("session"), express: true })
      _mwlist.push({ name: "body", x: "json", fn: make_express_mw("body-json"), express: true })
      _mwlist.push({ name: "body", x: "urlencoded", fn: make_express_mw("body-urlencoded"), express: true })

      const comp = def.defaults("site")
      const handler = (req) => {
        expect(req.called).toBe("_log_ifmod_session_body-json_body-urlencoded")
        return "ok"
      }
      const fn = comp(handler)

      mock_req.options = []
      fn(mock_req).then((resp) => {
        expect(resp).toBe("ok_ifmod_log")
        // quick tests to test express middleware was initialized
        // with options set by "site" config
        expect(mock_req.options[0].httpOnly).toBe(true)
        expect(mock_req.options[1]).toEqual({ strict: true })
        expect(mock_req.options[2]).toEqual({ extended: true })
        done()
      })
    })

  })

  describe("generate", () => {
    it("a array of middlewares from config and passed in list", () => {
      const mw = def.generate(_config, _mwlist)
      expect(Array.isArray(mw)).toBe(true)
      expect(mw.length).toBe(3)
      expect(mw[0]).toBe(_mwlist[0].fn)
      expect(mw[1]).toBe(_mwlist[1].fn)
      expect(mw[2]).toBe(_mwlist[2].fn)
    })

    it("when express key exist, it applies options and wraps it with spirit-express", (done) => {
      _config = {
        test: {
          x1: { a: 1, b: 2 },
          x2: { a: 3, b: 4 }
        }
      }
      _mwlist = [
        { name: "test", x: "x1",
          fn: (opts) => {
            return (req, res, next) => {
              next(opts) // throws next(err)
            }
          },
          express: true
        },
        { name: "test", x: "x2",
          fn: (opts) => {
            return (req, res) => {
              return opts
            }
          }
        }
      ]
      const mw = def.generate(_config, _mwlist)
      mw[0](()=>{})({ req: () => { return {} } }).catch((err) => {
        expect(err).toEqual({ a: 1, b: 2 })
        // second middleware list doesn't get initialized
        // even though it has options in `config`
        // and doesn't get wrapped with spirit-express
        // and can be called/tested exactly
        const test = mw[1]("hi")()
        expect(test).toBe("hi")
        done()
      })
    })

    it("keys in the config that aren't known to the middleware list are skipped", () => {
      let mw = def.generate(_config, _mwlist)
      expect(mw.length).toBe(3)
      expect(mw[0]).toBe(_mwlist[0].fn)

      // emphasize above
      _mwlist = []
      mw = def.generate(_config, _mwlist)
      expect(mw.length).toBe(0)
    })

  })

  describe("mixin", () => {
    it("applies settings from second argument to the first", () => {
      const override = {
        a: false,
        b: { a: 10 },
        c: { f: false }
      }
      const set = def.mixin(_config, override)
      expect(set).toBe(_config) // keeps ref
      expect(set.b.a).toBe(10)
      override.b.a = 11
      expect(set.b.a).toBe(11) // keeps ref
      expect(set.a).toBe(false)
      expect(set.c.f).toBe(false)
    })

    // prevent overriding default configs with "true" property
    // when the default property is a object
    it("passing true to a config parameter that isn't bool by default will not set true as the paramter, instead leaves the default object untouched")
  })

  describe("config", () => {
    it("returns the api config", () => {
      const cfg = def.config("api")
      expect(cfg).toEqual({
        log: true,
        proxy: true,
        ifmod: true,
        body: {
          json: { strict: true },
          urlencoded: { extended: true },
          text: false
        }
      })
    })

    it("returns the site config (case insensitive)", () => {
      const cfg = def.config("SITE")
      // hard to test the secret key, test separately then remove
      expect(typeof cfg.session.secret).toBe("string")
      expect(cfg.session.secret.length > 10).toBe(true)
      delete cfg.session.secret

      expect(cfg).toEqual({
        log: true,
        proxy: true,
        ifmod: true,
        body: {
          json: { strict: true },
          urlencoded: { extended: true },
          text: false
        },
        session: {
          resave: false,
          saveUninitialized: true,
          httpOnly: true
        }
      })
    })

    it("unknown config string throws error", () => {
      expect(() => {
        const cfg = def.config("apiz")
      }).toThrowError(/No such configuration/)

      expect(() => {
        const cfg = def.config("123")
      }).toThrowError(/No such configuration/)

      expect(() => {
        const cfg = def.config()
      }).toThrowError(/No such configuration/)

      expect(() => {
        const cfg = def.config("")
      }).toThrowError(/No such configuration/)
    })

    it("api config is the same as site config, except without session", () => {
      const api = def.config("api")
      const site = def.config("site")
      // remove the session config
      delete site.session
      // then they are the same
      expect(api).toEqual(site)
    })

  })
})
