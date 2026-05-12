// src/utils/retry.js

async function retry(fn, retries = 3, delay = 500) {
  let lastErr;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }

  throw lastErr;
}

module.exports = { retry };