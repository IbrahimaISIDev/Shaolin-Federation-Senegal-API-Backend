import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import regionsRouter from './routes/regions.routes';
import clubsRouter from './routes/clubs.routes';
import membersRouter from './routes/members.routes';
import licensesRouter from './routes/licenses.routes';
import adminRouter from './routes/admin.routes';
import actualitesRouter from './routes/actualites.routes';
import uploadRouter from './routes/upload.routes';
import competitionsRouter from './routes/competitions.routes';
import contactRouter from './routes/contact.routes';
import clubManagerRouter from './routes/club.manager.routes';
import affiliationRouter from './routes/affiliation.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middlewares globaux ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origine non autorisée : ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser()); // lecture des cookies

// Rate limiting global
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Rate limiting strict sur l'auth
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.use('/api/auth', authRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/members', membersRouter);
app.use('/api/licenses', licensesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/actualites', actualitesRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/contact', contactRouter);
app.use('/api/club', clubManagerRouter);
app.use('/api/affiliations', affiliationRouter);


// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable`, code: 'NOT_FOUND' });
});

// ─── Error handler global ────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne', code: 'SERVER_ERROR' });
});

// ─── Démarrage ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🥋 API Shaolin démarrée sur http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
});


