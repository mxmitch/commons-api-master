module.exports = (db) => {
    const Bill = {
      create: async (title, description, category_id) => {
        const result = await db.query(
          "INSERT INTO bills (title, description, category_id) VALUES ($1, $2, $3) RETURNING *",
          [title, description, category_id]
        );
        return result.rows[0];
      },
  
      getAll: async () => {
        const result = await db.query("SELECT * FROM bills");
        return result.rows;
      },
    };
  
    return Bill;
  };
  