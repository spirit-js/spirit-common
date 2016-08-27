const session = require("express-session")
const utils = require("./session-utils")
const debug = require("debug")("spirit-common-session")
const uid = require("uid-safe").sync


const signature = require("cookie-signature")
function unsigncookie(val, secrets) {
  for (var i = 0; i < secrets.length; i++) {
    var result = signature.unsign(val, secrets[i]);

    if (result !== false) {
      return result;
    }
  }

  return false;
}

const cookie = require("cookie")
// https://github.com/expressjs/session/blob/master/index.js#L486
function getcookie(req, name, secrets) {
  var header = req.headers.cookie;
  var raw;
  var val;

  // read from cookie header
  if (header) {
    var cookies = cookie.parse(header);

    raw = cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  // back-compat read from cookieParser() signedCookies data
  if (!val && req.signedCookies) {
    val = req.signedCookies[name];
  }

  // back-compat read from cookieParser() cookies data
  if (!val && req.cookies) {
    raw = req.cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  return val;
}

function generateSessionId(sess) {
  return uid(24)
}

module.exports = (opts) => {
  opts = opts || {}
  // get the cookie options
  var cookieOptions = opts.cookie || {}

  // get the session id generate function
  var generateId = opts.genid || generateSessionId

  // get the session cookie name
  var name = opts.name || opts.key || 'connect.sid'
  // get the trust proxy setting
  var trustProxy = opts.proxy
  // get the rolling session option
  var rollingSessions = Boolean(opts.rolling)
  // get the resave session option
  var resaveSession = opts.resave;

  // get the save uninitialized session option
  var saveUninitializedSession = opts.saveUninitialized

  var secret = opts.secret

  const store = opts.store || new session.MemoryStore()

  let storeReady = true

  store.on("disconnect", () => {
    storeReady = false
  })

  store.on("connect", () => {
    storeReady = true
  })

  return (handler) => {
    return (request) => {
      if (request.session) {
        return handler(request)
      }
      if (!storeReady) {
        debug("store is disconnected")
        return handler(request)
      }

      // pathname mismatch
      if (request.url.indexOf(cookieOptions.path || '/') !== 0) {
        return handler(request)
      }

      // ensure a secret is available
      if (!secret && !request.secret) {
        throw new Error("secret option required for sessions")
      }

      // backwards compatibility for signed cookies
      // req.secret is passed from the cookie parser middleware
      const secrets = secret || [request.secret]

      let originalHash
      let originalId
      let savedHash

      // expose store
      request.sessionStore = store

      // get the session ID from the cookie
      const cookieId = request.sessionID = getcookie(request, name, secrets);

      const generate = () => {
        store.generate(request)
        originalId = request.sessionID
        originalHash = utils.hash(request.session)
        utils.wrapmethods(request.session)
      }

      /////////// this is the 'return' response flow back
      function resp(response) {
        if (!request.session) {
          debug("no session")
          return response
        }

        if (utils.shouldSetCookie(request) === false) {
          return response
        }

        // only send secure cookies via https
        if (request.session.cookie.secure && !utils.issecure(request, trustProxy)) {
          debug("not secured")
          return response
        }
        // touch session
        request.session.touch()
        // set cookie
        utils.setcookie(response, name, request.sessionID, secrets[0], request.session.cookie.data)

        if (utils.shouldDestroy(request)) {
          debug("destroying")
          store.destroy(request.sessionID, function ondestroy(err) {
            if (err) throw err
            debug("destroyed")
          })
        } else if (utils.shouldSave(request)) {
          request.session.save(function onsave(err) {
            if (err) throw err
          })
        } else if (utils.storeImplementsTouch && utils.shouldTouch(request)) {
          // store implements touch method
          debug("touching")
          store.touch(request.sessionID, request.session, function ontouch(err) {
            if (err) throw err
            debug("touched")
          })
        }

        return response
      }



      // generate a session if the browser doesn't send a sessionID
      if (!request.sessionID) {
        debug("no SID sent, generating session")
        generate()
        return handler(request).then(resp)
      }

      return new Promise(function(resolve, reject) {
          // generate the session object
          debug("fetching %s", request.sessionID)
          store.get(request.sessionID, function(err, sess){
            // error handling
            if (err) {
              debug("error %j", err)

              if (err.code !== 'ENOENT') {
                return reject(err)
              }

              generate()
              // no session
            } else if (!sess) {
              debug("no session found")
              generate()
              // populate req.session
            } else {
              debug("session found")
              store.createSession(request, sess)
              originalId = request.sessionID
              originalHash = utils.hash(sess)

              if (!resaveSession) savedHash = originalHash
              utils.wrapmethods(request.session)
            }

            resolve(handler(request).then(resp))
          })
      })
    }
  }
}
