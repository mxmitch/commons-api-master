// routes/findMpRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/mp/:postalCode', async (req, res) => {
    const { postalCode } = req.params;
    try {
        const response = await axios.get(
            `https://represent.opennorth.ca/postcodes/${postalCode}/?sets=federal-electoral-districts`
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching MP:', error);
        res.status(500).json({ error: 'Failed to fetch MP data' });
    }
});

router.get('/point', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).send('Latitude and longitude required');

    try {
        const response = await axios.get(
            `https://represent.opennorth.ca/representatives/?point=${lat},${lng}&levels=federal`
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error proxying OpenNorth point request:", error.message);
        res.status(500).send('Failed to fetch representative data');
    }
});

module.exports = router;

