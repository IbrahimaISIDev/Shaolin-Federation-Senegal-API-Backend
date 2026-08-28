import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

// Admin — Membres
import {
    listMembers,
    getMember,
    updateMember,
    deleteMember,
    validate,
    suspend,
    gradeHistory,
    exportMembersPdf,
} from '../controllers/admin.members.controller';

// Admin — Clubs
import {
    listClubs,
    create as createClub,
    update as updateClub,
    activate,
    deactivate,
    remove as removeClub,
} from '../controllers/admin.clubs.controller';

// Admin — Actualités
import {
    listArticles,
    getArticle,
    createArticle,
    updateArticle,
    publishArticle,
    unpublishArticle,
    deleteArticle,
} from '../controllers/admin.actualites.controller';

// Admin — Compétitions
import {
    listAdmin as listCompetitions,
    getAdmin as getCompetition,
    create as createCompetition,
    update as updateCompetition,
    remove as removeCompetition,
} from '../controllers/competitions.controller';

// Admin — Stats
import { stats } from '../controllers/admin.stats.controller';

const router = Router();

// Toutes les routes admin nécessitent le rôle ADMIN
router.use(requireAuth, requireRole('ADMIN'));

// ── Stats ─────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', stats);

// ── Membres ──────────────────────────────────────────────────────────────────
// GET  /api/admin/members?search=&club=&status=&annee=&page=&limit=
router.get('/members', listMembers);
// GET  /api/admin/members/export/pdf?search=&club=&status=&annee=
router.get('/members/export/pdf', exportMembersPdf);
// GET  /api/admin/members/:id
router.get('/members/:id', getMember);
// PUT  /api/admin/members/:id
router.put('/members/:id', updateMember);
// DELETE /api/admin/members/:id
router.delete('/members/:id', deleteMember);
// PATCH /api/admin/members/:id/validate
router.patch('/members/:id/validate', validate);
// PATCH /api/admin/members/:id/suspend
router.patch('/members/:id/suspend', suspend);
// GET  /api/admin/members/:id/grade-history
router.get('/members/:id/grade-history', gradeHistory);

// ── Clubs ────────────────────────────────────────────────────────────────────
// GET  /api/admin/clubs
router.get('/clubs', listClubs);
// POST /api/admin/clubs
router.post('/clubs', createClub);
// PUT  /api/admin/clubs/:id
router.put('/clubs/:id', updateClub);
// PATCH /api/admin/clubs/:id/activate
router.patch('/clubs/:id/activate', activate);
// PATCH /api/admin/clubs/:id/deactivate
router.patch('/clubs/:id/deactivate', deactivate);
// DELETE /api/admin/clubs/:id
router.delete('/clubs/:id', removeClub);

// ── Actualités ───────────────────────────────────────────────────────────────
// GET  /api/admin/actualites?search=&published=&page=&limit=
router.get('/actualites', listArticles);
// POST /api/admin/actualites
router.post('/actualites', createArticle);
// GET  /api/admin/actualites/:id
router.get('/actualites/:id', getArticle);
// PUT  /api/admin/actualites/:id
router.put('/actualites/:id', updateArticle);
// PATCH /api/admin/actualites/:id/publish
router.patch('/actualites/:id/publish', publishArticle);
// PATCH /api/admin/actualites/:id/unpublish
router.patch('/actualites/:id/unpublish', unpublishArticle);
// DELETE /api/admin/actualites/:id
router.delete('/actualites/:id', deleteArticle);

// ── Compétitions ─────────────────────────────────────────────────────────────
// GET  /api/admin/competitions?search=&page=&limit=
router.get('/competitions', listCompetitions);
// POST /api/admin/competitions
router.post('/competitions', createCompetition);
// GET  /api/admin/competitions/:id
router.get('/competitions/:id', getCompetition);
// PUT  /api/admin/competitions/:id
router.put('/competitions/:id', updateCompetition);
// DELETE /api/admin/competitions/:id
router.delete('/competitions/:id', removeCompetition);

export default router;
