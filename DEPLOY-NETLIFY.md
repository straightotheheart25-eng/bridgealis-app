# Deploying Bridgealis to Netlify

## Quick Deploy to Netlify

### Option 1: Deploy via Netlify CLI (Recommended)

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize and deploy**:
   ```bash
   netlify init
   ```
   
   Follow the prompts:
   - Create & configure a new site
   - Choose your team
   - Site name: `bridgealis-app` (or your preferred name)
   - Build command: `npm run build`
   - Publish directory: `.next`

4. **Set environment variables**:
   ```bash
   # Required variables
   netlify env:set DATABASE_URL "your-database-url"
   netlify env:set NEXTAUTH_URL "https://your-site.netlify.app"
   netlify env:set NEXTAUTH_SECRET "$(openssl rand -base64 32)"
   netlify env:set GOOGLE_CLIENT_ID "your-google-client-id"
   netlify env:set GOOGLE_CLIENT_SECRET "your-google-client-secret"
   netlify env:set GCP_PROJECT_ID "your-gcp-project"
   netlify env:set GCS_BUCKET_NAME "your-bucket-name"
   netlify env:set GCP_SERVICE_ACCOUNT_KEY "your-service-account-key"
   ```

5. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via Netlify Web UI

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Go to Netlify**:
   - Visit https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository

3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Click "Show advanced" → "New variable" to add environment variables

4. **Add environment variables** (in Netlify UI):
   ```
   DATABASE_URL=your-database-url
   NEXTAUTH_URL=https://your-site.netlify.app
   NEXTAUTH_SECRET=generate-with-openssl-rand
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GCP_PROJECT_ID=your-gcp-project
   GCS_BUCKET_NAME=your-bucket-name
   GCP_SERVICE_ACCOUNT_KEY=your-service-account-key
   ```

5. **Click "Deploy site"**

### Option 3: One-Click Deploy Button

Add this to your README for easy deployment:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/straightotheheart25-eng/bridgealis-app)

## Important Notes

### ⚠️ Limitations with Netlify

**Netlify is NOT recommended for this app** because:

1. **No background workers**: Netlify doesn't support long-running background processes
   - The resume generation worker won't work
   - You'll need a separate service for the worker (e.g., Heroku worker, Google Cloud Run Job)

2. **Serverless functions timeout**: Netlify functions have a 10-second timeout (26 seconds on Pro)
   - Resume generation with Puppeteer takes longer
   - Not suitable for PDF generation

3. **No WebSocket support**: Limited real-time capabilities

4. **Database**: You'll need an external PostgreSQL database
   - Recommended: Supabase, Neon, or Railway

### Recommended Alternative: Vercel

For Next.js apps with workers, consider **Vercel** instead:

```bash
npm install -g vercel
vercel
```

Or use the **Google Cloud Run** deployment script already included:
```bash
./deploy-cloud-run.sh
```

## If You Still Want to Use Netlify

### Setup Required External Services

1. **Database**: Use Supabase or Neon (free tier available)
   ```
   DATABASE_URL=******database-url-here
   ```

2. **Worker**: Deploy worker separately
   - Option A: Heroku (with worker dyno)
   - Option B: Railway (background service)
   - Option C: Google Cloud Run Jobs (use included script)

3. **Storage**: Already using Google Cloud Storage (works with Netlify)

### Worker Deployment (Separate from Netlify)

Use the included `deploy-cloud-run.sh` script to deploy just the worker:

```bash
# Deploy only the worker to Google Cloud Run
gcloud run jobs create bridgealis-worker \
  --image gcr.io/PROJECT_ID/bridgealis-worker \
  --region us-central1 \
  --set-env-vars DATABASE_URL="your-db-url" \
  --set-env-vars GCP_PROJECT_ID="your-project" \
  --set-env-vars GCS_BUCKET_NAME="your-bucket"
```

## Post-Deployment Steps

1. **Update OAuth redirect URI**:
   - Go to Google Cloud Console → Credentials
   - Add: `https://your-site.netlify.app/api/auth/callback/google`

2. **Run database migrations**:
   ```bash
   export DATABASE_URL="your-database-url"
   npx prisma migrate deploy
   npm run seed  # Optional
   ```

3. **Test your deployment**:
   - Visit your Netlify URL
   - Try signing in with Google OAuth
   - Apply to jobs
   - Test resume generation (if worker is deployed separately)

## Cost Estimate

- **Netlify**: Free tier (100GB bandwidth, 300 build minutes)
- **Database** (Supabase/Neon): Free tier or ~$5/month
- **Worker** (if using Cloud Run): ~$2-5/month
- **Storage** (GCS): ~$1/month

**Total**: Free - $11/month

## Support

For issues:
1. Check Netlify build logs: `netlify logs`
2. Check function logs in Netlify UI
3. Review [Netlify Next.js guide](https://docs.netlify.com/integrations/frameworks/next-js/)

**Recommendation**: Use the included `deploy-cloud-run.sh` for full functionality with workers!
