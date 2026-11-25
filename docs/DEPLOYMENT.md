# Deployment guide: get a live link

## What goes where (and why not everything on Vercel)

| Part | Where | Why |
| --- | --- | --- |
| React frontend | **Vercel** | Static site, free and instant |
| Django API | **Render** or **Railway** (Docker) | Django is a long-running Python server; Vercel is built for static sites and short serverless functions |
| Node notification service | **Render** or **Railway** (Docker) | It runs a cron job for reminders, which serverless platforms cannot keep alive |
| MySQL | Managed MySQL (Aiven, Railway, TiDB Cloud, or similar) | Vercel has no MySQL, and a database must live somewhere persistent |

Prices and free tiers change, so check each provider's current terms. Free web services usually go to sleep when idle, so the first request after a pause can take 30 to 60 seconds. Reminder emails will not run while the service is asleep.

If you would rather run it all on **one server** (a VPS or a spare PC), skip to [Option B](#option-b-everything-on-one-server-with-docker-compose).

---

## Option A: live link with Vercel + Render + managed MySQL

Do the steps in this order, because each one gives you a URL the next one needs.

### Step 0: Put the code on GitHub

```bash
cd hospital-management-system
git init
git add .
git commit -m "Initial commit: Hospital Management System"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hospital-management-system.git
git push -u origin main
```

`.gitignore` already keeps `.env`, `node_modules` and database files out of the repo. Never commit real passwords.

### Step 1: Create the MySQL database

Create a MySQL 8 database on your chosen provider and copy its connection details. Build one connection string:

```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

If the provider requires TLS/SSL (many do), you will also set `DB_SSL=true` in the next step. If they give you a CA certificate file instead, use `DB_SSL_CA` with its path.

### Step 2: Deploy the Django API on Render

1. Render dashboard → **New +** → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Name:** `hms-api` (your URL will be `https://hms-api.onrender.com`; if the name is taken, Render adds a suffix, so use the URL it shows)
   - **Language / Runtime:** Docker
   - **Root Directory:** `backend-django`
   - **Health Check Path:** `/api/health/`
3. Add **Environment Variables**:

| Key | Value |
| --- | --- |
| `SECRET_KEY` | A random string of 32+ characters. Generate: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `false` |
| `DATABASE_URL` | The MySQL connection string from Step 1 |
| `DB_SSL` | `true` (only if your database requires TLS) |
| `CORS_ALLOWED_ORIGINS` | Fill in after Step 4 (your Vercel URL). Use a placeholder for now |
| `CSRF_TRUSTED_ORIGINS` | `https://hms-api.onrender.com` (your API's own URL) |
| `INTERNAL_API_KEY` | Another random string. Use the same value in Step 3 |
| `SEED_DEMO` | `true` for a portfolio demo (creates the demo logins). Use `false` for real data |
| `TIME_ZONE` | `Asia/Kolkata` (or your zone) |

4. Click **Create Web Service**. On start, the container waits for the database, runs migrations, seeds demo data if enabled, then launches gunicorn.
5. Open `https://hms-api.onrender.com/api/health/`. You should see `{"status": "ok"}`.

### Step 3: Deploy the Node notification service on Render

1. **New +** → **Web Service** → same repo.
2. Settings: **Name** `hms-notify`, **Runtime** Docker, **Root Directory** `notification-service`, **Health Check Path** `/health`.
3. Environment variables:

| Key | Value |
| --- | --- |
| `DJANGO_API_URL` | `https://hms-api.onrender.com` (no `/api`, no trailing slash) |
| `INTERNAL_API_KEY` | Same value as the Django service |
| `CORS_ORIGINS` | Your Vercel URL (fill in after Step 4) |
| `HOSPITAL_NAME` | Your hospital's name, printed on invoices |
| `REMINDERS_ENABLED` | `false` on a free plan that sleeps, otherwise `true` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional. Without SMTP, reminders are only printed to the log |

4. Check `https://hms-notify.onrender.com/health`.

### Step 4: Deploy the React frontend on Vercel

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo.
2. **Root Directory:** `frontend`. Framework preset: Vite (detected automatically). `vercel.json` already contains the rewrite that makes page refreshes work.
3. **Environment Variables** (these are read at build time):

| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://hms-api.onrender.com/api` |
| `VITE_NOTIFY_URL` | `https://hms-notify.onrender.com/api` |
| `VITE_SHOW_DEMO` | `true` for the demo, `false` for real use |

4. **Deploy**. Vercel gives you a URL such as `https://hospital-management-system.vercel.app`. This is your **live link**.

### Step 5: Allow the frontend to call your APIs (CORS)

Go back and set the real Vercel URL (no trailing slash):

- Render `hms-api` → `CORS_ALLOWED_ORIGINS` = `https://hospital-management-system.vercel.app`
- Render `hms-notify` → `CORS_ORIGINS` = `https://hospital-management-system.vercel.app`

Both services redeploy automatically. Open your Vercel link and sign in with a demo account.

> **Vercel preview URLs:** every branch gets its own `*.vercel.app` address. To allow those while testing, set `CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$` on Django and `CORS_ALLOW_VERCEL=true` on Node. This allows any site on `vercel.app`, so remove it once you are done.

### Railway instead of Render

The steps are the same: create one service per folder (`backend-django`, `notification-service`) from the GitHub repo with that folder as the root directory (Docker is detected from the `Dockerfile`), add the same environment variables, and generate a public domain for each service. Railway also offers MySQL as an add-on, and the connection string it provides works as `DATABASE_URL`.

---

## Option B: everything on one server with Docker Compose

On any Linux server with Docker installed:

```bash
git clone https://github.com/YOUR-USERNAME/hospital-management-system.git
cd hospital-management-system
cp .env.example .env
nano .env        # set strong passwords, SECRET_KEY, INTERNAL_API_KEY
```

Set the public addresses in `.env`, replacing `YOUR_SERVER` with the server's domain or IP:

```
VITE_API_URL=http://YOUR_SERVER:8000/api
VITE_NOTIFY_URL=http://YOUR_SERVER:5000/api
CORS_ALLOWED_ORIGINS=http://YOUR_SERVER:3000
CSRF_TRUSTED_ORIGINS=http://YOUR_SERVER:8000
```

Then:

```bash
docker compose up -d --build
```

The app is on port 3000. For HTTPS and a real domain, put a reverse proxy such as Caddy or Nginx in front, use `https://` URLs in the variables above, and rebuild the frontend (`docker compose up -d --build frontend`) because `VITE_*` values are baked in at build time.

Useful commands:

```bash
docker compose logs -f backend      # follow API logs
docker compose exec backend python manage.py createsuperuser
docker compose down                 # stop (data kept in the mysql_data volume)
docker compose down -v              # stop and DELETE the database
```

---

## Before you share the link

- [ ] `DEBUG=false` and a long random `SECRET_KEY` on the API
- [ ] Different `INTERNAL_API_KEY` from the example, identical on Django and Node
- [ ] Only the demo users are in the database (this is a demo, not a certified medical system, so never enter real patient data)
- [ ] Change the demo passwords, or turn off `SEED_DEMO` and `VITE_SHOW_DEMO` once you have created your own admin: `python manage.py createsuperuser`
- [ ] Add the live link, screenshots and a short demo video to the README

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser console shows a **CORS** error | The exact Vercel URL (with `https://`, no trailing slash) must be in `CORS_ALLOWED_ORIGINS` on Django and `CORS_ORIGINS` on Node |
| API returns **400 Bad Request / DisallowedHost** | Add your API hostname to `ALLOWED_HOSTS` (Render and Railway hostnames are added automatically) |
| Login says **Cannot reach the server** | Check `VITE_API_URL` ends in `/api`, then redeploy the frontend because Vite reads it at build time |
| First request is very slow | A free instance was asleep. Wait about a minute, then retry |
| Django log shows **Waiting for database** repeatedly | Check `DATABASE_URL`; if the provider requires TLS, set `DB_SSL=true`; check the database allows connections from outside |
| `SECRET_KEY` error on start | Set `SECRET_KEY` when `DEBUG` is `false` |
| Invoice download fails | Check `DJANGO_API_URL` on the Node service and that `VITE_NOTIFY_URL` points to it |
| Admin page at `/admin/` shows a CSRF error | Set `CSRF_TRUSTED_ORIGINS` to the API's own `https://` URL |
| 404 when refreshing a page on Vercel | Make sure `frontend/vercel.json` is in the repo and the Vercel root directory is `frontend` |
