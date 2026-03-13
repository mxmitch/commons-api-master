const axios = require('axios');
const db = require('../db');

const API_KEY = 'qDzIkPOBIZJj';
const MODEL_NAME = 'commons_api';
const BATCH_SIZE = 5;

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function classifyBills() {
  const { rows: billsToClassify } = await db.query(
    `SELECT bill_number, long_title_en FROM bills
     WHERE assigned_categories IS NULL OR assigned_categories = '{}'`
  );

  if (billsToClassify.length === 0) {
    console.log('No bills to classify.');
    return;
  }

  console.log(`Classifying ${billsToClassify.length} bills in batches of ${BATCH_SIZE}...`);

  const billChunks = chunkArray(billsToClassify, BATCH_SIZE);
  const classifiedBills = [];

  for (const chunk of billChunks) {
    const texts = chunk.map(bill => bill.long_title_en.trim());

    try {
      const response = await axios.post(
        `https://api.uclassify.com/v1/frederick/${MODEL_NAME}/classify`,
        { texts },
        {
          headers: {
            Authorization: `Token ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const results = response.data;

      for (let i = 0; i < chunk.length; i++) {
        const bill = chunk[i];
        const classifications = results[i]?.classification || [];

        const topCategories = classifications
          .filter(cat => cat.p > 0.05)
          .sort((a, b) => b.p - a.p)
          .map(cat => cat.className);

        await db.query(
          'UPDATE bills SET assigned_categories = $1 WHERE bill_number = $2',
          [topCategories, bill.bill_number]
        );

        classifiedBills.push({ bill_number: bill.bill_number, categories: topCategories });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error during batch classification:', err.response?.data || err.message);
    }
  }

  console.log('Classified bills:', classifiedBills);
  return classifiedBills;
}

module.exports = { classifyBills };