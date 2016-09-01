const {compose} = require("spirit")
const exp_compat = require("spirit-express")

const middleware = require("./middleware")

// express middleware
const body_parser = require("body-parser")
const express_session = require("express-session")

const random_string = () => {
  return Date.now().toString() + Math.random().toString()
}

const config = (key) => {
  const cfg = {
  // every config uses these
  api: {
    log: true,
    proxy: true,
    ifmod: true,
    body: {
      json: { strict: true },
      urlencoded: { extended: true },
      text: false
    }
  },

  // site config (+ api)
  site: {
    session: {
      secret: random_string(), // user should pass their own
      //secure: true, // ssl sites should enable this
      //store: ...,   // NOTE user should pass in this always
      resave: false,
      saveUninitialized: true,
      httpOnly: true
    }
  }
  }

  key = key || "site"
  const keylc = key.toLowerCase()
  if (cfg[keylc]) {
    if (keylc === "api") return cfg.api
    return mixin(cfg.api, cfg[keylc])
  }

  throw new Error("No such configuration for defaults()", key)
}

const middleware_list = [
  { name: "log", fn: middleware.log },
  { name: "proxy", fn: middleware.proxy },
  { name: "ifmod", fn: middleware.ifmod },
  { name: "body", x: "json", fn: body_parser.json, express: true },
  { name: "body", x: "urlencoded", fn: body_parser.urlencoded, express: true },
  { name: "body", x: "text", fn: body_parser.text, express: true },
  { name: "session", fn: express_session, express: true }
]

const mixin = (base, user) => {
  return Object.assign(base, user)
}

const generate = (cfg, mwlist) => {
  return mwlist.reduce((gen, mw_item) => {
    let opts = cfg[mw_item.name]

    // switch to sub key
    if (opts && mw_item.x) opts = opts[mw_item.x]

    if (opts) {
      let middleware = mw_item.fn
      // init options (usually express)
      if (typeof opts === "object" && mw_item.express) {
        middleware = middleware(opts)
      }
      // if express wrap with spirit-express
      if (mw_item.express) middleware = exp_compat(middleware)
      gen.push(middleware)
    }

    return gen
  }, [])
}

const defaults = (str, user_cfg) => {
  const cfg = mixin(config(str), user_cfg)
  const mw = generate(cfg, middleware_list)
  return (handler) => {
    return compose(handler, mw)
  }
}

module.exports = {
  defaults,
  generate,
  mixin,
  config,
  middleware_list
}
