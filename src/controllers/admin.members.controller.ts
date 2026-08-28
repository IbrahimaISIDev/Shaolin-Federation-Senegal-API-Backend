// ============================================================
// CONTROLLER — admin.members.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { z } from 'zod';
import {
    listMembersAdmin,
    getMemberAdmin,
    updateMemberAdmin,
    deleteMemberAdmin,
    validateMember,
    suspendMember,
    getGradeHistoryAdmin,
} from '../services/admin.members.service';
import { generateListPDF } from '../services/pdf.service';

const UpdateMemberSchema = z.object({
    prenom: z.string().min(1).max(100).optional(),
    nom: z.string().min(1).max(100).optional(),
    grade: z.string().max(50).optional(),
    discipline: z.string().max(100).optional(),
    photoUrl: z.string().url().optional().or(z.literal('')),
    clubId: z.number().int().positive().optional(),
    dateNaissance: z.coerce.date().optional(),
    sexe: z.enum(['M', 'F']).optional(),
});

export const listMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, club, status, annee, page = '1', limit = '20' } = req.query as any;
        const result = await listMembersAdmin({
            search,
            clubId: club ? parseInt(club) : undefined,
            status,
            annee: annee ? parseInt(annee) : undefined,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json(result);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const getMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const member = await getMemberAdmin(parseInt(req.params.id as string));
        res.json({ data: member });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const updateMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = UpdateMemberSchema.parse(req.body);
        const member = await updateMemberAdmin(parseInt(req.params.id as string), data, req.user!.userId);
        res.json({ data: member, message: 'Membre mis à jour' });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            res.status(422).json({ error: 'Données invalides', code: 'VALIDATION_ERROR', details: err.errors });
            return;
        }
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const gradeHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const history = await getGradeHistoryAdmin(parseInt(req.params.id as string));
        res.json({ data: history });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const deleteMember = async (req: Request, res: Response): Promise<void> => {
    try {
        await deleteMemberAdmin(parseInt(req.params.id as string));
        res.json({ message: 'Membre supprimé' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const validate = async (req: Request, res: Response): Promise<void> => {
    try {
        await validateMember(parseInt(req.params.id as string));
        res.json({ message: 'Membre validé' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const suspend = async (req: Request, res: Response): Promise<void> => {
    try {
        await suspendMember(parseInt(req.params.id as string));
        res.json({ message: 'Membre suspendu' });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};

export const exportMembersPdf = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, club, status, annee } = req.query as any;
        const { data } = await listMembersAdmin({
            search,
            clubId: club ? parseInt(club) : undefined,
            status,
            annee: annee ? parseInt(annee) : undefined,
            page: 1,
            limit: 1000,
        });

        const rows = data.map((m: any) => ({
            nom: `${m.prenom} ${m.nom}`,
            email: m.user?.email ?? '—',
            club: m.club?.nom ?? '—',
            region: m.club?.region?.nom ?? '—',
            grade: m.grade ?? '—',
            statut: m.licenses?.[0]?.status ?? '—',
        }));

        const pdfBuffer = await generateListPDF(
            'Liste des membres',
            [
                { key: 'nom', label: 'Nom' },
                { key: 'email', label: 'Email' },
                { key: 'club', label: 'Club' },
                { key: 'region', label: 'Région' },
                { key: 'grade', label: 'Grade' },
                { key: 'statut', label: 'Statut licence' },
            ],
            rows
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="membres.pdf"');
        res.send(pdfBuffer);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
    }
};
