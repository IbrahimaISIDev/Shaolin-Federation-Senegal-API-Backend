# Déploiement (VPS)

Fichiers de référence de l'orchestration de production. Ils ne sont **pas**
lus automatiquement sur le serveur : le VPS utilise ses propres copies dans
`~/shaolin/`. Toute modification ici doit être reportée à la main :

```bash
# sur le VPS
cd ~/shaolin
diff docker-compose.yml backend/deploy/docker-compose.yml
diff Caddyfile backend/deploy/Caddyfile
# si OK :
cp backend/deploy/docker-compose.yml backend/deploy/Caddyfile .
docker compose up -d --build
```

Le fichier `.env` (secrets) n'est jamais versionné : partir de
`deploy/.env.example`, puis `chmod 600 .env`.

Déploiement courant : un push sur `main` déclenche GitHub Actions
(vérification du build, puis SSH → `git pull` → `docker compose up -d --build <service>`).
