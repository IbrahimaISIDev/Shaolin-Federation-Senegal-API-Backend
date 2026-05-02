# 🥋 Shaolin Fédération Sénégal — API Backend

> API REST officielle de la **Fédération Shaolin Sénégal** — gestion des membres, clubs, licences, compétitions, actualités et back-office administratif.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql)](https://www.mysql.com/)

---

## 📋 Table des matières

1. [Présentation](#-présentation)
2. [Stack technique](#-stack-technique)
3. [Architecture du projet](#-architecture-du-projet)
4. [Modèle de données](#-modèle-de-données)
5. [Authentification & sécurité](#-authentification--sécurité)
6. [Référence complète de l'API](#-référence-complète-de-lapi)
7. [Installation et démarrage](#-installation-et-démarrage)
8. [Variables d'environnement](#-variables-denvironnement)
9. [Base de données](#-base-de-données)
10. [Upload de fichiers](#-upload-de-fichiers)
11. [Scripts disponibles](#-scripts-disponibles)
12. [Déploiement](#-déploiement)
13. [Conventions de code](#-conventions-de-code)
14. [Feuille de route](#-feuille-de-route)

---

## 🎯 Présentation

Cette API alimente la plateforme web de la **Fédération Shaolin Sénégal**. Elle expose un ensemble d'endpoints REST organisés en trois niveaux d'accès :

| Niveau | Description |
|---|---|
| **Public** | Lecture des clubs, actualités, compétitions, vérification de QR code |
| **Membre** | Gestion du profil, consultation de la licence, historique des paiements |
| **Admin** | CRUD complet sur toutes les entités, statistiques, gestion des utilisateurs |

L'API est consommée par le frontend Next.js du projet.  
**Port par défaut** : `4000`  
**Préfixe** : `/api`

---

## 🛠 Stack technique

| Catégorie | Technologie | Version |
|---|---|---|
| Runtime | Node.js | ≥ 18.x |
| Framework HTTP | Express | 5.x |
| Langage | TypeScript | 5.7 |
| ORM | Prisma | 6.x |
| Base de données | MySQL | 8.x |
| Authentification | JSON Web Tokens (JWT) | jsonwebtoken |
| Hashage mdp | bcryptjs | — |
| Cookies | cookie-parser | 1.4.x |
| Stockage fichiers | Cloudinary | — |
| Sécurité HTTP | Helmet | 8.x |
| CORS | cors | 2.x |
| Logs | Morgan | 1.x |
| Rate limiting | express-rate-limit | 8.x |
| QR Code | qrcode (packages/qrcode) | — |
| PDF | pdf-lib ou pdfkit (pdf.service.ts) | — |
| Dev server | tsx + nodemon | — |
| Package manager | pnpm (workspace) | — |

---

## 📁 Architecture du projet

```
shaolin-federation/
├── apps/
│   └── api/                          # Application backend principale
│       ├── prisma/
│       │   ├── schema.prisma         # Schéma de la base de données
│       │   ├── seed.ts               # Seed initial (14 régions du Sénégal)
│       │   └── migrations/           # Historique des migrations Prisma
│       ├── src/
│       │   ├── index.ts              # Point d'entrée Express — middlewares + routes
│       │   ├── middlewares/
│       │   │   └── auth.middleware.ts # requireAuth, requireRole, optionalAuth
│       │   ├── routes/
│       │   │   ├── auth.routes.ts    # POST /api/auth/*
│       │   │   ├── clubs.routes.ts   # GET /api/clubs/*  (public)
│       │   │   ├── members.routes.ts # GET /api/members/* (membre connecté)
│       │   │   ├── licenses.routes.ts# GET/POST /api/licenses/*
│       │   │   ├── actualites.routes.ts # GET /api/actualites/* (public)
│       │   │   ├── competitions.routes.ts # GET/POST /api/competitions/*
│       │   │   ├── regions.routes.ts # GET /api/regions/*  (public)
│       │   │   ├── upload.routes.ts  # PUT/POST /api/upload/*
│       │   │   └── admin.routes.ts   # /api/admin/* (ADMIN requis)
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   ├── clubs.controller.ts
│       │   │   ├── members.controller.ts
│       │   │   ├── licenses.controller.ts
│       │   │   ├── regions.controller.ts
│       │   │   ├── upload.controller.ts
│       │   │   ├── competitions.controller.ts
│       │   │   ├── admin.controller.ts        # Clubs admin (re-export)
│       │   │   ├── admin.clubs.controller.ts  # Re-export clubs admin
│       │   │   ├── admin.members.controller.ts# CRUD membres admin
│       │   │   ├── admin.actualites.controller.ts # CRUD actualités admin
│       │   │   └── admin.stats.controller.ts  # KPIs tableau de bord
│       │   ├── services/
│       │   │   ├── auth.service.ts            # register, login, refresh, logout
│       │   │   ├── clubs.service.ts           # Lecture clubs publics + carte
│       │   │   ├── members.service.ts         # Profil membre connecté
│       │   │   ├── licenses.service.ts        # Vérification + QR code
│       │   │   ├── regions.service.ts         # Listing des régions
│       │   │   ├── upload.service.ts          # Upload Cloudinary
│       │   │   ├── pdf.service.ts             # Génération PDF licence
│       │   │   ├── admin.service.ts           # (ancienne version — clubs admin)
│       │   │   ├── admin.members.service.ts   # CRUD membres admin
│       │   │   ├── admin.actualites.service.ts# CRUD actualités admin
│       │   │   └── competitions.service.ts    # Public + admin compétitions
│       │   ├── jobs/                          # Cron jobs (ex: expiration licences)
│       │   ├── types/                         # Types TypeScript globaux
│       │   └── utils/                         # Helpers divers
│       ├── .env                              # Variables d'environnement (NON commité)
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── qrcode/                       # Service QR Code partagé
│   ├── types/                        # Types TypeScript partagés monorepo
│   └── ui/                           # Composants UI partagés (si applicable)
├── turbo.json                        # Pipeline Turborepo
└── pnpm-workspace.yaml               # Workspace pnpm
```

---

## 🗄 Modèle de données

### Entités principales

```
User ──────┐
  id       │ 1:1
  email    ├──── Member ──────┬──── License ──── Payment
  password │  id              │  id
  role     │  prenom          │  uuid (QR)
  isActive │  nom             │  status
           │  grade           │  dateFin
           │  discipline      │  annee
           │  photoUrl        │
           │  clubId  ────────┼──── Club ──── Region
           │                  │   id           id
RefreshToken│                  │   nom          nom
  token    │                  │   regionId     code
  userId───┘                  │   logoUrl      latitude
                              │                longitude
                              │
                              ├──── Inscription ──── Competition
                              │                   id
                              │                   titre
                              │                   dateDebut
                              │                   regionId
                              │
                              └──── (via Competition) ──── Resultat

Actualite (indépendant)
  id, titre, slug, contenu, imageUrl, isPublished, publishedAt
```

### Rôles utilisateurs

| Rôle | Description |
|---|---|
| `MEMBER` | Pratiquant affilié — accès à son profil, sa licence |
| `CLUB_MANAGER` | Gestionnaire d'un club (prévu V2) |
| `ADMIN` | Administrateur fédéral — accès complet |

### Statuts de licence

| Statut | Description |
|---|---|
| `PENDING` | En attente de validation et de paiement |
| `ACTIVE` | Licence valide |
| `EXPIRED` | Licence expirée (dateFin dépassée) |
| `SUSPENDED` | Suspendue par un administrateur |

---

## 🔐 Authentification & sécurité

### Stratégie JWT double-token

```
┌─────────┐   POST /api/auth/login   ┌────────────────────┐
│ Client  │ ───────────────────────► │ API                │
│         │                          │                    │
│         │ ◄─── accessToken (15min) │ Stocké en mémoire  │
│         │ ◄─── refreshToken cookie │ httpOnly, 7 jours  │
└─────────┘                          └────────────────────┘

Chaque requête protégée :
Authorization: Bearer <accessToken>

Renouvellement automatique :
POST /api/auth/refresh  (cookie refresh_token envoyé automatiquement)
↳ Retourne un nouveau accessToken + rotation du refreshToken
```

### Middlewares de protection

```typescript
// Vérifie le Bearer token JWT
requireAuth

// Vérifie le rôle (plusieurs rôles possibles)
requireRole('ADMIN')
requireRole('ADMIN', 'CLUB_MANAGER')

// Auth optionnelle (contenu public mais enrichi si connecté)
optionalAuth
```

### Sécurité globale

| Mesure | Configuration |
|---|---|
| **Helmet** | Headers HTTP sécurisés (CSP, HSTS, etc.) |
| **CORS** | Limité à `FRONTEND_URL` uniquement |
| **Rate limiting global** | 100 req / 15 min |
| **Rate limiting auth** | 20 req / 15 min sur `/api/auth` |
| **Bcrypt** | Rounds = 12 pour le hashage des mots de passe |
| **Refresh token rotation** | À chaque renouvellement, l'ancien token est révoqué |
| **Cookie httpOnly** | Le refresh token n'est jamais accessible côté JS |

---

## 📡 Référence complète de l'API

> **Base URL** : `http://localhost:4000/api`  
> 🔓 = Public · 🔑 = Membre connecté · 👑 = Admin requis

---

### Auth — `/api/auth`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Créer un compte + profil membre |
| POST | `/auth/login` | 🔓 | Connexion — retourne accessToken + pose le cookie refreshToken |
| POST | `/auth/refresh` | 🔓 (cookie) | Renouveler l'accessToken |
| POST | `/auth/logout` | 🔓 (cookie) | Révoquer le refreshToken |
| GET | `/auth/me` | 🔑 | Retourner le profil de l'utilisateur connecté |

**POST `/auth/register`**
```json
{
  "email": "amadou@example.com",
  "password": "motdepasse123",
  "prenom": "Amadou",
  "nom": "Ba",
  "phone": "+221771234567",
  "clubId": 1,
  "grade": "Ceinture verte",
  "discipline": "Kung Fu"
}
```

**POST `/auth/login`**
```json
{ "email": "amadou@example.com", "password": "motdepasse123" }
```
Réponse :
```json
{
  "data": {
    "accessToken": "eyJhbG...",
    "user": { "id": 1, "email": "...", "role": "MEMBER", "memberId": 3 }
  }
}
```

---

### Régions — `/api/regions`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/regions` | 🔓 | Liste des 14 régions du Sénégal |
| GET | `/regions/:code` | 🔓 | Détail d'une région par code (ex: `DK`) |

---

### Clubs — `/api/clubs`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/clubs` | 🔓 | Liste paginée (`?search=&region=DK&page=1&limit=20`) |
| GET | `/clubs/:id` | 🔓 | Détail d'un club |
| GET | `/clubs/map` | 🔓 | Clubs géolocalisés pour la carte (`?region=DK&limit=100`) |
| GET | `/clubs/search` | 🔓 | Recherche rapide (`?q=dakar`) |

---

### Actualités — `/api/actualites`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/actualites` | 🔓 | Articles publiés (`?page=&limit=`) |
| GET | `/actualites/:slug` | 🔓 | Détail d'un article par slug |

---

### Compétitions — `/api/competitions`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/competitions` | 🔓 | Liste publique (`?search=&region=&status=upcoming&page=&limit=`) |
| GET | `/competitions/:id` | 🔓 | Détail d'une compétition + résultats |
| POST | `/competitions/:id/inscriptions` | 🔑 | S'inscrire à une compétition |

**Valeurs de `status`** : `upcoming` (à venir) · `open` (en cours) · `completed` (terminé)

---

### Membres connectés — `/api/members`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/members/me` | 🔑 | Profil complet du membre connecté |
| PUT | `/members/me` | 🔑 | Mettre à jour son profil |
| GET | `/members/me/license` | 🔑 | Licence active du membre |
| GET | `/members/me/payments` | 🔑 | Historique des paiements |

---

### Licences — `/api/licenses`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/licenses/verify?token=xxx` | 🔓 | Vérifier un QR Code lors d'un événement |
| GET | `/licenses/:id/qrcode` | 🔑 | Obtenir le QR Code de sa licence |
| POST | `/licenses` | 👑 | Créer une licence pour un membre |

---

### Upload — `/api/upload`

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| PUT | `/upload/photo` | 🔑 | Uploader sa photo de profil (champ: `photo`) |
| PUT | `/upload/clubs/:id/logo` | 👑 | Logo d'un club (champ: `logo`) |
| POST | `/upload/articles/image` | 👑 | Image de couverture d'un article (champ: `image`) |
| GET | `/upload/licenses/:id/pdf` | 🔑 | Télécharger le PDF de licence (redirige vers Cloudinary) |

> Tous les uploads utilisent `multipart/form-data`.  
> Les fichiers sont stockés sur **Cloudinary**.

---

### Administration — `/api/admin`

> 👑 Toutes les routes admin nécessitent un token avec `role: ADMIN`.

#### Stats tableau de bord

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | KPIs complets (membres, clubs, licences, compétitions, graphiques) |

**Réponse `/admin/stats`** :
```json
{
  "data": {
    "totalMembers": 342,
    "newMembersThisWeek": 12,
    "pendingMembers": 8,
    "totalClubs": 47,
    "activeClubs": 43,
    "totalLicenses": 312,
    "activeLicenses": 289,
    "expiringLicenses": 15,
    "expiredLicenses": 23,
    "draftArticles": 3,
    "totalCompetitions": 18,
    "upcomingCompetitions": 4,
    "membresParRegion": [
      { "regionNom": "Dakar", "regionCode": "DK", "total": 145 }
    ],
    "membresMoisParMois": [
      { "mois": "2024-01", "total": 24 }
    ]
  }
}
```

#### Gestion des membres

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/members` | Liste (`?search=&club=&status=&page=&limit=`) |
| GET | `/admin/members/:id` | Détail d'un membre |
| PUT | `/admin/members/:id` | Modifier un membre |
| DELETE | `/admin/members/:id` | Supprimer un membre |
| PATCH | `/admin/members/:id/validate` | Valider un membre (activer le compte) |
| PATCH | `/admin/members/:id/suspend` | Suspendre un membre |

#### Gestion des clubs

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/clubs` | Liste (`?search=&region=&active=&page=&limit=`) |
| POST | `/admin/clubs` | Créer un club |
| PUT | `/admin/clubs/:id` | Modifier un club |
| PATCH | `/admin/clubs/:id/activate` | Activer un club |
| PATCH | `/admin/clubs/:id/deactivate` | Désactiver un club |
| DELETE | `/admin/clubs/:id` | Supprimer (interdit si membres actifs) |

#### Gestion des actualités

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/actualites` | Liste (`?search=&published=true/false&page=&limit=`) |
| POST | `/admin/actualites` | Créer un article (slug auto-généré) |
| GET | `/admin/actualites/:id` | Détail |
| PUT | `/admin/actualites/:id` | Modifier |
| PATCH | `/admin/actualites/:id/publish` | Publier |
| PATCH | `/admin/actualites/:id/unpublish` | Dépublier |
| DELETE | `/admin/actualites/:id` | Supprimer |

#### Gestion des compétitions

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/competitions` | Liste (`?search=&page=&limit=`) |
| POST | `/admin/competitions` | Créer une compétition |
| GET | `/admin/competitions/:id` | Détail + inscriptions + résultats |
| PUT | `/admin/competitions/:id` | Modifier |
| DELETE | `/admin/competitions/:id` | Supprimer |

---

### Format des réponses

L'API retourne systématiquement des objets JSON avec la structure suivante :

**Succès** :
```json
{ "data": { ... }, "message": "Opération réussie" }
```

**Liste paginée** :
```json
{ "data": [...], "total": 342, "page": 1, "limit": 20 }
```

**Erreur** :
```json
{ "error": "Message lisible", "code": "ERROR_CODE", "details": [...] }
```

**Codes d'erreur courants** :

| Code HTTP | Code métier | Description |
|---|---|---|
| 400 | `BAD_REQUEST` | Requête malformée |
| 401 | `MISSING_TOKEN` | Token absent |
| 401 | `INVALID_TOKEN` | Token invalide ou expiré |
| 401 | `INVALID_CREDENTIALS` | Email/mot de passe incorrect |
| 403 | `FORBIDDEN` | Rôle insuffisant |
| 404 | `NOT_FOUND` | Ressource introuvable |
| 409 | `EMAIL_TAKEN` | Email déjà utilisé |
| 409 | `HAS_MEMBERS` | Club avec membres (suppression refusée) |
| 422 | `VALIDATION_ERROR` | Données invalides (Zod) |
| 500 | `SERVER_ERROR` | Erreur interne |

---

## 🚀 Installation et démarrage

### Prérequis

- **Node.js** ≥ 18.x
- **pnpm** ≥ 8.x — `npm install -g pnpm`
- **MySQL** 8.x en local ou distant
- **Cloudinary** — compte gratuit pour le stockage de fichiers

### Installation (depuis la racine du monorepo)

```bash
# 1. Cloner le dépôt
git clone https://github.com/IbrahimaISIDev/shaolin-federation-api.git
cd shaolin-federation

# 2. Installer les dépendances du workspace
pnpm install

# 3. Configurer les variables d'environnement
cp apps/api/.env.example apps/api/.env
# Éditer apps/api/.env avec vos valeurs
```

### Démarrage de l'API seule

```bash
# Depuis la racine du monorepo
pnpm --filter api dev

# Ou depuis apps/api/
cd apps/api
pnpm dev
```

L'API sera disponible sur [http://localhost:4000](http://localhost:4000).

Vérification :
```bash
curl http://localhost:4000/health
# → { "status": "ok", "timestamp": "2024-..." }
```

---

## 🔑 Variables d'environnement

Créez le fichier `apps/api/.env` (non commité) à partir de `.env.example` :

```env
# ─── Base de données ─────────────────────────────────────────────────────────
DATABASE_URL="mysql://utilisateur:motdepasse@localhost:3306/shaolin_db"

# ─── JWT ─────────────────────────────────────────────────────────────────────
# Générer avec : openssl rand -base64 64
JWT_SECRET="votre_secret_jwt_access_très_long_et_aléatoire"
JWT_REFRESH_SECRET="votre_secret_jwt_refresh_différent_du_précédent"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# ─── QR Code ─────────────────────────────────────────────────────────────────
QR_SECRET="votre_secret_qr_code"

# ─── Cloudinary (stockage fichiers) ──────────────────────────────────────────
CLOUDINARY_CLOUD_NAME="votre_cloud_name"
CLOUDINARY_API_KEY="votre_api_key"
CLOUDINARY_API_SECRET="votre_api_secret"

# ─── Serveur ─────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# ─── Email (notifications, V2) ───────────────────────────────────────────────
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre@email.com"
SMTP_PASS="votre_mot_de_passe_application"
```

> ⚠️ Ne committez **jamais** votre fichier `.env`. Il est inclus dans `.gitignore`.

---

## 🗃 Base de données

### Créer la base MySQL

```sql
CREATE DATABASE shaolin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'shaolin'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON shaolin_db.* TO 'shaolin'@'localhost';
FLUSH PRIVILEGES;
```

### Appliquer les migrations

```bash
cd apps/api

# Créer et appliquer la migration initiale
pnpm prisma migrate dev --name init

# OU en production (sans prompt)
pnpm prisma migrate deploy
```

### Seed initial (14 régions du Sénégal)

```bash
pnpm prisma db seed
```

### Prisma Studio (interface graphique BDD)

```bash
pnpm prisma studio
# Ouvre http://localhost:5555
```

### Générer le client Prisma (après modification du schéma)

```bash
pnpm prisma generate
```

---

## 📸 Upload de fichiers

Les fichiers uploadés sont stockés sur **Cloudinary**. L'API accepte les fichiers via `multipart/form-data`.

| Type | Endpoint | Champ | Taille max |
|---|---|---|---|
| Photo de profil | `PUT /api/upload/photo` | `photo` | 5 MB |
| Logo de club | `PUT /api/upload/clubs/:id/logo` | `logo` | 5 MB |
| Image d'article | `POST /api/upload/articles/image` | `image` | 10 MB |

**Exemple d'upload avec curl** :
```bash
curl -X PUT http://localhost:4000/api/upload/photo \
  -H "Authorization: Bearer <accessToken>" \
  -F "photo=@/chemin/vers/photo.jpg"
```

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement avec rechargement automatique (tsx + nodemon) |
| `pnpm build` | Compilation TypeScript → `dist/` |
| `pnpm start` | Démarrer le serveur compilé (`node dist/index.js`) |
| `pnpm type-check` | Vérifier la cohérence des types TypeScript |
| `pnpm prisma migrate dev` | Créer et appliquer une migration |
| `pnpm prisma migrate deploy` | Appliquer les migrations en production |
| `pnpm prisma db seed` | Insérer les données initiales (14 régions) |
| `pnpm prisma studio` | Ouvrir l'interface graphique de la BDD |
| `pnpm prisma generate` | Regénérer le client Prisma |

---

## ☁️ Déploiement

### Variables requises en production

Configurer sur votre plateforme (Railway, Render, VPS) :

```
DATABASE_URL=mysql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
QR_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://votre-domaine-frontend.com
```

### Commande de démarrage en production

```bash
# Build
pnpm build

# Migration (à faire avant le démarrage)
pnpm prisma migrate deploy

# Démarrage
pnpm start
```

### Railway / Render

1. Connectez votre dépôt GitHub
2. Définissez `Root Directory` → `apps/api`
3. **Build command** : `pnpm install && pnpm prisma generate && pnpm build`
4. **Start command** : `pnpm prisma migrate deploy && pnpm start`
5. Ajoutez toutes les variables d'environnement

---

## 📐 Conventions de code

### Structure d'un service

```typescript
// services/example.service.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getExample = async (id: number) => {
  const item = await prisma.example.findUnique({ where: { id } });
  if (!item) throw { status: 404, message: 'Introuvable', code: 'NOT_FOUND' };
  return item;
};
```

### Structure d'un contrôleur

```typescript
// controllers/example.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { getExample } from '../services/example.service';

const Schema = z.object({ name: z.string().min(1) });

export const get = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await getExample(parseInt(req.params.id as string));
    res.json({ data: item });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
  }
};
```

### Règles de nommage

| Élément | Convention |
|---|---|
| Fichiers | `kebab-case.ts` |
| Fonctions exportées | `camelCase` |
| Types/Interfaces | `PascalCase` |
| Variables d'env | `SCREAMING_SNAKE_CASE` |
| Routes Prisma | `snake_case` (via `@@map`) |

### Validation avec Zod

Tous les body de requête sont validés avec **Zod** avant traitement.  
Les erreurs Zod retournent un code `422 VALIDATION_ERROR` avec la liste des champs invalides.

---

## 🗓 Feuille de route

### V1 — Actuel ✅

- [x] Authentification JWT (register, login, refresh, logout)
- [x] Gestion des régions (14 régions du Sénégal)
- [x] CRUD Clubs (public + admin complet)
- [x] CRUD Membres (membre connecté + admin complet)
- [x] CRUD Actualités (public + admin + publish/unpublish)
- [x] CRUD Compétitions (public + admin)
- [x] Inscription aux compétitions
- [x] Licences (création, vérification QR, PDF)
- [x] Upload fichiers Cloudinary (photo, logo, image)
- [x] Statistiques tableau de bord enrichies
- [x] Rate limiting + Helmet + CORS

### V2 — Prochaines étapes

- [ ] Paiement en ligne (Wave, Orange Money, Carte bancaire)
- [ ] Notifications email (inscription validée, licence expirante)
- [ ] Cron job d'expiration automatique des licences
- [ ] Module résultats de compétitions (CRUD Résultats)
- [ ] Rôle `CLUB_MANAGER` avec périmètre limité à son club
- [ ] Recherche full-text avancée
- [ ] WebSockets pour les notifications temps réel

---

## 📄 Licence

Ce projet est propriétaire — développé par **Shaoum Service Digital** pour la **Fédération Shaolin Sénégal**.  
Tous droits réservés © 2025.

---

<div align="center">
  <p>Développé avec ❤️ pour la Fédération Shaolin Sénégal</p>
  <p><strong>Shaoum Service Digital</strong></p>
</div>
