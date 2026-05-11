import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendContact } from '../controllers/contact.controller';

const router = Router();

// 5 messages per IP per 15 min
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/', contactLimit, sendContact);

export default router;
