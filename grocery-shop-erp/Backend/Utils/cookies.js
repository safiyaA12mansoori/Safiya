'use strict';

function readCookies(req) {
  const header = req.headers.cookie;
  if (!header) {
    return {};
  }
  const cookies = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) {
      continue;
    }
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.nodeEnv === 'production',
    path: '/',
    maxAge: config.jwtMaxAgeMs,
  };
}

function setSessionCookie(res, config, token) {
  res.setHeader('Set-Cookie', serializeCookie(config.cookieName, token, sessionCookieOptions(config)));
}

function clearSessionCookie(res, config) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(config.cookieName, '', {
      ...sessionCookieOptions(config),
      maxAge: 0,
    })
  );
}

module.exports = {
  readCookies,
  setSessionCookie,
  clearSessionCookie,
};
