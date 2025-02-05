import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { RateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { MemoryCache } from './services/cache';
import { NominatimService } from './services/geocoding';
import { Config } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize services
const cache = new MemoryCache();
const geocoder = new NominatimService(cache);
const rateLimiter = new RateLimiter();

app.use(express.json());
app.use(express.static('dist'));
app.use(rateLimiter.middleware());

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
