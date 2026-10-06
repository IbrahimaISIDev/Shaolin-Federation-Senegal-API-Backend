import { Router } from 'express';
import { publicGallery } from '../controllers/media.controller';

const router = Router();

// GET /api/gallery?album=&limit=  — galerie publique (médias publiés depuis l'admin)
router.get('/', publicGallery);

export default router;
