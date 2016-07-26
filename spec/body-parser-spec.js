const parser = require("../lib/body-parser")

const spirit = require("spirit")
const http = require("http")
const request = require("superagent")

describe("body-parser", () => {
  let server

  beforeAll(() => {
    const handler = (request) => {
      return request.body
    }

    server = http.createServer(spirit.node.adapter(handler, [parser]))
    server.listen(3009)
  })

  afterAll(() => {
    server.close()
  })

  it("ok", (done) => {
    request.get("http://localhost:3009")
      .end((err, res) => {
        expect(res.status).toBe(200)
        expect(res.text).toBe("")
        done()
      })
    
  })

})
