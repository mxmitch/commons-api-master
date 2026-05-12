const axios = require('axios');
const db = require('../db');

const API_KEY = 'qDzIkPOBIZJj';
const MODEL = 'commons_api';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function classifyBills() {
  const { rows: bills } = await db.query(`
    SELECT bill_number, long_title_en
    FROM bills
    WHERE assigned_categories IS NULL OR cardinality(assigned_categories) = 0
  `);

  if (!bills.length) {
    console.log('No bills to classify.');
    return;
  }

  console.log(`🧠 Classifying ${bills.length} bills...`);

  const batches = chunk(bills, 5);

  for (const batch of batches) {
    const texts = batch.map(b => b.long_title_en);

    try {
      const res = await axios.post(
        `https://api.uclassify.com/v1/frederick/${MODEL}/classify`,
        { texts },
        {
          headers: {
            Authorization: `Token ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const results = res.data;

      for (let i = 0; i < batch.length; i++) {
        const bill = batch[i];
        const cats = results[i]?.classification || [];

        const top = cats
          .filter(c => c.p > 0.05)
          .sort((a, b) => b.p - a.p)
          .map(c => c.className);

        await db.query(
          `UPDATE bills
           SET assigned_categories = $1
           WHERE bill_number = $2`,
          [top, bill.bill_number]
        );
      }

      // 🧯 avoid uClassify + DB pressure
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('❌ Batch classification failed:', err.message);
    }
  }

  console.log('🎉 Classification complete');
}

module.exports = { classifyBills };