module.exports = (db) => {
  const Category = {
    getAll: async () => {
      const result = await db.query("SELECT * FROM categories");
      return result.rows;
    },

    getById: async (id) => {
      const result = await db.query("SELECT * FROM categories WHERE id = $1", [id]);
      return result.rows[0];
    },

    create: async (name) => {
      const result = await db.query(
        "INSERT INTO categories (name) VALUES ($1) RETURNING *",
        [name]
      );
      return result.rows[0];
    },

    delete: async (id) => {
      await db.query("DELETE FROM categories WHERE id = $1", [id]);
    },

    getUserCategories: async (userId) => {
      const result = await db.query(
        `SELECT categories.* 
         FROM categories
         JOIN user_categories ON categories.id = user_categories.category_id
         WHERE user_categories.user_id = $1`,
        [userId]
      );
      return result.rows;
    },
  };

  return Category;
};