const bcrypt = require("bcryptjs");

module.exports = (db) => {
  const User = {
    // Create method now handles all fields
    create: async ({
      name,
      username,
      email,
      password,
      phone_number = '',
      postal_code = '',
      email_notification = false,
      sms_notification = false,
      user_categories = [],
    }) => {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the user into the users table with all fields
      const result = await db.query(
        `INSERT INTO users (name, username, email, password, phone_number, postal_code, email_notification, sms_notification)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          name,
          username,
          email,
          hashedPassword,
          phone_number,
          postal_code,
          email_notification,
          sms_notification,
        ]
      );

      const newUser = result.rows[0];

      // Insert into user_categories table for many-to-many relationship
      if (user_categories.length > 0) {
        const categoryPromises = user_categories.map((categoryId) =>
          db.query(
            "INSERT INTO user_categories (user_id, category_id) VALUES ($1, $2)",
            [newUser.id, categoryId]
          )
        );
        await Promise.all(categoryPromises);
      }

      return newUser;
    },

    // Find user by ID and include associated categories
    findById: async (id) => {
      const result = await db.query(
        `SELECT users.*, 
                COALESCE(json_agg(categories.*) FILTER (WHERE categories.id IS NOT NULL), '[]') AS user_categories
         FROM users
         LEFT JOIN user_categories ON users.id = user_categories.user_id
         LEFT JOIN categories ON user_categories.category_id = categories.id
         WHERE users.id = $1
         GROUP BY users.id;`,
        [id]
      );
      return result.rows[0];  // Make sure you're returning all necessary fields here
    },

    // Add category to user
    addCategory: async (userId, categoryId) => {
      await db.query(
        "INSERT INTO user_categories (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, categoryId]
      );
    },

    // Remove category from user
    removeCategory: async (userId, categoryId) => {
      await db.query(
        "DELETE FROM user_categories WHERE user_id = $1 AND category_id = $2",
        [userId, categoryId]
      );
    },
  };

  return User;
};
