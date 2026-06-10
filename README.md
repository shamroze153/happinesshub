# 🎉 Happiness Hub — Setup Guide

## Complete Setup in 5 Steps

---

## STEP 1: Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → New Spreadsheet
2. Name it **"Happiness Hub Database"**
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
   ```

---

## STEP 2: Set Up Google Apps Script

1. In your Google Sheet → **Extensions → Apps Script**
2. Delete all existing code in `Code.gs`
3. Paste the entire contents of `backend/Code.gs`
4. At the top of the file, update:
   ```javascript
   const CONFIG = {
     SPREADSHEET_ID: "YOUR_SHEET_ID_HERE",   // ← paste your Sheet ID
     DRIVE_FOLDER_ID: "YOUR_FOLDER_ID_HERE", // ← see Step 3
     ADMIN_PASSWORD: "your_secure_password", // ← change this!
     SESSION_SECRET: "change_this_secret",   // ← change this!
   };
   ```
5. Click **Save** (Ctrl+S)
6. In the function dropdown, select **`setupSheets`** → click **Run**
   - This creates all 6 sheets with correct headers automatically
   - Grant permissions when prompted

---

## STEP 3: Create Google Drive Upload Folder

1. Go to [drive.google.com](https://drive.google.com)
2. Create a new folder: **"Happiness Hub Uploads"**
3. Right-click the folder → **Get Link** → Copy
4. The folder ID is in the URL:
   ```
   https://drive.google.com/drive/folders/THIS_IS_YOUR_FOLDER_ID
   ```
5. Paste this ID into `DRIVE_FOLDER_ID` in your Apps Script

---

## STEP 4: Deploy Apps Script as Web App

1. In Apps Script → **Deploy → New Deployment**
2. Click the ⚙️ gear next to **Type** → select **Web App**
3. Settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/XXXXXXXX/exec
   ```
6. Open `frontend/lib/hh.js` and replace:
   ```javascript
   const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec";
   ```
   with your actual URL.

> ⚠️ Every time you edit Code.gs, create a **New Deployment** and update the URL in hh.js

---

## STEP 5: Deploy Frontend to Vercel

1. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial Happiness Hub"
   git remote add origin https://github.com/YOUR_USERNAME/happiness-hub.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework: **Other** (no framework)
4. Root Directory: leave as `/`
5. Click **Deploy**
6. Done! Your site is live.

---

## First Login

| Role   | URL                    | Credentials |
|--------|------------------------|-------------|
| Admin  | `/admin/login.html`    | ID: `admin` / Password: whatever you set in CONFIG |
| Agent  | `/agent-login.html`    | Created by admin |
| Seller | `/seller-login.html`   | Created by admin |

---

## Admin Quick Start

After deployment:

1. **Login** to `/admin/login.html`
2. Go to **Sellers** → Add your first seller
3. Go to **Products** → Add your first product
   - Set the seller ID from step 2
4. Go to **Agents** → Add your first agent
5. Share the site URL with buyers!

---

## Agent Referral Links

Every agent gets a unique referral link:
```
https://yoursite.vercel.app/?ref=agent01
```

When buyers visit via this link, all their orders are automatically linked to that agent.

---

## Buyer Flow (No Login Required)

```
1. Buyer visits site
2. Browses products → clicks product card
3. Clicks "Buy This Product" → opens affiliate link
4. Buys the product
5. Returns to product page → fills in name, WhatsApp, Order ID, screenshot
6. Submits → gets Order ID
7. Tracks cashback at /track.html
```

---

## Folder Structure

```
happiness-hub/
├── frontend/
│   ├── index.html          ← Buyer homepage
│   ├── product.html        ← Product detail + order form
│   ├── track.html          ← Order tracking
│   ├── agent-login.html    ← Agent login
│   ├── agent-dashboard.html← Agent dashboard
│   ├── seller-login.html   ← Seller login
│   ├── seller-dashboard.html← Seller dashboard
│   ├── admin/
│   │   ├── login.html      ← Admin login
│   │   └── index.html      ← Full admin dashboard
│   ├── lib/
│   │   └── hh.js           ← Shared JS library + API client
│   └── styles/
│       └── main.css        ← Full design system
├── backend/
│   └── Code.gs             ← Google Apps Script (entire backend)
├── docs/
│   └── ARCHITECTURE.md     ← System design docs
├── vercel.json             ← Vercel deployment config
└── README.md               ← This file
```

---

## Updating Apps Script

After any code change:
1. Apps Script → **Deploy → Manage Deployments**
2. Edit the active deployment → **New Version** → Deploy
3. URL stays the same ✅ (no need to update hh.js again)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 403 | Redeploy Apps Script with "Anyone" access |
| Products don't load | Check your SPREADSHEET_ID in Code.gs |
| File upload fails | Check your DRIVE_FOLDER_ID; make sure folder is accessible |
| Login always fails | Make sure you ran `setupSheets` first |
| CORS errors | This is normal in development — deploy to Vercel and test there |

---

## Security Notes

- Change `ADMIN_PASSWORD` and `SESSION_SECRET` immediately
- The session token is a simple base64 hash — suitable for MVP
- For production, upgrade to proper JWT with expiry
- Add Google Sheets row-level access control for multi-seller isolation
- Consider rate limiting via Apps Script execution limits

---

## Phase Roadmap (What's Built)

- ✅ Phase 1: Google Apps Script backend (full REST API)
- ✅ Phase 2: Buyer homepage, product detail, order submission
- ✅ Phase 3: Agent login, dashboard, order submission
- ✅ Phase 4: Seller login, dashboard, status management
- ✅ Phase 5: Admin dashboard, analytics, product/agent/seller management

**Next enhancements:**
- WhatsApp notifications via Twilio or WhatsApp Business API
- Email notifications on order status change
- Commission tracking and payout reports
- Multi-image products
- Bulk product import via CSV
