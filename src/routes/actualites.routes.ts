import { Router } from 'express';
import { getArticles, getArticle } from '../controllers/actualites.controller';

const router = Router();

// GET /api/actualites
router.get('/', getArticles);

// GET /api/actualites/:slug
router.get('/:slug', getArticle);

export default router;