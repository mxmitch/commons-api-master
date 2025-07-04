// routes/findMpRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// 🔍 MP by Postal Code
router.get('/mp/:postalCode', async (req, res) => {
  const { postalCode } = req.params;

  try {
    const response = await axios.get(
      `https://represent.opennorth.ca/postcodes/${postalCode}/`
    );

    // Find MP only from federal reps
    const mp = response.data.representatives_centroid?.find(
      (rep) =>
        rep.elected_office?.toLowerCase() === 'mp' ||
        rep.representative_set_name?.toLowerCase().includes('house of commons')
    );

    if (!mp) {
      return res.status(404).json({ error: 'MP not found for this postal code' });
    }

    // ✅ Return in the expected shape for the frontend
    res.json({ representatives_centroid: [mp] });

  } catch (error) {
    console.error('❌ Error fetching MP:', error.message);
    res.status(500).json({ error: 'Failed to fetch MP data' });
  }
});

// 🔍 MP by Latitude/Longitude
router.get('/point', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).send('Latitude and longitude required');

  try {
    const response = await axios.get(
      `https://represent.opennorth.ca/representatives/?point=${lat},${lng}&levels=federal`
    );
    res.json(response.data); // this already returns the right shape
  } catch (error) {
    console.error("❌ Error proxying OpenNorth point request:", error.message);
    res.status(500).send('Failed to fetch representative data');
  }
});

module.exports = router;
