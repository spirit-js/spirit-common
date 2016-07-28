/*
 * Utility functions from express-session session()
 * Factored out to make it easier to read in session.js
 */


// wrap session methods
function wrapmethods(sess) {
  var _save = sess.save;

  function save() {
    debug('saving %s', this.id);
    savedHash = hash(this);
    _save.apply(this, arguments);
  }

  Object.defineProperty(sess, 'save', {
    configurable: true,
    enumerable: false,
    value: save,
    writable: true
  });
}

const generate = (request, store) => {
  store.generate(request);
  originalId = request.sessionID;
  originalHash = hash(request.session);
  wrapmethods(request.session);
  return // originalId, originalHash
}

// check if session has been modified
const isModified = (sess, originalId, originalHash) => {
  return originalId !== sess.id || originalHash !== hash(sess);
}

// check if session has been saved
const isSaved = (sess, originalId, savedHash) => {
  return originalId === sess.id && savedHash === hash(sess);
}

// determine if session should be saved to store
const shouldSave = (req) => {
  // cannot set cookie without a session ID
  if (typeof req.sessionID !== 'string') {
    debug('session ignored because of bogus req.sessionID %o', req.sessionID);
    return false;
  }

  return !saveUninitializedSession && cookieId !== req.sessionID
    ? isModified(req.session)
    : !isSaved(req.session)
}

// determine if session should be destroyed
const shouldDestroy = (req) => {
  return req.sessionID && unsetDestroy && req.session == null;
}

// determine if session should be touched
const shouldTouch = (req, cookieId) => {
  // cannot set cookie without a session ID
  if (typeof req.sessionID !== 'string') {
    debug('session ignored because of bogus req.sessionID %o', req.sessionID);
    return false;
  }
  return cookieId === req.sessionID && !shouldSave(req);
}

// determine if cookie should be set on response
const shouldSetCookie = (req, cookieId) => {
  // cannot set cookie without a session ID
  if (typeof req.sessionID !== 'string') {
    return false;
  }

  return cookieId != req.sessionID
    ? saveUninitializedSession || isModified(req.session)
    : rollingSessions || req.session.cookie.expires != null && isModified(req.session);
}

/*
 * Functions that are private in express-session
 */
const crc = require("crc").crc32


function setcookie(res, name, val, secret, options) {
  const signed = 's:' + signature.sign(val, secret)
  const data = cookie.serialize(name, signed, options)

  debug('set-cookie %s', data);
  const prev = res.get("Set-Cookie") || []
  const header = Array.isArray(prev) ? prev.concat(data)
        : Array.isArray(data) ? [prev].concat(data)
        : [prev, data];
  res.set("Set-Cookie", header)
}

// untouched
function hash(sess) {
  return crc(JSON.stringify(sess, function (key, val) {
    if (key !== 'cookie') {
      return val;
    }
  }));
}

// untouched
function issecure(req, trustProxy) {
  // socket is https server
  if (req.connection && req.connection.encrypted) {
    return true;
  }

  // do not trust proxy
  if (trustProxy === false) {
    return false;
  }

  // no explicit trust; try req.secure from express
  if (trustProxy !== true) {
    var secure = req.secure;
    return typeof secure === 'boolean'
      ? secure
      : false;
  }

  // read the proto from x-forwarded-proto header
  var header = req.headers['x-forwarded-proto'] || '';
  var index = header.indexOf(',');
  var proto = index !== -1
        ? header.substr(0, index).toLowerCase().trim()
        : header.toLowerCase().trim()

  return proto === 'https';
}

module.exports = {
  generate,
  isModified,
  isSaved,
  shouldSave,
  shouldDestroy,
  shouldTouch,
  shouldSetCookie,

  // private functions from express-session
  setcookie,
  hash,
  issecure
}


