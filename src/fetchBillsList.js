// src/fetchBillsList.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const fetchBillsList = async () => {
  try {
    console.log("Fetching bills list from LegisInfo...");
    const res = await axios.get('https://www.parl.ca/legisinfo/en/bills/json');
    const bills = res.data;

    if (!bills || bills.length === 0) {
      console.log("No bills found.");
      return;
    }

    const filePath = path.resolve(__dirname, '../bills.json');
    fs.writeFileSync(filePath, JSON.stringify(bills, null, 2), 'utf-8');
    console.log(`Saved ${bills.length} bills to bills.json`);
  } catch (err) {
    console.error("Error fetching bills list:", err.message);
  }
};

fetchBillsList();