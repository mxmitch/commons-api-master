const axios = require('axios');
const db = require('./db');

const BILLS_URL = 'https://www.parl.ca/legisinfo/en/bills/json';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalizeBills(data) {
  if (Array.isArray(data)) return data;
  if (data?.Items && Array.isArray(data.Items)) return data.Items;
  if (data?.Results && Array.isArray(data.Results)) return data.Results;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

function parseDate(v) {
  return v ? new Date(v) : null;
}

async function fetchBills() {
  console.log(`📡 Fetching bills from: ${BILLS_URL}`);

  const res = await axios.get(BILLS_URL, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const bills = normalizeBills(res.data);

  console.log(`📦 Normalized bills count: ${bills.length}`);
  return bills;
}

async function insertBill(bill, attempt = 1) {
  const billNumber = bill.BillNumberFormatted;

  if (!billNumber) return;

  const sql = `
    INSERT INTO bills (
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
    ON CONFLICT (bill_number) DO NOTHING
  `;

  const params = [
    billNumber,
    bill.LongTitleEn || '',
    bill.LongTitleFr || '',
    parseDate(bill.PassedHouseFirstReadingDateTime),
    parseDate(bill.PassedHouseSecondReadingDateTime),
    parseDate(bill.PassedHouseThirdReadingDateTime),
    parseDate(bill.PassedSenateFirstReadingDateTime),
    parseDate(bill.PassedSenateSecondReadingDateTime),
    parseDate(bill.PassedSenateThirdReadingDateTime),
    parseDate(bill.ReceivedRoyalAssentDateTime),
    bill.ParlSessionCode || null,
    bill.ParlSessionEn || null,
    bill.ParlSessionFr || null,
    bill.SponsorEn || null,
    bill.SponsorFr || null,
    bill.LatestActivityEn || null,
    bill.LatestActivityFr || null,
    null,
    null,
  ];

  try {
    await db.query(sql, params);
    console.log(`➡️ Inserted: ${billNumber}`);
  } catch (err) {
    if (attempt < 3) {
      console.log(`⚠️ insert ${billNumber} attempt ${attempt}/3: ${err.message}`);
      await sleep(500 * attempt);
      return insertBill(bill, attempt + 1);
    }

    console.error(`❌ Insert failed ${billNumber}: ${err.message}`);
  }
}

async function ingestBills() {
  console.log('🔥 ingestBills.js started');

  try {
    const bills = await fetchBills();

    for (let i = 0; i < bills.length; i++) {
      await insertBill(bills[i]);
      await sleep(100); // IMPORTANT: prevents Render DB meltdown
    }

    console.log('✅ Ingest complete');
  } catch (err) {
    console.error('❌ Fatal ingest error:', err.message);
  } finally {
    // clean shutdown prevents "connection terminated unexpectedly"
    await db.pool.end();
  }
}

ingestBills();