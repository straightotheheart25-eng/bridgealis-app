# Quick Cloud Run Deployment

This folder contains everything you need to deploy Bridgealis to Google Cloud Run.

## Option 1: One-Command Deployment (Recommended)

### Prerequisites
- Google Cloud account with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- A GCP project created

### Steps

1. **Edit the deployment script** with your values:
   ```bash
   nano deploy-cloud-run.sh
   ```
   
   Update these lines at the top:
   ```bash
   PROJECT_ID="your-project-id"
   DB_PASSWORD="your-secure-password"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-secret"
   ```

2. **Make the script executable**:
   ```bash
   chmod +x deploy-cloud-run.sh
   ```

3. **Run the deployment**:
   ```bash
   ./deploy-cloud-run.sh
   ```

4. **Follow the prompts** and wait 10-15 minutes for deployment to complete.

That's it! The script will:
- ✅ Enable required GCP APIs
- ✅ Create Cloud SQL PostgreSQL database
- ✅ Create Cloud Storage bucket
- ✅ Deploy your app to Cloud Run
- ✅ Deploy the worker
- ✅ Configure all environment variables

### After Deployment

1. **Update OAuth redirect URI**:
   - Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
   - Add the redirect URI shown in the script output

2. **Run database migrations**:
   ```bash
   # Install Cloud SQL Proxy
   curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
   chmod +x cloud_sql_proxy
   
   # Run proxy (use values from script output)
   ./cloud_sql_proxy -instances=PROJECT_ID:REGION:bridgealis-db=tcp:5432
   
   # In another terminal
   export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/bridgealis'
   npx prisma migrate deploy
   npm run seed  # Optional: add test data
   ```

3. **Visit your app** at the URL shown in the deployment output!

## Option 2: Manual Deployment

If you prefer more control, follow the comprehensive guide in [README.md](./README.md#deploying-to-google-cloud-platform).

## Files Included

- `deploy-cloud-run.sh` - Automated deployment script
- `cloudrun.yaml` - Cloud Run service configuration template
- `worker.Dockerfile` - Generated automatically by the script
- `deploy.config` - Configuration template (optional)

## Troubleshooting

**Script fails with "permission denied"**:
```bash
chmod +x deploy-cloud-run.sh
```

**"API not enabled" errors**:
The script enables APIs automatically. If you see this error, wait 1-2 minutes and retry.

**Database connection fails**:
Ensure Cloud SQL Proxy is running and DATABASE_URL is correct.

**Worker not processing jobs**:
Check worker logs:
```bash
gcloud run jobs executions list --job bridgealis-worker --region us-central1
gcloud run jobs executions describe EXECUTION_NAME --region us-central1
```

## Cost Estimate

- **Cloud SQL (db-f1-micro)**: ~$10/month
- **Cloud Run (web app)**: ~$5-20/month (based on traffic)
- **Cloud Run (worker)**: ~$2-5/month
- **Cloud Storage**: ~$1/month (for resumes)

**Total**: ~$18-36/month for moderate usage

Free tier includes:
- 2M Cloud Run requests/month
- First 2000 execution hours free

## Support

For issues or questions:
1. Check the [main README](./README.md)
2. Review [Cloud Run documentation](https://cloud.google.com/run/docs)
3. Check deployment logs: `gcloud run logs read --service bridgealis-app`
