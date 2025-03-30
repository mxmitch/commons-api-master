const axios = require('axios');
const { pool } = require('./db'); // Adjust path to your db.js

// Fetch bills data from the LegisInfo JSON URL
async function fetchBillsFromLegisInfo() {
  try {
    // Fetch the JSON data from the LegisInfo bills endpoint
    const response = await axios.get('https://www.parl.ca/legisinfo/en/bills/json');

    // Extract the bills array from the JSON response
    const bills = response.data;

    // Check if there are any bills
    if (!bills || bills.length === 0) {
      console.log("No bills found in the JSON response.");
      return;
    }

    // Loop through each bill and insert it into the database
    for (const bill of bills) {
      try {
        // Construct the values for the bill insert
        const values = [
          bill.BillNumberFormatted, // Bill number formatted
          bill.LongTitleEn, // English title
          bill.LongTitleFr || null, // French title (use null if not available)
          bill.PassedHouseFirstReadingDate || null,
          bill.PassedHouseSecondReadingDate || null,
          bill.PassedHouseThirdReadingDate || null,
          bill.PassedSenateFirstReadingDateTime || null, // Passed Senate first reading date
          bill.PassedSenateSecondReadingDateTime || null, // Passed Senate second reading date
          bill.PassedSenateThirdReadingDateTime || null, // Passed Senate third reading date
          bill.ReceivedRoyalAssentDateTime || null, // Royal assent date
          bill.ParlSessionCode, // Parliament session code
          bill.ParlSessionEn, // Parliament session English title
          bill.ParlSessionFr, // Parliament session French title
          bill.SponsorEn || null, // English sponsor name
          bill.SponsorFr || null, // French sponsor name
          bill.CurrentStatusEn, // Current status in English
          bill.CurrentStatusFr, // Current status in French
        ];

        // Insert bill data into the database
        const query = `
          INSERT INTO bills (bill_number, long_title_en, long_title_fr, passed_house_first_reading_date, passed_house_second_reading_date, passed_house_third_reading_date, passed_senate_first_reading_date, passed_senate_second_reading_date, passed_senate_third_reading_date, received_royal_assent_date, parl_session_code, parl_session_en, parl_session_fr, sponsor_en, sponsor_fr, current_status_en, current_status_fr, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW());
        `;

        await pool.query(query, values);
        // console.log(`Bill ${bill.BillNumberFormatted} inserted successfully`);
      } catch (insertError) {
        console.error("Error inserting bill:", insertError);
      }
    }
  } catch (fetchError) {
    console.error("Error fetching bills:", fetchError);
  }
}

// Run the function to populate the database with bills
fetchBillsFromLegisInfo();
