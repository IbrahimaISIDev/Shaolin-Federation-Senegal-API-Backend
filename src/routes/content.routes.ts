import { Router } from 'express';
import { getContent } from '../controllers/content.controller';

const router = Router();

// GET /api/content/:key  (home | bureau) — public
router.get('/:key', getContent);

export default router;
