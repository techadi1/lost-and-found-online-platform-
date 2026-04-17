import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import itemRoutes from './routes/itemRoutes.js';
import authRoutes from './routes/authRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import supportTicketRoutes from './routes/supportTicketRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware to handle serverless function path prefixing
app.use((req, res, next) => {
  // Normalize paths for Netlify or other serverless platforms that might prefix the URL
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  // Vercel handles this via vercel.json rewrites, so no specific tweak needed here
  // but we keep this for compatibility.
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/support', supportTicketRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

export default app;
