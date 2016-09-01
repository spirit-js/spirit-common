# spirit-common

Common http middleware setup for spirit.

It's purpose is to reduce boilerplate and avoid middleware ordering confusion.

[![Build Status](https://travis-ci.org/spirit-js/spirit-common.svg?branch=master)](https://travis-ci.org/spirit-js/spirit-common)
[![Coverage Status](https://coveralls.io/repos/github/spirit-js/spirit-common/badge.svg?branch=master)](https://coveralls.io/github/spirit-js/spirit-common?branch=master)

### Usage

```js
const defaults = require("spirit-common").defaults
const site = defaults("site") // returns a middleware with a lot of common http middleware supported

spirit.node.adapter(..., [site]) // use middleware with spirit node adapter
```

This sets up and provides body parsing, session, as well as other common middleware.

NOTE: By default it stores cookies in memory, to change, pass in a configuration object:
```js
defaults("site", {
  session: {
    store: <A compatible express-session store, ex: new MongoStore()>
  }
})
```

The secret used for cookies is auto-generated on startup, to use your own you can pass it in as an option too:
```js
defaults("site", {
  session: {
    secret: "my_secret"
  }
})
```

Aside from changing the session secret and store option, most other options are safe to leave alone.

If you wanted to disable a middleware used by `defaults` then pass in `false` as it's option, for example to turn off the console logger and session support:

```js
defaults("site", {
  log: false,
  session: false
})
```

A list of middlewares used:
```js
{
  log: true/false,
  proxy: true/false,
  ifmod: true/false,
  body: {
    json: ...,      // body-parser .json
    urlencoded: ... // body-parser .urlencoded
  },
  session: { ... }  // express-session
}
```
For the 'body' and 'session' middleware, it uses the npm modules [body-parser](https://www.npmjs.com/package/body-parser) and [express-session](https://www.npmjs.com/package/express-session). So the same options can be passed in.

There is also a "api" configuration:
```js
defaults("api")
```

Which loads every middleware from the "site" configuration _except_ session support.
