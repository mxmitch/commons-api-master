const bcrypt = require("bcryptjs");

module.exports = (db) => {
  const User = {
    create: async (email, password) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
        [email, hashedPassword]
      );
      return result.rows[0];
    },

    findByEmail: async (email) => {
      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0];
    },

    findById: async (id) => {
      const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
      return result.rows[0];
    },
  };

  return User;
};
