import { Router } from 'express';
import { listRegions, getRegion } from '../controllers/regions.controller';

const router = Router();

// GET /api/regions
router.get('/', listRegions);

// GET /api/regions/:code  (ex: /api/regions/DK)
router.get('/:code', getRegion);

export default router;