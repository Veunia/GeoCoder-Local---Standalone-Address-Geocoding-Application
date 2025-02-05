import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs/promises';
import { GeocodingManager } from './services/geocoding.js';
import { CSVHandler } from './utils/csv_handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Load configuration
let config;
try {
  const configFile = await fs.readFile('config.json', 'utf-8');
  config = JSON.parse(configFile);
} catch (error) {
  config = {
    "default_service": "nominatim",
    "rate_limits": { "nominatim": 1.0 },
    "max_batch_size": 1000
  };
}

// Initialize services
const geocodingManager = new GeocodingManager(config);

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'templates', 'index.html'));
});

app.post('/geocode', async (req, res) => {
  try {
    const { address, service, name } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await geocodingManager.geocode(address, service);
    res.json({
      name: name || '',
      address,
      latitude: result.lat,
      longitude: result.lon,
      status: result.status,
      provider: result.provider
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/geocode-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const addresses = await CSVHandler.readCSV(csvContent);
    
    if (addresses.length === 0) {
      return res.status(400).json({ error: 'No valid addresses found in CSV' });
    }

    if (addresses.length > config.max_batch_size) {
      return res.status(400).json({
        error: `Batch size exceeds limit of ${config.max_batch_size} addresses`
      });
    }

    const results = [];
    const serviceName = req.body.service || config.default_service;

    for (const addressData of addresses) {
      if (!CSVHandler.validateRow(addressData)) {
        continue;
      }

      const result = await geocodingManager.geocode(
        addressData.address,
        serviceName
      );

      results.push({
        name: addressData.name || '',
        address: addressData.address,
        latitude: result.lat,
        longitude: result.lon,
        status: result.status,
        provider: result.provider
      });
    }

    res.json(results);
  } catch (error) {
    console.error('CSV Processing Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process CSV file' });
  }
});

app.post('/export', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No valid data provided for export' });
    }

    const csvContent = await CSVHandler.exportResults(data, [
      'name',
      'address',
      'latitude',
      'longitude',
      'status',
      'provider'
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=geocoding_results.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
