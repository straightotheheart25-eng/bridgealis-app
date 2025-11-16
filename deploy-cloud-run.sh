#!/bin/bash
# Bridgealis App - Cloud Run Deployment Script
# This script deploys the Bridgealis app to Google Cloud Run

set -e  # Exit on error

echo "======================================"
echo "Bridgealis Cloud Run Deployment"
echo "======================================"
echo ""

# Configuration - REPLACE THESE VALUES
PROJECT_ID="your-project-id"              # Your GCP Project ID
REGION="us-central1"                       # GCP region
DB_PASSWORD="your-secure-password"         # Database password
GOOGLE_CLIENT_ID="your-google-client-id"   # From Google Cloud Console
GOOGLE_CLIENT_SECRET="your-google-secret"  # From Google Cloud Console

# Derived values (don't change these)
DB_INSTANCE_NAME="bridgealis-db"
BUCKET_NAME="bridgealis-resumes-${PROJECT_ID}"
SERVICE_NAME="bridgealis-app"
WORKER_JOB_NAME="bridgealis-worker"

echo "Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Database: $DB_INSTANCE_NAME"
echo "  Bucket: $BUCKET_NAME"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."
echo ""

# Step 1: Authenticate and set project
echo "Step 1/8: Setting up GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Enable required APIs
echo "Step 2/8: Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
echo "✓ APIs enabled"
echo ""

# Step 3: Create Cloud SQL database
echo "Step 3/8: Creating Cloud SQL PostgreSQL database..."
if gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID 2>/dev/null; then
    echo "Database instance already exists, skipping creation"
else
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password=$DB_PASSWORD
    echo "✓ Database instance created"
fi

# Create database
gcloud sql databases create bridgealis --instance=$DB_INSTANCE_NAME 2>/dev/null || echo "Database already exists"
echo "✓ Database ready"
echo ""

# Step 4: Create Cloud Storage bucket
echo "Step 4/8: Creating Cloud Storage bucket..."
if gsutil ls -b gs://$BUCKET_NAME 2>/dev/null; then
    echo "Bucket already exists, skipping creation"
else
    gsutil mb -l $REGION gs://$BUCKET_NAME
    echo "✓ Bucket created"
fi
echo ""

# Step 5: Generate secrets
echo "Step 5/8: Generating secrets..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "✓ NextAuth secret generated"
echo ""

# Step 6: Deploy the web app
echo "Step 6/8: Deploying web app to Cloud Run..."
echo "This may take 5-10 minutes..."

gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
    --set-env-vars "DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost/bridgealis?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME" \
    --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
    --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
    --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
    --set-env-vars "GCS_BUCKET_NAME=$BUCKET_NAME" \
    --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "✓ Web app deployed to: $SERVICE_URL"
echo ""

# Update NEXTAUTH_URL with actual URL
echo "Updating NEXTAUTH_URL..."
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --set-env-vars "NEXTAUTH_URL=$SERVICE_URL"
echo "✓ NEXTAUTH_URL updated"
echo ""

# Step 7: Run database migrations
echo "Step 7/8: Setting up database migrations..."
echo ""
echo "IMPORTANT: You need to run migrations manually:"
echo "1. Install Cloud SQL Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy"
echo "2. Run in a terminal:"
echo "   cloud_sql_proxy -instances=$PROJECT_ID:$REGION:$DB_INSTANCE_NAME=tcp:5432"
echo "3. In another terminal, set DATABASE_URL and run migrations:"
echo "   export DATABASE_URL='postgresql://postgres:$DB_PASSWORD@localhost:5432/bridgealis'"
echo "   npx prisma migrate deploy"
echo "   npm run seed  # Optional: add test data"
echo ""
read -p "Press Enter once migrations are complete..."
echo ""

# Step 8: Create worker Dockerfile
echo "Step 8/8: Setting up worker deployment..."
cat > worker.Dockerfile << 'EOF'
FROM node:18-slim

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
    libnspr4 libnss3 libwayland-client0 libxcomposite1 libxdamage1 \
    libxfixes3 libxkbcommon0 libxrandr2 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY lib ./lib/
COPY worker ./worker/

# Generate Prisma client
RUN npx prisma generate

WORKDIR /app/worker
CMD ["node", "index.js"]
EOF

echo "✓ Worker Dockerfile created"
echo ""

echo "Building and deploying worker..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$WORKER_JOB_NAME -f worker.Dockerfile .

gcloud run jobs create $WORKER_JOB_NAME \
    --image gcr.io/$PROJECT_ID/$WORKER_JOB_NAME \
    --region $REGION \
    --set-env-vars "DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost/bridgealis?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME" \
    --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
    --set-env-vars "GCS_BUCKET_NAME=$BUCKET_NAME" \
    --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
    --task-timeout 3600 \
    --max-retries 3 \
    --memory 2Gi \
    --cpu 1 \
    2>/dev/null || echo "Worker job already exists, updating..."

echo "✓ Worker deployed"
echo ""

# Execute worker job once to test
echo "Starting worker job (test run)..."
gcloud run jobs execute $WORKER_JOB_NAME --region $REGION
echo ""

echo "======================================"
echo "✓ Deployment Complete!"
echo "======================================"
echo ""
echo "Your app is live at: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Update Google OAuth redirect URI to: $SERVICE_URL/api/auth/callback/google"
echo "   Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Test your application by visiting: $SERVICE_URL"
echo "3. Monitor logs: gcloud run logs read --service $SERVICE_NAME --region $REGION"
echo "4. Set up Cloud Scheduler for continuous worker execution:"
echo "   gcloud scheduler jobs create http ${WORKER_JOB_NAME}-trigger \\"
echo "     --location $REGION \\"
echo "     --schedule '*/5 * * * *' \\"
echo "     --uri 'https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${WORKER_JOB_NAME}:run' \\"
echo "     --http-method POST \\"
echo "     --oauth-service-account-email ${PROJECT_ID}@appspot.gserviceaccount.com"
echo ""
echo "Cost optimization:"
echo "- Database: db-f1-micro tier (~$10/month)"
echo "- Cloud Run: Pay per use (free tier: 2M requests/month)"
echo "- Storage: $0.02/GB/month"
echo ""
