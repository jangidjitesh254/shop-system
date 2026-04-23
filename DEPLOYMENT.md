# Deployment Guide

How to go from **localhost MongoDB + LAN backend + Expo Go** → **cloud database + public backend + installable Android APK**.

---

## Part 1 — MongoDB Atlas (cloud database)

MongoDB Atlas has a free **M0** tier that is more than enough for a single-shop system.

### 1.1 Create account & cluster

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up (Google/GitHub login works).
2. Choose **Build a Database → M0 Free**.
3. Pick a provider (AWS), region near you (e.g. `Mumbai (ap-south-1)` for India).
4. Cluster name: `shop-system`. Click **Create Deployment**.

### 1.2 Create database user

When prompted (or under **Database Access** in the left menu):

- **Authentication Method:** Password
- **Username:** `shopadmin`
- **Password:** click *Autogenerate Secure Password* and **copy it** — you won't see it again.
- **Built-in Role:** `Read and write to any database`
- Click **Add User**.

### 1.3 Allow network access

Under **Network Access → Add IP Address**:

- For development: click **Allow Access From Anywhere** (`0.0.0.0/0`). OK for a small app, but for stricter security, add only the backend host's IP later.

### 1.4 Get the connection string

- Top bar → **Connect → Drivers** (Node.js).
- Copy the URI. It looks like:
  ```
  mongodb+srv://shopadmin:<password>@shop-system.abc123.mongodb.net/?retryWrites=true&w=majority&appName=shop-system
  ```
- Replace `<password>` with the password from step 1.2.
- Append the database name before the `?`:
  ```
  mongodb+srv://shopadmin:YOUR_PASS@shop-system.abc123.mongodb.net/shop_system?retryWrites=true&w=majority
  ```

### 1.5 Update the backend `.env`

In `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://shopadmin:YOUR_PASS@shop-system.abc123.mongodb.net/shop_system?retryWrites=true&w=majority
JWT_SECRET=paste_a_long_random_string_here_64+_chars
NODE_ENV=development
ADMIN_EMAIL=you@yourshop.com        # optional — user with this email is auto-promoted to admin on server boot
```

Generate a strong JWT secret:
```powershell
# PowerShell one-liner
[Convert]::ToBase64String((1..48 | % {Get-Random -Max 256} | % {[byte]$_}))
```

Restart backend:
```powershell
cd backend
npm run dev
```

You should see `✓ Server running on 0.0.0.0:5000`. Try registering a user from the app — data now lives on Atlas.

---

## Part 2 — Host the backend publicly

Options (pick one):

| Provider        | Free tier          | Notes                                |
|-----------------|--------------------|--------------------------------------|
| **Render**      | 750 h/month free   | Easiest; sleeps after 15 min idle    |
| **Railway**     | $5 credit/month    | Fastest DX                           |
| **Fly.io**      | Small VM free      | Great perf, Docker-based             |
| **Koyeb**       | 1 free instance    | Also good                            |

### Example: Render (easiest)

1. Push your code to a GitHub repo.
2. <https://render.com> → New → **Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. **Environment variables** (add all):
   - `MONGO_URI` — your Atlas URI
   - `JWT_SECRET` — your secret
   - `NODE_ENV` = `production`
   - `ADMIN_EMAIL` — optional
5. Click **Create Web Service**. After 2–3 min you'll get a URL like:
   ```
   https://shop-system-api.onrender.com
   ```
6. Sanity check in a browser:
   ```
   https://shop-system-api.onrender.com/
   → {"message":"Shop System API is running"}
   ```

### Update the mobile app

In `mobile/app.json`:
```json
"extra": {
  "apiBaseUrl": "https://shop-system-api.onrender.com/api"
}
```

---

## Part 3 — Build the Android APK

### 3.1 Install EAS CLI

```powershell
npm install -g eas-cli
eas login
```

### 3.2 Configure EAS

From `mobile/`:

```powershell
cd mobile
eas build:configure
```

Answer **Android** when asked. It creates `eas.json`. Open it and replace with:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "channel": "production"
    }
  },
  "submit": { "production": {} }
}
```

### 3.3 Build an installable APK

```powershell
eas build -p android --profile preview
```

It uploads, builds on Expo's servers (~10 min), then gives a download URL. Install the APK on any Android phone.

### 3.4 Release build (Play Store)

When you're ready to ship to the Play Store:
```powershell
eas build -p android --profile production
```
This produces an `.aab` (Android App Bundle) ready for Play Console upload.

---

## Part 4 — Admin user setup

Once the backend is deployed:

1. Register a regular shopkeeper account with the email you set as `ADMIN_EMAIL` — on server startup it will auto-promote.
2. **Or** promote any existing user manually:
   ```powershell
   cd backend
   node scripts/promoteAdmin.js you@yourshop.com
   ```

When an admin logs into the app, they'll land on the **Admin Dashboard** instead of the shopkeeper tabs.

---

## Operational tips

- **Backup:** Atlas automatically snapshots (M0 keeps last 2 days). For bigger plans, configure daily backups.
- **Logs:** On Render, click the service → **Logs**. On Railway, same idea.
- **Monitoring:** Free — UptimeRobot pings your `/` every 5 min so Render doesn't spin the service down.
- **HTTPS:** All listed providers give HTTPS by default. Don't use plain HTTP from the app.
- **Secrets:** Never commit `.env`. `.env` is already gitignored.

## Cost summary (typical small shop)

- MongoDB Atlas M0: **free**
- Render free tier: **free** (with cold-start) — upgrade to Starter ($7/mo) to kill cold starts
- EAS build free tier: **30 builds/month free**
- **Total to start: $0**
