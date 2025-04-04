const axios = require('axios');
const db = require('../db'); // adjust to your actual db config

// Define your uClassify API credentials
const API_KEY = 'qDzIkPOBIZJj';
const MODEL_NAME = 'commons_api'; // Replace with your model name
const UCLASSIFY_API_URL = `https://api.uclassify.com/v1/frederick/${MODEL_NAME}/classify`;
const BATCH_SIZE = 5; // uClassify can handle multiple texts per request


function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Function to classify bill data and sort them into categories
async function classifyBills() {
    // Get bills that haven’t been classified yet
    const { rows: billsToClassify } = await db.query(
       `SELECT id, long_title_en FROM bills 
     WHERE assigned_categories IS NULL OR jsonb_array_length(assigned_categories) = 0`
    );

    if (billsToClassify.length === 0) {
        console.log("No bills to classify.");
        return;
    }

    const billChunks = chunkArray(billsToClassify, BATCH_SIZE);
    const classifiedBills = [];

    for (const chunk of billChunks) {
        const texts = chunk.map(bill => `${bill.long_title_en}`.trim());

        try {
            const response = await axios.post(
                'https://api.uclassify.com/v1/frederick/commons_api/classify',
                { texts },
                {
                    headers: {
                        Authorization: `Token ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const results = response.data;

            // Save each result back to its bill
            for (let i = 0; i < chunk.length; i++) {
                const bill = chunk[i];
                const classifications = results[i]?.classification || [];

                const topCategories = classifications
                    .filter(cat => cat.p > 0.05)
                    .sort((a, b) => b.p - a.p)
                    .map(cat => cat.className);

                await db.query(
                    'UPDATE bills SET assigned_categories = $1 WHERE id = $2',
                    [JSON.stringify(topCategories), bill.id] // Use JSON.stringify to store as a JSON array
                );

                classifiedBills.push({
                    id: bill.id,
                    categories: topCategories
                });
            }

            // Optional delay to stay under rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            console.error("Error during batch classification:", err.response?.data || err.message);
        }
    }

    console.log("Classified bills:", classifiedBills);
    return classifiedBills;
}


module.exports = { classifyBills };