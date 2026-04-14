const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./backend/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/products', require('./backend/routes/products'));
app.use('/api/cart', require('./backend/routes/cart'));
app.use('/api/orders', require('./backend/routes/orders'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  🛒  FreshCart Grocery is running!`);
  console.log(`  ➜  Local: http://localhost:${PORT}\n`);
});
