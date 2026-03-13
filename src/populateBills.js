// src/populateBills.js

const axios = require('axios');
const db = require('./db');
const { classifyBills } = require('./services/billService');

const BILLS_JSON_URL = 'https://www.parl.ca/legisinfo/en/bills/json';

async function fetchBills() {
  try {
    const res = await axios.get(BILLS_JSON_URL);
    const bills = res.data || [];
    console.log(`Fetched ${bills.length} bills.`);
    return bills;
  } catch (err) {
    console.error('Error fetching bills JSON:', err.message);
    return [];
  }
}

function parseDate(dateStr) {
  return dateStr ? new Date(dateStr) : null;
}

async function insertBill(bill) {
  // BillNumberFormatted is always populated (e.g. "S-1", "C-47")
  // BillNumber is 0 for pro forma/senate bills and cannot be used as a unique key
  const billNumber = bill.BillNumberFormatted;

  if (!billNumber) {
    console.warn(`Skipping BillId ${bill.BillId} — no BillNumberFormatted`);
    return;
  }

  try {
    await db.query(
      `INSERT INTO bills (
        bill_number,
        long_title_en,
        long_title_fr,
        passed_house_first_reading_date,
        passed_house_second_reading_date,
        passed_house_third_reading_date,
        passed_senate_first_reading_date,
        passed_senate_second_reading_date,
        passed_senate_third_reading_date,
        received_royal_assent_date,
        parl_session_code,
        parl_session_en,
        parl_session_fr,
        sponsor_en,
        sponsor_fr,
        latest_event_en,
        latest_event_fr,
        short_summary_en,
        short_summary_fr
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      )
      ON CONFLICT (bill_number) DO NOTHING`,
      [
        billNumber,                                          // $1  BillNumberFormatted e.g. "S-1"
        bill.LongTitleEn  || bill.ShortTitleEn || '',       // $2
        bill.LongTitleFr  || bill.ShortTitleFr || '',       // $3
        parseDate(bill.PassedHouseFirstReadingDateTime),    // $4
        parseDate(bill.PassedHouseSecondReadingDateTime),   // $5
        parseDate(bill.PassedHouseThirdReadingDateTime),    // $6
        parseDate(bill.PassedSenateFirstReadingDateTime),   // $7
        parseDate(bill.PassedSenateSecondReadingDateTime),  // $8
        parseDate(bill.PassedSenateThirdReadingDateTime),   // $9
        parseDate(bill.ReceivedRoyalAssentDateTime),        // $10
        bill.ParlSessionCode,                               // $11 e.g. "45-1"
        bill.ParlSessionEn,                                 // $12
        bill.ParlSessionFr,                                 // $13
        bill.SponsorEn,                                     // $14
        bill.SponsorFr,                                     // $15
        bill.LatestActivityEn,                              // $16  was latestEventEn — field renamed in API
        bill.LatestActivityFr,                              // $17  was latestEventFr — field renamed in API
        null,                                               // $18  short_summary_en — not in API, populated by uClassify
        null                                                // $19  short_summary_fr — not in API, populated by uClassify
      ]
    );
  } catch (err) {
    console.error(`Error inserting bill ${billNumber}:`, err.message);
  }
}

async function populateAndClassify() {
  console.log('Fetching bills list from LegisInfo JSON...');

  const bills = await fetchBills();
  if (!bills.length) return;

  let inserted = 0;
  let skipped = 0;

  for (const bill of bills) {
    if (!bill.BillNumberFormatted) {
      skipped++;
      continue;
    }
    await insertBill(bill);
    inserted++;
  }

  console.log(`Inserted ${inserted} bills, skipped ${skipped}.`);
  console.log('Running classification...');
  await classifyBills();

  console.log('Done.');
}

populateAndClassify();