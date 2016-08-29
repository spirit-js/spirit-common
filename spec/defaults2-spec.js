const spirit = require("spirit")
const defaults = require("../index").defaults

describe("defaults", () => {

  // not tested part of the "site" setup: log, body-parser
  it("with mock setup", (done) => {
    const test_date = Date.now()
    const mw = defaults("site")
    const handler = (req) => {
      // -> express-session sets itself for requests
      expect(typeof req.session.cookie).toBe("object")
      // -> proxy middleware set the correct ip
      expect(req.ip).toBe("4.1.1.1")
      return { status: 200, headers: {
        "Last-Modified": test_date // <- this will trigger ifmod
      }, body: "ok" }
    }
    const comp = spirit.compose(handler, [mw])
    const mock_req = {
      method: "GET",
      url: "/test",
      ip: "1.1.1.1",
      headers: {
        "if-modified-since": test_date,
        "x-forwarded-for": "4.1.1.1, 5.5.5.5"
      },
      req: () => { return mock_req }
    }
    comp(mock_req).then((resp) => {
      expect(resp.status).toBe(304) // <- ifmod sets 304
      // -> express-session sets response headers
      expect(resp.headers["set-cookie"].length).toBe(1)
      expect(resp.body).toBe("ok")
      done()
    })
  })

})

