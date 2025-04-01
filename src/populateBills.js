const axios = require('axios');
const { pool } = require('./db');
const { convert } = require('html-to-text');


// Function to insert events for a specific bill
const insertEvents = async (client, billNumber, billDetails) => {
  const eventTypes = [
    { name: "First Reading (House)", date: billDetails.PassedHouseFirstReadingDateTime },
    { name: "Second Reading (House)", date: billDetails.PassedHouseSecondReadingDateTime },
    { name: "Third Reading (House)", date: billDetails.PassedHouseThirdReadingDateTime },
    { name: "First Reading (Senate)", date: billDetails.PassedSenateFirstReadingDateTime },
    { name: "Second Reading (Senate)", date: billDetails.PassedSenateSecondReadingDateTime },
    { name: "Third Reading (Senate)", date: billDetails.PassedSenateThirdReadingDateTime },
    { name: "Received Royal Assent", date: billDetails.ReceivedRoyalAssentDateTime }
  ];

  for (const event of eventTypes) {
    if (event.date) {
      await client.query(
        `INSERT INTO events (bill_id, title, publication_date) VALUES ($1, $2, $3)`,
        [billNumber, event.name, event.date]
      );
      console.log(`Inserted event: ${event.name} for bill ${billNumber}`);
    }
  }
};

async function fetchBillsFromLegisInfo() {
  try {
    console.log("Fetching bills list from LegisInfo...");
    const response = await axios.get('https://www.parl.ca/legisinfo/en/bills/json');
    const bills = response.data;

    if (!bills || bills.length === 0) {
      console.log("No bills found.");
      return;
    }

    console.log(`Fetched ${bills.length} bills. Fetching details...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const bill of bills) {
        const billId = bill.BillNumberFormatted;
        const session = bill.ParlSessionCode;

        if (!billId) {
          console.warn("Skipping bill due to missing bill number.");
          continue;
        }

        const billUrl = `https://www.parl.ca/legisinfo/en/bill/${session}/${billId}/json`;
        console.log(`Fetching details for: ${billId} (Session ${session})`);

        let billDetailsArray;
        try {
          const billResponse = await axios.get(billUrl);
          billDetailsArray = billResponse.data;
        } catch (error) {
          console.error(`Error fetching details for ${billId}:`, error.message);
          continue;
        }

        if (!Array.isArray(billDetailsArray) || billDetailsArray.length === 0) {
          console.warn(`Skipping bill due to missing details: ${billUrl}`);
          continue;
        }

        for (const billDetails of billDetailsArray) {
          if (!billDetails.NumberCode) {
            console.warn(`Skipping bill due to missing NumberCode: ${billUrl}`);
            continue;
          }
          function cleanHtml(html) {
            return html ? convert(html, { wordwrap: false, preserveNewlines: true }) : null;
          }

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

          const insertQuery = `
            INSERT INTO bills (
      bill_number, long_title_en, long_title_fr, passed_house_first_reading_date, 
      passed_house_second_reading_date, passed_house_third_reading_date,
      passed_senate_first_reading_date, passed_senate_second_reading_date, 
      passed_senate_third_reading_date, received_royal_assent_date, parl_session_code, 
      parl_session_en, parl_session_fr, sponsor_en, sponsor_fr, latest_event_en, 
      latest_event_fr, short_summary_en, short_summary_fr, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
    ON CONFLICT (bill_number) DO NOTHING;`;

          await client.query(insertQuery, values);
          console.log(`Inserted bill: ${billId} (Session ${session})`);
          await insertEvents(client, billDetails.NumberCode, billDetails);
        }
      }

      await client.query('COMMIT');
      console.log("All bills have been successfully inserted.");
    } catch (insertError) {
      await client.query('ROLLBACK');
      console.error("Transaction rolled back due to error:", insertError);
    } finally {
      client.release();
    }
  } catch (fetchError) {
    console.error("Error fetching bills:", fetchError);
  }
}

fetchBillsFromLegisInfo();

