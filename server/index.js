require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const processRoutes = require('./routes/process');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production the frontend is served by this same server (same origin),
// so CORS is only needed for local dev.
app.use(cors({
  origin: isProd
    ? false  // same-origin only in production
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
}));

app.use(express.json({ limit: '10mb' }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', processRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve React app in production ─────────────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  // All non-API routes → return the React app (client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏭 Maxion Process Mapper`);
  console.log(`   Mode:      ${isProd ? 'production' : 'development'}`);
  console.log(`   Port:      ${PORT}`);
  console.log(`   OpenAI:    ${process.env.OPENAI_API_KEY ? '✓ configured' : '✗ NOT SET'}`);
  if (isProd) console.log(`   Serving:   client/dist as static`);
  console.log('');
});
