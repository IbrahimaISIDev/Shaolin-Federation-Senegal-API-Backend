import { Request, Response } from 'express';
import { z } from 'zod';
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
} from '../services/auth.service';

// ─── Schémas de validation Zod ───────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (8 caractères min)'),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  phone: z.string().optional(),
  clubId: z.number().int().positive('Club invalide'),
  grade: z.string().optional(),
  discipline: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// ─── Cookie helper ───────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  path: '/',
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const user = await registerService(data);

    res.status(201).json({
      data: user,
      message: 'Compte créé avec succès. Votre demande est en cours de validation.',
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      });
      return;
    }
    res.status(err.status || 500).json({
      error: err.message || 'Erreur serveur',
      code: err.code || 'SERVER_ERROR',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await loginService(data);

    // Refresh token en cookie httpOnly
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

    res.json({
      data: { accessToken, user },
      message: 'Connexion réussie',
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(422).json({
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      });
      return;
    }
    res.status(err.status || 500).json({
      error: err.message || 'Erreur serveur',
      code: err.code || 'SERVER_ERROR',
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: 'Refresh token manquant', code: 'MISSING_REFRESH_TOKEN' });
      return;
    }

    const { accessToken, refreshToken } = await refreshService(token);

    // Rotation du cookie
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);

    res.json({
      data: { accessToken },
      message: 'Token renouvelé',
    });
  } catch (err: any) {
    res.clearCookie('refresh_token');
    res.status(err.status || 500).json({
      error: err.message || 'Erreur serveur',
      code: err.code || 'SERVER_ERROR',
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await logoutService(token);
    }
    res.clearCookie('refresh_token');
    res.json({ message: 'Déconnecté avec succès' });
  } catch {
    res.clearCookie('refresh_token');
    res.json({ message: 'Déconnecté' });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  res.json({ data: req.user });
};