import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { upload, uploadPhoto, uploadLogo, uploadImage, uploadProof } from '../controllers/upload.controller';
import { Request, Response } from 'express';
import { generateLicensePDF } from '../services/pdf.service';

const router = Router();

// PUT /api/upload/photo  — membre connecté
router.put(
  '/photo',
  requireAuth,
  upload.single('photo'),
  uploadPhoto
);

// PUT /api/upload/clubs/:id/logo  — admin
router.put(
  '/clubs/:id/logo',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('logo'),
  uploadLogo
);

// POST /api/upload/articles/image  — admin
router.post(
  '/articles/image',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('image'),
  uploadImage
);

// PUT /api/upload/payment-proof  — public (candidat sans compte)
router.put(
  '/payment-proof',
  upload.single('proof'),
  uploadProof
);

// GET /api/upload/licenses/:id/pdf  — membre connecté
router.get('/licenses/:id/pdf', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const pdfUrl = await generateLicensePDF(parseInt(req.params.id as string), req.user!.userId);
    // Redirection vers le PDF Cloudinary
    res.redirect(pdfUrl);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
});

export default router;