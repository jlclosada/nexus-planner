# Nexus — Project Management Platform

> A full-featured, modern project management application built with Next.js 15, Prisma, and PostgreSQL. Manage sprints, tickets, epics, teams, and code repositories — all from one place.

![Next.js](https://img.shields.io/badge/Next.js-15.3.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Demo Data (Seed)](#demo-data-seed)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [GitHub Integration](#github-integration)
- [Deploying to Production](#deploying-to-production)
- [Troubleshooting](#troubleshooting)

---

## Features

### Project Management
- **Projects** with color coding, custom keys (e.g. `RDCP`), descriptions, and team members
- **Sprints** with start/end dates, velocity tracking, goals, and status lifecycle (Planned → Active → Completed)
- **Epics** for grouping related tickets across sprints
- **Backlog** management with drag-and-drop ordering

### Kanban Board
- Drag-and-drop tickets across columns (Backlog → Todo → In Progress → In Review → Blocked → Done)
- Smooth Framer Motion animations with lift effect on drag
- Real-time column highlighting on hover
- Configurable columns with ticket counts

### Tickets
- Types: **Epic**, **Story**, **Task**, **Bug**, **Subtask**, **Spike**
- Priorities: Critical, High, Medium, Low
- Rich modal with: description (edit mode), subtasks with progress bar, attachments (drag-and-drop upload), comments, activity log
- Story points (Fibonacci grid), due dates, sprint & epic assignment
- Label system with custom colors
- Assignee & reporter with avatars

### Repository Integration (GitHub)
- Link any project to a GitHub repository
- Create branches directly from a ticket (auto-names as `PROJ-3-ticket-title`)
- View all branches in the **Repository** tab with last commit info and linked ticket
- Commit timeline per branch with author avatars, SHA copy, merge commit badges
- Branch chip on ticket modal when a branch already exists — click to copy the branch name

### Notifications
- Real-time notification feed grouped by date (Today / Yesterday / This Week / Older)
- Unread count badge in sidebar (refreshes every 30s)
- Per-type icons: assigned, commented, status changed, sprint started/completed, mention, invite
- Mark as read individually or all at once

### User Profiles & Settings
- Avatar upload with camera button overlay and preview
- Edit name, job title, bio
- Change password with show/hide toggle

### Dashboard
- Project summaries with active sprint, story points progress, ticket counts
- My Tickets section with direct access to open tickets
- Activity feed and quick stats

### UX
- Global Command Palette (`Cmd/Ctrl + K`) for instant navigation
- Dark theme throughout
- Smooth cursor hover states, button press animations, focus rings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.3.1 (App Router) |
| Language | TypeScript 5 |
| Auth | NextAuth.js v4 (JWT strategy) |
| ORM | Prisma 5.22 |
| Database | PostgreSQL 16 (Docker) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI primitives |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Animations | Framer Motion 12 |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Architecture Overview

```
nexus/
├── app/
│   ├── (auth)/              # Login & Register pages
│   ├── (dashboard)/         # Protected app pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── projects/        # Project list + creation
│   │   │   └── [projectId]/ # Board, Backlog, Sprints, Epics,
│   │   │                    # Repository, Analytics, Settings
│   │   ├── notifications/   # Notification center
│   │   └── settings/        # User profile & security
│   └── api/                 # REST API routes (Next.js Route Handlers)
├── components/
│   ├── board/               # KanbanBoard, KanbanColumn, TicketCard
│   ├── layout/              # Sidebar, Header, CommandPalette
│   ├── tickets/             # TicketModal, TicketBadge
│   └── ui/                  # shadcn/ui base components
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # SQL migration history
│   └── seed.ts              # Demo data seeder
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # Prisma singleton
│   └── utils.ts             # Helpers
└── types/
    └── index.ts             # Shared TypeScript types
```

---

## Local Setup

### Prerequisites

Make sure you have the following installed:

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **npm** ≥ 9
- **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop/) (for the database)
- **Git**

---

### Step 1 — Clone the repository

```bash
git clone <your-repo-url>
cd nexus
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://nexus:nexus_password@localhost:5433/nexus_db"
NEXTAUTH_SECRET="any-random-string-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

> **Tip:** Generate a secure secret with: `openssl rand -base64 32`

---

### Step 4 — Start the database

```bash
npm run db:up
```

This starts a PostgreSQL 16 container on port **5433** (not 5432, to avoid conflicts with any local Postgres installation).

Verify it's running:

```bash
docker ps
# Should show: nexus_db  postgres:16-alpine  ...  0.0.0.0:5433->5432/tcp
```

---

### Step 5 — Run database migrations

```bash
npm run db:migrate
```

This applies all SQL migrations and generates the Prisma client.

> **Windows note:** If you get an `EPERM` error while regenerating the Prisma client with the server running, stop the server first, then run `npm run db:generate`.

---

### Step 6 — (Optional) Load demo data

```bash
npm run db:seed
```

See [Demo Data](#demo-data-seed) for the full list of what gets created and the demo login credentials.

---

### Step 7 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret key for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | Full URL of the app (`http://localhost:3000` locally) |

**Full `.env` example:**

```env
# Database
DATABASE_URL="postgresql://nexus:nexus_password@localhost:5433/nexus_db"

# Auth
NEXTAUTH_SECRET="change-me-to-a-long-random-string-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Database

The database runs in Docker via `docker-compose.yml`:

| Setting | Value |
|---------|-------|
| Image | postgres:16-alpine |
| Container name | nexus_db |
| Host port | **5433** |
| Database | nexus_db |
| User | nexus |
| Password | nexus_password |
| Data volume | nexus_postgres_data (persistent between restarts) |

### Useful database commands

```bash
npm run db:up              # Start database container
npm run db:down            # Stop database container
npm run db:studio          # Open Prisma Studio at localhost:5555
npm run db:migrate         # Create + apply a new migration (dev)
npm run db:migrate:deploy  # Apply existing migrations (production, no prompts)
npm run db:generate        # Regenerate Prisma client from schema
npm run db:reset           # Drop all data + re-apply all migrations
npm run db:seed            # Load demo data
```

---

## Demo Data (Seed)

```bash
npm run db:seed
```

Creates the following demo content:

| Resource | Count | Details |
|----------|-------|---------|
| Users | 3 | Admin + 2 members |
| Projects | 2 | "Nexus Platform" (NX), "API Gateway" (API) |
| Sprints | 3 | 1 completed, 1 active, 1 planned |
| Epics | 3 | Authentication, Dashboard, Infrastructure |
| Tickets | 24+ | Mix of all types, statuses, and priorities |
| Labels | 5 | frontend, backend, auth, performance, ux |
| Comments | 4 | On active tickets |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `demo@nexus.app` | `demo1234` |
| Member | `alice@nexus.app` | `demo1234` |
| Member | `bob@nexus.app` | `demo1234` |

---

## Available Scripts

```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

npm run db:up            # Start PostgreSQL container
npm run db:down          # Stop PostgreSQL container
npm run db:migrate       # Create + apply migration (dev)
npm run db:migrate:deploy # Apply migrations (production)
npm run db:seed          # Load demo data
npm run db:studio        # Open Prisma Studio at localhost:5555
npm run db:reset         # Drop all data + re-apply migrations
npm run db:generate      # Regenerate Prisma client from schema
```

---

## Project Structure

### Key files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema — edit to change the data model |
| `prisma/seed.ts` | Demo data seeder |
| `lib/auth.ts` | NextAuth configuration, session callbacks |
| `lib/prisma.ts` | Prisma singleton (prevents connection leaks in dev) |
| `app/api/` | All REST API endpoints |
| `components/board/KanbanBoard.tsx` | Main drag-and-drop board |
| `components/tickets/TicketModal.tsx` | Full ticket detail modal |
| `app/(dashboard)/projects/[projectId]/layout.tsx` | Project tab navigation |
| `types/index.ts` | Shared TypeScript types for the whole app |

### Data model relationships

```
User ──< ProjectMember >── Project ──< Sprint ──< Ticket
                                   ──< Epic   ──< Ticket
                                   ──< Label  ──< TicketLabel >── Ticket

Ticket ──< Comment
       ──< Activity
       ──< Attachment
       ──< Ticket (subtasks, self-referential)

User ──< Notification
```

---

## GitHub Integration

Each project can be linked to a GitHub repository for branch management directly from tickets.

### Setup

1. Go to **Project → Settings → Repository**
2. Fill in:
   - **Provider**: `github`
   - **Owner**: your GitHub username or org (e.g. `jlclosada`)
   - **Repository name**: the repo name (e.g. `my-project`)
   - **Default branch**: `main`
   - **Personal Access Token**: a GitHub PAT with `repo` scope

### Generating a GitHub Personal Access Token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name, choose expiration
4. Check the scope: ✅ `repo` (full control of private repositories)
5. Click **Generate token** — copy the token (starts with `ghp_`, shown only once)

> For organization repositories, after generating the token go to the token page and click **Configure SSO → Authorize** for your organization if SSO is enabled.

### Features once connected

- **Create branches** from any ticket — default name: `PROJ-3-ticket-title` (customizable)
- **Branch chip** appears on the ticket modal with a copy button once a branch is linked
- **Repository tab** on each project shows all branches with last commit info and linked tickets
- **Commit history** per branch with author avatars, timestamps, merge badges, and SHA copy

> ⚠️ GitHub tokens are stored in the database. Ensure your database is not publicly accessible in production.

---

## Deploying to Production

### Option A — Vercel + Neon (Recommended — easiest, free tier available)

**Neon** provides serverless PostgreSQL. **Vercel** hosts Next.js natively. Both integrate seamlessly.

#### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) → **New Project**
2. Choose a region and create the project
3. Copy the connection string from the dashboard:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/nexus_db?sslmode=require
   ```

#### 2. Push your code to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

#### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repository
2. Vercel auto-detects Next.js — no build config needed
3. Add these environment variables in the Vercel dashboard under **Settings → Environment Variables**:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Your Vercel URL, e.g. `https://nexus-app.vercel.app` |

4. Click **Deploy**

#### 4. Run migrations on the production database

Option 1 — from your local machine with the Neon DATABASE_URL:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Option 2 — add to Vercel's **Build Command** in project settings:

```
npx prisma migrate deploy && next build
```

---

### Option B — Railway (App + DB in one platform)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Add a **PostgreSQL** service from the Railway dashboard
3. Railway auto-injects `DATABASE_URL` into your app
4. Add remaining env vars in the Railway variables panel:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (Railway gives you a domain like `nexus.up.railway.app`)
5. In **Settings → Deploy**, set the start command:
   ```
   npx prisma migrate deploy && npm run start
   ```
6. Railway rebuilds and redeploys automatically on every push to main

---

### Option C — VPS (DigitalOcean, Hetzner, Linode, etc.)

For full control over infrastructure. Requires a Linux server (Ubuntu 22.04+ recommended, 1GB RAM minimum).

#### 1. Provision and connect to the server

```bash
ssh root@your-server-ip
```

#### 2. Install Node.js, Docker, PM2, and Nginx

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# PM2 (process manager — keeps app alive after crashes/reboots)
npm install -g pm2

# Nginx (reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 3. Clone and configure the app

```bash
git clone <your-repo-url> /var/www/nexus
cd /var/www/nexus
npm install
```

Create `/var/www/nexus/.env`:

```env
DATABASE_URL="postgresql://nexus:nexus_password@localhost:5433/nexus_db"
NEXTAUTH_SECRET="your-production-secret-minimum-32-characters"
NEXTAUTH_URL="https://yourdomain.com"
```

#### 4. Start the database

```bash
cd /var/www/nexus
docker compose up -d
```

#### 5. Build the app and apply migrations

```bash
npx prisma migrate deploy
npm run build
```

#### 6. Start with PM2

```bash
pm2 start npm --name "nexus" -- start
pm2 save
pm2 startup    # Run the command it prints to enable auto-start on server reboot
```

#### 7. Configure Nginx as a reverse proxy

Create `/etc/nginx/sites-available/nexus`:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 20M;
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Enable HTTPS with Let's Encrypt (free SSL)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot configures SSL automatically and sets up auto-renewal.

#### 9. Deploying future updates

```bash
cd /var/www/nexus
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart nexus
```

---

### Production checklist

Before going live:

- [ ] `NEXTAUTH_SECRET` is a long random string — **never use the dev default**
- [ ] `NEXTAUTH_URL` matches your exact production domain with `https://`
- [ ] Database port is not publicly accessible (firewall allows only app server)
- [ ] File uploads (`public/uploads/`) are persisted — for Vercel/Railway consider using an object storage service (AWS S3, Cloudflare R2) since serverless deployments have ephemeral filesystems
- [ ] `npm run build` completes without errors locally before deploying
- [ ] SSL certificate is active and auto-renewing
- [ ] Set up automated database backups (provider snapshots or a `pg_dump` cron job)
- [ ] GitHub PATs in the database are scoped to `repo` only and rotated periodically

---

## Troubleshooting

### Port 3000 already in use

```bash
# macOS / Linux
lsof -ti:3000 | xargs kill -9

# Windows — PowerShell
Get-Process node | Stop-Process -Force
```

### Prisma EPERM error on Windows

The Prisma engine DLL is locked by a running Node process. Stop the server first, then:

```bash
rm node_modules/.prisma/client/query_engine-windows.dll.node
npx prisma generate
```

### Database connection refused

```bash
docker ps                  # Check if the container is running
npm run db:up              # Start it if not
docker logs nexus_db       # Inspect errors
```

Make sure `DATABASE_URL` in `.env` uses port **5433** (not 5432).

### Prisma client out of sync after schema change

```bash
# Dev — creates a new migration and regenerates the client
npm run db:migrate

# Or just regenerate the client without a migration
npm run db:generate
```

### App starts but shows blank page

1. Check the browser console for errors
2. Check the terminal for Next.js compilation errors
3. Ensure all environment variables are set in `.env`
4. Try deleting the cache and restarting:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run dev

# macOS / Linux
rm -rf .next && npm run dev
```
