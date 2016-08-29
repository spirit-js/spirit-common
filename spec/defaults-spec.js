const def = require("../lib/defaults")

describe("defaults", () => {
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
      { name: "ifmod", fn: make_test_middleware("ifmod") }
    ]
  })

  describe("defaults", () => {
    let _middleware_list = def.middleware_list

    beforeEach(() => {
      def.middleware_list = _mwlist
    })

    afterAll(() => {
      def.middleware_list = _middleware_list
    })

    it("returns a middleware that runs through a set of middlewares", (done) => {
      const middleware = def.defaults("api")
      expect(typeof middleware).toBe("function")
      expect(middleware.length).toBe(1)
      const handler = (req) => {
        expect(req.called).toBe("_log_ifmod")
        done()
      }
      const fn = middleware(handler)
      const mock_req = {
        called: "init",
        headers: {},
        req: () => { return mock_req }
      }
      fn(mock_req)
    })

    it("handles promise errors appropriately")

    it("order of middlewares is normal")

    it("return order of middleware is normal")
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

    it("when express key exist, it applies options and wraps itwith spirit-express", (done) => {
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
    })

    it("undefined argument or '' defaults to site config", () => {
      const cfg = def.config()
      const cfg2 = def.config("site")

      // everything will match except the session secret key
      // so test the non match and delete to make it easier to match
      expect(cfg.session.secret).not.toEqual(cfg2.session.secret)
      delete cfg.session.secret
      delete cfg2.session.secret

      expect(cfg).toEqual(cfg2)
    })
  })
})
