# Backend and Database Architecture

## Architecture Overview

Only the **backend** connects to the database. Cloudflare is a tunnel (reverse proxy) only; there is no "Cloudflare ↔ database" connection to configure.

```
Client (browser)  →  Cloudflare Tunnel  →  Backend (Node)  →  Database (MongoDB)
     HTTPS              Forward only           MONGO_URL           Atlas / self-hosted
```

- **Client → Cloudflare:** HTTPS to `api.theabugida.org` (or your API hostname).
- **Cloudflare → Backend:** Tunnel forwards requests to your backend process (e.g. `localhost:8080`). Cloudflare does not store or read user data.
- **Backend → Database:** The backend uses `MONGO_URL` or `MONGODB_URI` to connect to MongoDB. All user information (auth, preferences, progress) is stored and read here.

## Required Backend Environment Variables

Set these where the backend runs (e.g. Railway, VPS, container):

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` or `MONGODB_URI` | Yes | MongoDB connection string. The backend host's outbound IP must be allowed in the database (see below). |
| `JWT_SECRET` | Yes (production) | Secret used to sign and verify JWT tokens. Use a strong random value in production; do not use the default fallback. |
| `PORT` | No | Port the server listens on (defaults to 5000; many hosts use 8080). |
| `CLOUDFLARE_TUNNEL_TOKEN` | If using tunnel | Token for cloudflared to connect the tunnel; not used for database access. |

## Proper Fix Checklist (Backend ↔ Database)

If login fails or user data is not persisted, treat it as a **backend ↔ database** issue:

1. **Set backend env**  
   Where the backend runs, set `MONGO_URL` or `MONGODB_URI` and `JWT_SECRET`. See [.env.example](../.env.example) for a template.

2. **Allow the backend host's IP in the database**  
   - For **MongoDB Atlas:** Go to **Network Access → IP Access List** and add the **outbound IP of the machine running your backend** (e.g. Railway’s egress IP, or your VPS IP).  
   - Do **not** add "Cloudflare" to the database; the connection to MongoDB comes from the backend host, not from Cloudflare.

3. **Verify connectivity**  
   Call `GET /api/health` (e.g. `https://api.theabugida.org/api/health`). The response should include `database: "connected"` and `databaseReady: true`. If not, check env and Atlas Network Access.

## References

- [Backend server setup](../src/server/README.md)
- [Railway + Cloudflare Tunnel](RAILWAY_CLOUDFLARE_SETUP.md) (if using that stack)
