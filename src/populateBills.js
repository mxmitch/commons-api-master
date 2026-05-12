const axios = require('axios');
const db = require('./db');
const { classifyBills } = require('./services/billService');

const BILLS_JSON_URL = 'https://www.parl.ca/legisinfo/en/bills/json';

async function fetchBills() {
  try {
    const res = await axios.get(BILLS_JSON_URL);

    // Debug API structure
    console.log('API response keys:', Object.keys(res.data));

    // Bills are nested under Bills
    const bills = res.data.Bills || [];

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
  // Use formatted bill number like "C-1", "S-5"
  const billNumber = bill.BillNumberFormatted;

  if (!billNumber) {
    console.warn(
      `Skipping BillId ${bill.BillId} — no BillNumberFormatted`
    );
    return false;
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19
      )
      ON CONFLICT (bill_number) DO NOTHING`,
      [
        billNumber,

        // Titles
        bill.LongTitleEn || bill.ShortTitleEn || '',
        bill.LongTitleFr || bill.ShortTitleFr || '',

        // House dates
        parseDate(bill.PassedHouseFirstReadingDateTime),
        parseDate(bill.PassedHouseSecondReadingDateTime),
        parseDate(bill.PassedHouseThirdReadingDateTime),

        // Senate dates
        parseDate(bill.PassedSenateFirstReadingDateTime),
        parseDate(bill.PassedSenateSecondReadingDateTime),
        parseDate(bill.PassedSenateThirdReadingDateTime),

        // Royal assent
        parseDate(bill.ReceivedRoyalAssentDateTime),

        // Session
        bill.ParlSessionCode || null,
        bill.ParlSessionEn || null,
        bill.ParlSessionFr || null,

        // Sponsors
        bill.SponsorEn || null,
        bill.SponsorFr || null,

        // Latest events
        bill.LatestActivityEn || null,
        bill.LatestActivityFr || null,

        // Summaries (currently unavailable from API)
        null,
        null
      ]
    );

    console.log(`Inserted bill ${billNumber}`);

    return true;
  } catch (err) {
    console.error(
      `Error inserting bill ${billNumber || bill.BillId}:`,
      err.message
    );

    return false;
  }
}

async function populateAndClassify() {
  console.log('Fetching bills list from LegisInfo JSON...');

  const bills = await fetchBills();

  if (!bills.length) {
    console.log('No bills returned from API.');
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const bill of bills) {
    const success = await insertBill(bill);

    if (success) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Inserted ${inserted} bills.`);
  console.log(`Skipped ${skipped} bills.`);

  console.log('Running classification...');

  try {
    await classifyBills();
    console.log('Classification complete.');
  } catch (err) {
    console.error(
      'Error during classification:',
      err.response?.data || err.message
    );
  }

  console.log('Done.');
}

populateAndClassify();