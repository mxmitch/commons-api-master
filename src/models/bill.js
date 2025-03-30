module.exports = (db) => {
  const Bill = {
    create: async (billData) => {
      const query = `
        INSERT INTO bills (code, title, description, introduced_date, summary_url, page_url, full_text_url, passed, session_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (code) DO NOTHING;
      `;

      const values = [
        billData.BillNumber,
        billData.Title.en,
        billData.Description?.en || null,
        billData.IntroductionDate,
        billData.SummaryURL,
        billData.PageURL,
        billData.FullTextURL,
        billData.Passed || false,
        billData.SessionId,
      ];

      try {
        const result = await db.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error("Error inserting bill:", error);
        throw error;
      }
    },

    getAll: async () => {
      const result = await db.query('SELECT * FROM bills');
      return result.rows;
    },
  };

  return Bill;
};

