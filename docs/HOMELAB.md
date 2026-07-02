# Homelab

## Infrastructure

| Component | Detail |
|---|---|
| Host | Debian Linux |
| Storage | `/mnt/Toshiba/` — external drive, all persistent data |
| Docker volumes | `/home/docker-data/volumes/` |
| Compose files | `~/compose/` (central) + individual project dirs |

## Reverse Proxy

**Nginx Proxy Manager** (`nginx-nginxPM-1`)  
Ports: `80`, `81` (admin UI), `443`  
Data: `~/pi_crumbles/nginx/data/` + `letsencrypt/`

Creates the shared `nginx_default` bridge network. Every service that NPM needs to route to joins this network.

---

## Networks

| Network | Driver | Purpose |
|---|---|---|
| `nginx_default` | bridge | Shared proxy network — join this to be accessible via NPM |
| `strichliste_internal` | bridge, internal | Isolates MariaDB from proxy |
| `immich` | bridge, internal | Immich: ML, Postgres, Redis — internal only |
| `norish-network` | bridge | Norish: Postgres, Redis, Chrome — internal only |
| `n8n_default` | bridge | n8n isolated default |
| `pocketbase_default` | bridge | PocketBase isolated default |

---

## Services

### Seedbox / Media

Compose: `~/seedbox/docker-compose.yml`

All arr services share `network_mode: container:gluetun` — all traffic routes through the VPN. Gluetun publishes their ports to the host.

| Container | Port | Notes |
|---|---|---|
| **gluetun** | — | WireGuard VPN (Windscribe, Turkey). Publishes ports for all arr services |
| **sonarr** | 8989 | Config: `/mnt/Toshiba/seedbox/config/sonarr-config` |
| **radarr** | 7878 | Config: `/mnt/Toshiba/seedbox/config/radarr-config` |
| **bazarr** | 6767 | Config: `/mnt/Toshiba/seedbox/config/bazarr-config` |
| **prowlarr** | 9696 | Config: `/mnt/Toshiba/seedbox/config/prowlarr-config` |
| **lidarr** | 8686 | Behind gluetun |
| **qbittorrent** | 18080 | Torrents: `/mnt/Toshiba/seedbox/data/torrents` |
| **jellyseerr** | 5056 | Behind gluetun |
| **jellyfin** | — | On `nginx_default` directly (not VPN). Media: `/mnt/Toshiba/seedbox/data/media` |

### Photos

Compose: `~/compose/immich.yml` + `.immich.env`

| Container | Network | Notes |
|---|---|---|
| **immich_server** | `nginx_default` + `immich` | Port 2283. Uploads via `UPLOAD_LOCATION` env |
| **immich_machine_learning** | `immich` (internal) | Named volume `immich_model-cache` |
| **immich_postgres** | `immich` (internal) | pgvector image. Data via `DB_DATA_LOCATION` env |
| **immich_redis** | `immich` (internal) | Valkey 9 |

### Personal / Self-hosted

| Container | Port | Compose | Data |
|---|---|---|---|
| **mkz** | — | (portainer-managed) | `/mnt/Toshiba/mkz/pb_data` (PocketBase backend) |
| **mkz-tileproxy** | 3100 | — | — |
| **ravemap** | — | (portainer-managed) | no persistent volume |
| **norish-app** | — | `/mnt/Toshiba/norish/docker-compose.yml` | uploads: `/mnt/Toshiba/norish/data`; URL: `food.mkrabs.de` |
| **norish-db** | — | same | `/mnt/Toshiba/norish/postgres` |
| **norish-redis** | — | same | `/mnt/Toshiba/norish/redis` |
| **norish-chrome** | — | same | headless Chrome for scraping |
| **strichliste-app** | — | `~/compose/strichliste.yml` | config: `/mnt/Toshiba/strichliste/config/strichliste.yaml` |
| **strichliste-db** | — | same | MariaDB: `/mnt/Toshiba/strichliste/db` |
| **homeassistant** | — | `~/homeassistant.yml` | `/mnt/Toshiba/home-assistant` |
| **pocketbase** | 8090 | `~/compose/PocketBase/pocketbase.yml` | `/mnt/Toshiba/pocketbase_data` |
| **copyparty** | 3923 | (portainer-managed) | files: `/mnt/Toshiba/copyparty`; config: `/mnt/Toshiba/copyparty.conf/` |
| **budget_app** | 8080 | `~/compose/budget.yml` | `/mnt/Toshiba/budget.db` (SQLite) |
| **n8n** | 5678 | (portainer-managed) | named volume `n8n_data` |
| **blog-web-1** | 1999 | `~/pi_crumbles/Blog/docker-compose.yml` | Django |
| **13tris-web-1** | 8013/8014 | `~/pi_crumbles/13TRIS/docker-compose.yml` | Django + WebSocket |
| **byos_laravel-app-1** | 4567 | `~/byos_laravel/docker-compose.yml` | named volumes `byos_laravel_database`, `byos_laravel_storage` |

### Infrastructure

| Container | Port | Compose | Notes |
|---|---|---|---|
| **portainer** | 9000, 8000 | `~/pi_crumbles/portainer.yml` | Docker UI. `portainer_data` volume + socket |
| **dockhand** | 3000 | `~/compose/dockhand.yml` | Alt Docker dashboard. `compose_dockhand_data` volume |
| **tailscale** | — | `~/compose/docker/tailscale/docker-compose.yml` | `network_mode: host`. `tailscale-data` volume. Auth via `.env` |

---

## Storage Layout

```
/mnt/Toshiba/
├── seedbox/
│   ├── config/          # arr service configs
│   └── data/
│       ├── media/       # jellyfin media library
│       └── torrents/    # qbittorrent downloads
├── home-assistant/      # HA config
├── immich/              # immich uploads
├── norish/
│   ├── data/            # uploads
│   ├── postgres/        # norish DB
│   └── redis/           # norish cache
├── strichliste/
│   ├── config/          # strichliste.yaml
│   └── db/              # MariaDB data
├── mkz/pb_data          # mkz PocketBase data
├── pocketbase_data/     # standalone PocketBase
├── copyparty/           # copyparty files
├── copyparty.conf/      # copyparty config
├── pictures/            # raw photos
├── backup/              # backups
├── vault/               # Vaultwarden data (~/vault symlink)
└── budget.db            # budget app SQLite
```

### Named Docker Volumes

| Volume | Used by |
|---|---|
| `n8n_data` | n8n |
| `portainer_data` | portainer |
| `compose_dockhand_data` | dockhand |
| `immich_model-cache` | immich machine learning |
| `byos_laravel_database` | byos_laravel |
| `byos_laravel_storage` | byos_laravel |
| `static_data` | shared static assets (NPM) |

---

## Known Quirks

- **norish-app** crash-loops periodically — check logs with `docker logs norish-app`
- **Vaultwarden** has `restart: "no"` — won't auto-start after reboot, must start manually
- **Seedbox** compose is duplicated: `~/seedbox/docker-compose.yml` and `~/seedbox/ezarr/docker-compose.yml` (ezarr is old/unused)
- The `arr` network is referenced in seedbox compose but commented out — all arr traffic goes through gluetun's network stack instead
