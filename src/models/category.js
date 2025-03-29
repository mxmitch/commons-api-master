module.exports = (db) => {
    const Category = {
      getAll: async () => {
        const result = await db.query("SELECT * FROM categories");
        return result.rows;
      },
    };
  
    return Category;
  };
  