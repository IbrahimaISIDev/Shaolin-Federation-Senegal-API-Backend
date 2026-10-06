-- Galerie publique pilotée depuis l'admin : statut de publication + album.
ALTER TABLE "media_items" ADD COLUMN "inGallery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "media_items" ADD COLUMN "album" VARCHAR(100);
CREATE INDEX "media_items_inGallery_createdAt_idx" ON "media_items"("inGallery", "createdAt");

-- Les images déjà ajoutées dans la médiathèque l'ont été pour être montrées :
-- elles deviennent visibles dans la galerie publique (masquables depuis l'admin).
UPDATE "media_items" SET "inGallery" = true;

-- Photos historiques jusqu'ici codées en dur dans la page /galerie : elles
-- deviennent des médias gérables (masquer, renommer, changer d'album,
-- supprimer). publicId « static:… » = fichier servi par le frontend, pas Cloudinary.
INSERT INTO "media_items" ("url", "publicId", "title", "mimeType", "inGallery", "album", "createdAt")
SELECT v.url, v."publicId", v.title, v."mimeType", v."inGallery", v.album, v."createdAt"
FROM (VALUES
  ('/images/stages/remise-diplomes-groupe.jpeg', 'static:/images/stages/remise-diplomes-groupe.jpeg', 'Remise de diplômes', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '0 minutes'),
  ('/images/stages/pratiquants-certificats.jpeg', 'static:/images/stages/pratiquants-certificats.jpeg', 'Certificats Duanwei', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '1 minutes'),
  ('/images/stages/groupe-combat-duanwei.jpeg', 'static:/images/stages/groupe-combat-duanwei.jpeg', 'Combat & Duanwei', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '2 minutes'),
  ('/images/stages/cloture-salut-maitres.jpeg', 'static:/images/stages/cloture-salut-maitres.jpeg', 'Clôture de stage', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '3 minutes'),
  ('/images/stages/moine-pratiquants-exterieur.jpeg', 'static:/images/stages/moine-pratiquants-exterieur.jpeg', 'Stage extérieur', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '4 minutes'),
  ('/images/stages/moine-pratiquants-salle.jpeg', 'static:/images/stages/moine-pratiquants-salle.jpeg', 'Stage en salle', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '5 minutes'),
  ('/images/stages/pratiquants-tenue-grise.jpeg', 'static:/images/stages/pratiquants-tenue-grise.jpeg', 'Pratiquants', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '6 minutes'),
  ('/images/stages/moine-pratiquants-stade.jpeg', 'static:/images/stages/moine-pratiquants-stade.jpeg', 'Stage au stade', 'image/jpeg', true, 'Stages & Duanwei', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '7 minutes'),
  ('/images/delegation/delegation-banniere-temple.jpeg', 'static:/images/delegation/delegation-banniere-temple.jpeg', 'Temple Shaolin', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '8 minutes'),
  ('/images/delegation/aeroport-drapeaux-chine-senegal.jpeg', 'static:/images/delegation/aeroport-drapeaux-chine-senegal.jpeg', 'Accueil officiel', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '9 minutes'),
  ('/images/delegation/aeroport-moines-banniere.jpeg', 'static:/images/delegation/aeroport-moines-banniere.jpeg', 'Moines à l''aéroport', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '10 minutes'),
  ('/images/delegation/aeroport-moines-noir-banniere.jpeg', 'static:/images/delegation/aeroport-moines-noir-banniere.jpeg', 'Moines — tenue noire', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '11 minutes'),
  ('/images/delegation/aeroport-moines-gros-plan.jpeg', 'static:/images/delegation/aeroport-moines-gros-plan.jpeg', 'Moines — gros plan', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '12 minutes'),
  ('/images/delegation/arrivee-aeroport-moines.jpeg', 'static:/images/delegation/arrivee-aeroport-moines.jpeg', 'Arrivée des moines', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '13 minutes'),
  ('/images/delegation/maitre-ngom-aeroport.jpeg', 'static:/images/delegation/maitre-ngom-aeroport.jpeg', 'Maître Ngom', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '14 minutes'),
  ('/images/delegation/delegation-drapeaux.jpeg', 'static:/images/delegation/delegation-drapeaux.jpeg', 'Délégation officielle', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '15 minutes'),
  ('/images/delegation/moines-interieur.jpeg', 'static:/images/delegation/moines-interieur.jpeg', 'Moines — intérieur', 'image/jpeg', true, 'Délégation Temple', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '16 minutes'),
  ('/images/ceremonies/maitre-ngom-decoration-trio.jpeg', 'static:/images/ceremonies/maitre-ngom-decoration-trio.jpeg', 'Décoration officielle', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '17 minutes'),
  ('/images/ceremonies/foule-pratiquants.jpeg', 'static:/images/ceremonies/foule-pratiquants.jpeg', 'Rassemblement', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '18 minutes'),
  ('/images/ceremonies/partenariat-tecno-cheque.jpeg', 'static:/images/ceremonies/partenariat-tecno-cheque.jpeg', 'Partenariat Tecno', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '19 minutes'),
  ('/images/ceremonies/remise-trophee.jpeg', 'static:/images/ceremonies/remise-trophee.jpeg', 'Remise de trophée', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '20 minutes'),
  ('/images/ceremonies/maitre-ngom-decoration-duo.jpeg', 'static:/images/ceremonies/maitre-ngom-decoration-duo.jpeg', 'Cérémonie officielle', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '21 minutes'),
  ('/images/ceremonies/maitre-ngom-moine-shaolin.jpeg', 'static:/images/ceremonies/maitre-ngom-moine-shaolin.jpeg', 'Maître Ngom & Moine Shaolin', 'image/jpeg', true, 'Cérémonies', TIMESTAMP '2026-05-01 00:00:00' - INTERVAL '22 minutes')
) AS v("url", "publicId", "title", "mimeType", "inGallery", "album", "createdAt")
WHERE NOT EXISTS (SELECT 1 FROM "media_items" m WHERE m."publicId" = v."publicId");
