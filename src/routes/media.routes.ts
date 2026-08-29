import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { upload as multerUpload } from '../controllers/upload.controller';
import { upload, list, remove } from '../controllers/media.controller';

const router = Router();

// Toutes les routes média nécessitent le rôle ADMIN
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/media?search=&page=&limit=
router.get('/', list);

// POST /api/admin/media  (multipart, champ "file")
router.post('/', multerUpload.single('file'), upload);

// DELETE /api/admin/media/:id
router.delete('/:id', remove);

export default router;
