import { Router } from 'express';
import { listClubs, getClub, mapClubs, searchMap } from '../controllers/clubs.controller';

const router = Router();

// GET /api/clubs?region=DK&search=shaolin&page=1&limit=20
router.get('/', listClubs);

// GET /api/clubs/map?region=DK&limit=100  — pour la carte
router.get('/map', mapClubs);

// GET /api/clubs/search?q=dakar  — recherche carte
router.get('/search', searchMap);

// GET /api/clubs/:id
router.get('/:id', getClub);

export default router;