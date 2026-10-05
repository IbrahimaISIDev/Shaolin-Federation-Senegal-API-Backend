// ============================================================
// Client Prisma unique pour toute l'application.
// Chaque `new PrismaClient()` ouvre son propre pool de connexions : avec un
// client par fichier, on multipliait les connexions vers Neon.
// ============================================================
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
