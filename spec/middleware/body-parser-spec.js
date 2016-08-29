/*
const parser = require("../../lib/middleware/body-parser")

const spirit = require("spirit")
const http = require("http")
const request = require("superagent")

describe("body-parser", () => {
  var server
  var result

  beforeAll(() => {
    const handler = (request) => {
      result = request.body
      return { status: 200, headers: {} }
    }

    server = http.createServer(spirit.node.adapter(handler, [parser()]))
    server.listen(3009)
  })

  beforeEach(() => {
    result = undefined
  })

  afterAll(() => {
    server.close()
  })

  it("json ok", (done) => {
    request.get("http://localhost:3009")
      .send({ a: 1, b: 2 })
      .end((err, res) => {
        expect(res.text).toBe("")
        expect(res.status).toBe(200)
        expect(result).toEqual({
          a: 1,
          b: 2
        })
        done()
      })
  })

  it("form ok", (done) => {
    request.get("http://localhost:3009")
      .send("name=hi")
      .send("id=1")
      .end((err, res) => {
        expect(res.status).toBe(200)
        expect(result).not.toBe(null)
        expect(typeof result).toBe("object")
        expect(Object.keys(result).length).toBe(2)
        expect(result.name).toEqual("hi")
        expect(result.id).toEqual("1")
        done()
      })
  })

  it("text ok", (done) => {
    request.get("http://localhost:3009")
      .set("Content-Type", "text/plain")
      .send("hello how are you")
      .end((err, res) => {
        expect(res.status).toBe(200)
        expect(result).toBe("hello how are you")
        done()
      })
  })

  it("unknown content-type is ignored, should be undefined request body", (done) => {
    request.get("http://localhost:3009")
      .set("Content-Type", "a")
      .send("hello how are you")
      .end((err, res) => {
        expect(res.status).toBe(200)
        expect(result).toBe(undefined)
        done()
      })
  })

})
*/
