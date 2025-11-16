# 🚀 COPY-PASTE GOOGLE CLOUD DEPLOYMENT

## Step 1: Edit These 4 Values in deploy-cloud-run.sh

Open `deploy-cloud-run.sh` and replace:

```bash
PROJECT_ID="your-project-id"              # Line 13 - Your GCP project
DB_PASSWORD="your-secure-password"         # Line 15 - Create a strong password
GOOGLE_CLIENT_ID="your-google-client-id"   # Line 16 - From step 2 below
GOOGLE_CLIENT_SECRET="your-google-secret"  # Line 17 - From step 2 below
```

## Step 2: Get Google OAuth Credentials

**Copy-paste this URL into your browser:**
```
https://console.cloud.google.com/apis/credentials
```

1. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
2. Application type: **Web application**
3. Authorized redirect URIs: `https://bridgealis-app-XXXXX.run.app/api/auth/callback/google`
   - (Update with your actual URL after deployment)
4. Copy the **Client ID** and **Client Secret**

## Step 3: Run the Deployment Script

**Copy-paste these commands:**

```bash
# Make script executable
chmod +x deploy-cloud-run.sh

# Run deployment
./deploy-cloud-run.sh
```

⏱️ **Wait 10-15 minutes** - The script does everything automatically!

## Step 4: Run Database Migrations

After deployment completes, the script will show you a DATABASE_URL. **Copy-paste these commands:**

```bash
# Install Cloud SQL Proxy (one-time setup)
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Start proxy (replace PROJECT_ID and REGION with your values)
./cloud_sql_proxy -instances=PROJECT_ID:REGION:bridgealis-db=tcp:5432 &

# Run migrations (in a new terminal)
export DATABASE_URL='******localhost:5432/bridgealis'
npx prisma migrate deploy

# Optional: Add test data
npm run seed
```

## Step 5: Update OAuth Redirect URI

The deployment script shows your app URL. **Go back to:**
```
https://console.cloud.google.com/apis/credentials
```

Edit your OAuth client and update redirect URI with the actual URL.

## ✅ DONE!

Your app is live! The script showed you the URL at the end.

---

## 📋 Complete Copy-Paste Checklist

- [ ] Edit 4 values in `deploy-cloud-run.sh`
- [ ] Get OAuth credentials from Google Console
- [ ] Run `chmod +x deploy-cloud-run.sh && ./deploy-cloud-run.sh`
- [ ] Wait 10-15 minutes
- [ ] Run database migrations (commands shown by script)
- [ ] Update OAuth redirect URI with actual app URL
- [ ] Visit your app!

---

## 🆘 Troubleshooting

**"Project not found"**: Make sure you created a GCP project first at https://console.cloud.google.com

**"Billing not enabled"**: Enable billing at https://console.cloud.google.com/billing

**"Permission denied"**: Run `gcloud auth login` first

**Need help?**: See full guide in `DEPLOY.md`

---

## 💰 Cost Estimate

- Database: ~$10/month (db-f1-micro)
- App + Worker: ~$5-15/month (pay per use)
- Storage: ~$1/month
- **Total: ~$16-26/month** with free tier credits

First-time users get $300 free credit!
