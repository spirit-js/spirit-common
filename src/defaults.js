const {compose} = require("spirit")
const exp_compat = require("spirit-express")

const middleware = require("./middleware")

// express middleware
const body_parser = require("body-parser")
//const cookie_parser = require("cookie-parser")
const express_session = require("express-session")
//const multer = require("multer")

const config = {
  // every config uses theses
  base: {
    log: true,
    proxy: true,
    ifmod: true,
    body: {
      json: { strict: true },
      urlencoded: { extended: true }
    }
  },

  // api config (+ base)
  api: {},

  // site config (+ base)
  site: {
    session: {
      secret: "random generate this",
      resave: false,
      saveUninitialized: true,
      httpOnly: true
    }
  }
}

const mixin = (cfg_str, user_cfg) => {
  cfg_str = cfg_str.toLowerCase()
  const cfg = config[cfg_str]
  if (!cfg && cfg_str !== "base") {
    throw new Error("Do not know how to setup default middlewares for configuration:", cfg_str)
  }
  return Object.assign(config.base, config[cfg], user_cfg)
}

const generate = (cfg, mwlist) => {
  return mwlist.reduce((gen, mw_item) => {
    let opts = cfg[mw_item.name]

    // switch to sub key
    if (mw_item.x) opts = opts[mw_item.x]

    if (opts) {
      let init = mw_item.fn
      // init options (usually express)
      if (typeof opts === "object" && mw_item.express) {
        init = init(opts)
      }
      // if express wrap with spirit-express
      if (mw_item.express) init = exp_compat(init)
      gen.push(init)
    }

    return gen
  }, [])
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

const defaults = (cfg, user_cfg) => {
  const mw = generate(mixin(cfg, user_cfg), middleware_list)
  return (handler) => {
    return compose(handler, mw)
  }
}

module.exports = {
  defaults
}
