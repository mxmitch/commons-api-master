const axios = require('axios');
const db = require('./db');
const { retry } = require('./utils/retry');

const API_KEY = 'qDzIkPOBIZJj';
const MODEL = 'commons_api';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getBills() {
  return db.query(
    `SELECT bill_number, long_title_en
     FROM bills
     WHERE assigned_categories IS NULL OR assigned_categories = '{}'`
  );
}

async function classifyBatch(bills) {
  const texts = bills.map(b => (b.long_title_en || '').trim());

  const res = await axios.post(
    `https://api.uclassify.com/v1/frederick/${MODEL}/classify`,
    { texts },
    {
      headers: {
        Authorization: `Token ${API_KEY}`
      },
      timeout: 20000
    }
  );

  const results = res.data || [];

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    const classes = results[i]?.classification || [];

    const categories = classes
      .filter(c => c.p > 0.05)
      .sort((a, b) => b.p - a.p)
      .map(c => c.className);

    await retry(() =>
      db.query(
        `UPDATE bills
         SET assigned_categories = $1
         WHERE bill_number = $2`,
        [categories, bill.bill_number]
      )
    );
  }
}

async function runClassifier() {
  const { rows } = await getBills();

  console.log(`Classifying ${rows.length} bills...`);

  const BATCH = 5;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);

    try {
      await classifyBatch(chunk);
    } catch (err) {
      console.error('Batch failed:', err.message);
    }

    await sleep(1200); // critical throttle
  }

  console.log('Classification complete.');
}

runClassifier();