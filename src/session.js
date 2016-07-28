const session = require("express-session")
const utils = require("./session-utils")

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

    if (val) {
      deprecate('cookie should be available in req.headers.cookie');
    }
  }

  // back-compat read from cookieParser() cookies data
  if (!val && req.cookies) {
    raw = req.cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val) {
          deprecate('cookie should be available in req.headers.cookie');
        }

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
  //return uid(24);
}

const debug = () => {
  
}

module.exports = (opts) => {
  opts = opts || {}

  const store = opts.store || new session.MemoryStore()

  const storeReady = true

  store.on("disconnect", () => {
    store_ready = false
  })

  store.on("connect", () => {
    store_ready = true
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


      // generate a session if the browser doesn't send a sessionID
      if (!request.sessionID) {
        debug('no SID sent, generating session');
        generate();
        // return
      } else {
        // generate the session object
        debug('fetching %s', req.sessionID);
        store.get(req.sessionID, function(err, sess){
          // error handling
          if (err) {
            debug('error %j', err);

            if (err.code !== 'ENOENT') {
              next(err);
              return;
            }

            generate();
            // no session
          } else if (!sess) {
            debug('no session found');
            generate();
            // populate req.session
          } else {
            debug('session found');
            store.createSession(req, sess);
            originalId = req.sessionID;
            originalHash = hash(sess);

            if (!resaveSession) {
              savedHash = originalHash
            }
            wrapmethods(req.session);
          }

          // return async
        })
      }

      /////////// this is the 'return' response flow back

      return handler(request).then((response) => {
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
          debug("destroying");
          store.destroy(request.sessionID, function ondestroy(err) {
            if (err) {
              defer(next, err)
            }
            debug("destroyed")
          })
        } else if (utils.shouldSave(request)) {
          request.session.save(function onsave(err) {
            if (err) {
              defer(next, err);
            }
          })
        } else if (utils.storeImplementsTouch && utils.shouldTouch(request)) {
          // store implements touch method
          debug("touching")
          store.touch(request.sessionID, request.session, function ontouch(err) {
            if (err) {
              defer(next, err);
            }
            debug("touched")
          })
        }

        return response
      })
    }
  }
}
