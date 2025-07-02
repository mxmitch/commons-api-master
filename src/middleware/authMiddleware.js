const { expressjwt: jwt } = require('express-jwt');

const authMiddleware = jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  credentialsRequired: true,
  getToken: (req) => {
    // ✅ Read token from cookie instead of Authorization header
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    return null;
  }
});

module.exports = authMiddleware;