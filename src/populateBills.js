// src/populateBills.js
const axios = require('axios');
const { Pool } = require('pg');
const { convert } = require('html-to-text');
const { classifyBills } = require('./services/billService');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Insert events for a single bill
const insertEvents = async (client, billNumber, billDetails) => {
  const eventTypes = [
    { name: "First Reading (House)", date: billDetails.PassedHouseFirstReadingDateTime },
    { name: "Second Reading (House)", date: billDetails.PassedHouseSecondReadingDateTime },
    { name: "Third Reading (House)", date: billDetails.PassedHouseThirdReadingDateTime },
    { name: "First Reading (Senate)", date: billDetails.PassedSenateFirstReadingDateTime },
    { name: "Second Reading (Senate)", date: billDetails.PassedSenateSecondReadingDateTime },
    { name: "Third Reading (Senate)", date: billDetails.PassedSenateThirdReadingDateTime },
    { name: "Received Royal Assent", date: billDetails.ReceivedRoyalAssentDateTime },
  ];

  for (const event of eventTypes) {
    if (event.date) {
      try {
        await client.query(
          `INSERT INTO events (bill_id, title, publication_date)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [billNumber, event.name, event.date]
        );
        console.log(`Inserted event: ${event.name} for bill ${billNumber}`);
      } catch (err) {
        console.error(`Error inserting event ${event.name} for ${billNumber}:`, err.message);
      }
    }
  }
};

// Fetch individual bill details with retry
const fetchBillDetails = async (session, billId, retries = 3) => {
  const url = `https://www.parl.ca/legisinfo/en/bill/${session}/${billId}/json`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed for bill ${billId}: ${err.message}`);
      if (attempt < retries) await delay(500);
      else return null;
    }
  }
};

// Clean HTML to text
const cleanHtml = html => html ? convert(html, { wordwrap: false, preserveNewlines: true }) : null;

// Process a batch of bills
const processBatch = async (batch) => {
  const client = await pool.connect();
  try {
    for (const bill of batch) {
      const billId = bill.BillNumberFormatted;
      const session = bill.ParlSessionCode;

      if (!billId) continue;

      const billDetailsArray = await fetchBillDetails(session, billId);
      if (!billDetailsArray || !Array.isArray(billDetailsArray) || billDetailsArray.length === 0) {
        console.warn(`Skipping bill due to missing details: ${billId}`);
        continue;
      }

      for (const billDetails of billDetailsArray) {
        if (!billDetails.NumberCode) continue;

        const values = [
          billDetails.NumberCode,
          billDetails.LongTitleEn || "No title",
          billDetails.LongTitleFr || "Sans titre",
          billDetails.PassedHouseFirstReadingDateTime || null,
          billDetails.PassedHouseSecondReadingDateTime || null,
          billDetails.PassedHouseThirdReadingDateTime || null,
          billDetails.PassedSenateFirstReadingDateTime || null,
          billDetails.PassedSenateSecondReadingDateTime || null,
          billDetails.PassedSenateThirdReadingDateTime || null,
          billDetails.ReceivedRoyalAssentDateTime || null,
          `${billDetails.ParliamentNumber}-${billDetails.SessionNumber}`,
          `Parliament ${billDetails.ParliamentNumber}, Session ${billDetails.SessionNumber}`,
          `Parlement ${billDetails.ParliamentNumber}, Session ${billDetails.SessionNumber}`,
          billDetails.SponsorPersonName?.trim() || "Unknown",
          billDetails.SponsorPersonName?.trim() || "Inconnu",
          billDetails.StatusNameEn || "No recent events",
          billDetails.StatusNameFr || "Aucun événement récent",
          cleanHtml(billDetails.ShortLegislativeSummaryEn) || null,
          cleanHtml(billDetails.ShortLegislativeSummaryFr) || null,
        ];

        try {
          await client.query(
            `INSERT INTO bills (
              bill_number, long_title_en, long_title_fr,
              passed_house_first_reading_date, passed_house_second_reading_date,
              passed_house_third_reading_date, passed_senate_first_reading_date,
              passed_senate_second_reading_date, passed_senate_third_reading_date,
              received_royal_assent_date, parl_session_code, parl_session_en,
              parl_session_fr, sponsor_en, sponsor_fr, latest_event_en,
              latest_event_fr, short_summary_en, short_summary_fr, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())
            ON CONFLICT (bill_number) DO NOTHING;`,
            values
          );
          console.log(`Inserted bill: ${billId} (Session ${session})`);
          await insertEvents(client, billDetails);
        } catch (err) {
          console.error(`Error inserting bill ${billId}:`, err.message);
        }

        await delay(200); // small delay between inserts
      }
    }
  } finally {
    client.release();
  }
};

// Main function
const fetchBillsFromLegisInfo = async () => {
  try {
    console.log("Fetching bills list from LegisInfo...");
    const res = await axios.get('https://www.parl.ca/legisinfo/en/bills/json');
    const bills = res.data;
    if (!bills || bills.length === 0) {
      console.log("No bills found.");
      return;
    }

    console.log(`Fetched ${bills.length} bills. Processing in batches...`);
    const batchSize = 10;
    for (let i = 0; i < bills.length; i += batchSize) {
      const batch = bills.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);
      await processBatch(batch);
      await delay(500); // small delay between batches
    }

    console.log("All batches processed. Bills are inserted.");
    console.log("Now you can run classification separately if needed.");

  } catch (err) {
    console.error("Error fetching bills list:", err.message);
  } finally {
    await pool.end();
  }
};

fetchBillsFromLegisInfo();