import { Request, Response } from 'express';
import * as affiliationService from '../services/affiliation.service';
import { generateListPDF } from '../services/pdf.service';

export const submitClub = async (req: Request, res: Response) => {
  try {
    const demande = await affiliationService.submitClubAffiliation(req.body);
    res.status(201).json({ success: true, data: demande, message: 'Demande d\'affiliation club soumise avec succès' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const submitMaitre = async (req: Request, res: Response) => {
  try {
    const demande = await affiliationService.submitMaitreAffiliation(req.body);
    res.status(201).json({ success: true, data: demande, message: 'Demande d\'affiliation maître soumise avec succès' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const submitMembre = async (req: Request, res: Response) => {
  try {
    const demande = await affiliationService.submitMembreAffiliation(req.body);
    res.status(201).json({ success: true, data: demande, message: 'Demande d\'affiliation membre soumise avec succès' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listAffiliations = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const page = req.query.page as string | undefined;
  const limit = req.query.limit as string | undefined;
    const result = await affiliationService.listAffiliations({
      type: type as any,
      status: status as any,
      search: search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportAffiliationsPdf = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const { data } = await affiliationService.listAffiliations({
      type: type as any,
      status: status as any,
      search,
      page: 1,
      limit: 1000,
    });

    const labels: Record<string, string> = { CLUB: 'Club', MAITRE: 'Maître', MEMBRE: 'Membre' };
    const rows = data.map((d: any) => ({
      nom: `${d.prenom} ${d.nom}`,
      type: labels[d.type] ?? d.type,
      email: d.email,
      telephone: d.telephone,
      statut: d.status,
      date: new Date(d.createdAt).toLocaleDateString('fr-FR'),
    }));

    const pdfBuffer = await generateListPDF(
      "Liste des demandes d'affiliation",
      [
        { key: 'nom', label: 'Nom' },
        { key: 'type', label: 'Type' },
        { key: 'email', label: 'Email' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'statut', label: 'Statut' },
        { key: 'date', label: 'Date' },
      ],
      rows
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="affiliations.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAffiliation = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const demande = await affiliationService.getAffiliationById(id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable' });
    res.json({ success: true, data: demande });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const adminId = req.user!.userId;
    const { adminNote } = req.body;
    const updated = await affiliationService.approveAffiliation(id, adminId, adminNote);
    res.json({ success: true, data: updated, message: 'Demande approuvée' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const reject = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const adminId = req.user!.userId;
    const { motifRejet } = req.body;
    if (!motifRejet) return res.status(400).json({ success: false, message: 'Le motif de rejet est requis' });
    const updated = await affiliationService.rejectAffiliation(id, adminId, motifRejet);
    res.json({ success: true, data: updated, message: 'Demande rejetée' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const submitPaymentProof = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { referenceManuelle, preuvePaiementUrl } = req.body;
    if (!referenceManuelle || !preuvePaiementUrl) {
      return res.status(400).json({ success: false, message: 'Référence et preuve de paiement requises' });
    }
    const updated = await affiliationService.submitPaymentProof(id, { referenceManuelle, preuvePaiementUrl });
    res.json({ success: true, data: updated, message: 'Preuve de paiement envoyée' });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const adminId = req.user!.userId;
    const updated = await affiliationService.confirmAffiliationPayment(id, adminId);
    res.json({ success: true, data: updated, message: 'Paiement confirmé' });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};
