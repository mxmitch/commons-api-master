const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { convert } = require('html-to-text');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

const delay = ms => new Promise(res => setTimeout(res, ms));

const cleanHtml = html => html ? convert(html, { wordwrap: false, preserveNewlines: true }) : null;

// Insert events for one bill
const insertEvents = async (client, billNumber, billDetails) => {
  const events = [
    { name: "First Reading (House)", date: billDetails.PassedHouseFirstReadingDateTime },
    { name: "Second Reading (House)", date: billDetails.PassedHouseSecondReadingDateTime },
    { name: "Third Reading (House)", date: billDetails.PassedHouseThirdReadingDateTime },
    { name: "First Reading (Senate)", date: billDetails.PassedSenateFirstReadingDateTime },
    { name: "Second Reading (Senate)", date: billDetails.PassedSenateSecondReadingDateTime },
    { name: "Third Reading (Senate)", date: billDetails.PassedSenateThirdReadingDateTime },
    { name: "Received Royal Assent", date: billDetails.ReceivedRoyalAssentDateTime },
  ];

  for (const e of events) {
    if (e.date) {
      try {
        await client.query(
          `INSERT INTO events (bill_id, title, publication_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [billNumber, e.name, e.date]
        );
      } catch (err) {
        console.error(`Error inserting event ${e.name} for ${billNumber}: ${err.message}`);
      }
    }
  }
};

// Fetch bill details from LegisInfo
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

const insertBill = async (bill) => {
  const billId = bill.BillNumberFormatted;
  const session = bill.ParlSessionCode;
  if (!billId) return;

  const detailsArray = await fetchBillDetails(session, billId);
  if (!detailsArray || !Array.isArray(detailsArray) || detailsArray.length === 0) return;

  for (const d of detailsArray) {
    if (!d.NumberCode) continue;

    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();

      const values = [
        d.NumberCode,
        d.LongTitleEn || "No title",
        d.LongTitleFr || "Sans titre",
        d.PassedHouseFirstReadingDateTime || null,
        d.PassedHouseSecondReadingDateTime || null,
        d.PassedHouseThirdReadingDateTime || null,
        d.PassedSenateFirstReadingDateTime || null,
        d.PassedSenateSecondReadingDateTime || null,
        d.PassedSenateThirdReadingDateTime || null,
        d.ReceivedRoyalAssentDateTime || null,
        `${d.ParliamentNumber}-${d.SessionNumber}`,
        `Parliament ${d.ParliamentNumber}, Session ${d.SessionNumber}`,
        `Parlement ${d.ParliamentNumber}, Session ${d.SessionNumber}`,
        d.SponsorPersonName?.trim() || "Unknown",
        d.SponsorPersonName?.trim() || "Inconnu",
        d.StatusNameEn || "No recent events",
        d.StatusNameFr || "Aucun événement récent",
        cleanHtml(d.ShortLegislativeSummaryEn) || null,
        cleanHtml(d.ShortLegislativeSummaryFr) || null,
      ];

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

      await insertEvents(client, d.NumberCode, d);
      console.log(`Inserted bill: ${d.NumberCode}`);

    } catch (err) {
      console.error(`Error inserting bill ${d.NumberCode}: ${err.message}`);
    } finally {
      await client.end();
    }

    await delay(300); // short delay to avoid overwhelming DB
  }
};

const main = async () => {
  try {
    const billsPath = path.resolve(__dirname, '../bills.json');
    const bills = JSON.parse(fs.readFileSync(billsPath, 'utf-8'));

    for (const bill of bills) {
      await insertBill(bill);
    }

    console.log("All bills inserted successfully.");
    console.log("Now you can run classification separately.");

  } catch (err) {
    console.error("Fatal error:", err.message);
  }
};

main();