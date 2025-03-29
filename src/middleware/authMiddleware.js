const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
const { SECRET_KEY } = process.env;

const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(403).send("Access denied");

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send("Invalid or expired token");
    req.user = user;
    next();
  });
};

module.exports = authenticateJWT;
