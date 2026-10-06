# Déploiement (VPS)

Copies de référence de l'infrastructure de production. Elles ne sont **pas**
lues automatiquement : le serveur utilise ses propres fichiers. Toute
modification ici doit être reportée à la main.

## Architecture

Le VPS héberge plusieurs projets. Un **Caddy central** (projet Docker
`caddy`, conteneur `caddy-caddy-1`) détient les ports 80/443, gère le HTTPS
et joint chaque site via le réseau Docker externe **`edge`**.

| Fichier de référence | Emplacement sur le VPS |
|---|---|
| `deploy/docker-compose.yml` | `~/shaolin/docker-compose.yml` |
| `deploy/shaolin.caddy` | `~/infra/caddy/sites/shaolin.caddy` |
| `deploy/.env.example` | modèle de `~/shaolin/.env` (secrets, jamais versionné, `chmod 600`) |

Le Caddyfile central (`~/infra/caddy/Caddyfile`) se limite à
`import sites/*.caddy`. Le fichier `~/shaolin/Caddyfile` éventuellement
présent est un reste de l'ancienne installation : il n'est pas lu.

## Déploiement courant

Un push sur `main` déclenche GitHub Actions : vérification du build, puis
SSH → `git pull` → `docker compose up -d --build <service>`.

## Modifier la configuration Caddy

```bash
nano ~/infra/caddy/sites/shaolin.caddy
docker exec caddy-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec caddy-caddy-1 caddy reload   --config /etc/caddy/Caddyfile
```

`reload` applique la configuration sans couper les autres sites ; en cas
d'erreur, Caddy garde l'ancienne configuration.
