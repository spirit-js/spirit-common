const Promise = require("bluebird")

module.exports = function shared_specs(context) {
  const middleware = context.middleware
  const req = context.req

  it("handles non-response returns (by just exiting early)", (done) => {
    const next = () => {
      return Promise.resolve(undefined)
    }
    const mw = middleware(next)
    mw(req).then((result) => {
      expect(result).toBe(undefined)
      done()
    })
  })
}
