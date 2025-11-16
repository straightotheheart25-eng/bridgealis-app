# Bridgealis App

A Next.js-based employment and apprenticeship platform connecting job seekers with second-chance-friendly employers. Features include job applications, automated resume generation using Puppeteer, and Google Cloud Storage integration.

## Features

- **Job Marketplace**: Browse and apply for entry-level and second-chance-friendly positions
- **Resume Generation**: Automated PDF resume generation after applying to 2+ jobs
- **Worker Queue**: Background job processing for resume generation using Puppeteer
- **Authentication**: Google OAuth integration via NextAuth
- **Cloud Storage**: Resume storage and signed URL generation using Google Cloud Storage

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database
- Google Cloud Platform account (for Cloud Storage)
- Google OAuth credentials (for authentication)

## Local Development Setup

### 1. Clone the Repository

```sh
git clone https://github.com/straightotheheart25-eng/bridgealis-app.git
cd bridgealis-app
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and configure it:

```sh
cp .env.example .env.local
```

Edit `.env.local` and set the following required variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bridgealis"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Cloud Storage
GCP_PROJECT_ID="your-gcp-project-id"
GCS_BUCKET_NAME="bridgealis-resumes"
GCP_SERVICE_ACCOUNT_KEY=""  # base64-encoded JSON or raw JSON string

# Optional
NEXT_PUBLIC_BASELINE_POST_PRICE=100
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

### 4. Set Up Database

Run Prisma migrations to create the database schema:

```sh
npx prisma migrate dev --name init
```

### 5. Seed Test Data (Optional)

To populate the database with test data (employer, company, jobs, and a test candidate):

```sh
npm run seed
```

This creates:
- An employer user (`employer@example.com`)
- A company ("Acme Co")
- Two job postings
- A candidate user (`candidate@example.com`) with profile
- Two job applications (meets the resume generation requirement)

### 6. Start the Development Server

```sh
npm run dev
```

The app will be available at http://localhost:3000

### 7. Start the Resume Worker (Required for Resume Generation)

In a **separate terminal**, start the background worker that processes resume generation jobs:

```sh
npm run worker:start
```

The worker polls the database for queued resume jobs and generates PDFs using Puppeteer.

## Resume Generation Flow

The resume generation system uses a queue-based architecture:

1. **User Applies to Jobs**: Candidates must apply to at least 2 jobs before they can generate a resume
2. **Resume Request**: User clicks "Generate Resume" button on the index page
3. **Job Queued**: API creates a placeholder `Resume` record (status: PENDING) and a `ResumeJob` (status: QUEUED)
4. **Worker Processing**: 
   - Worker polls for QUEUED jobs every 3 seconds
   - Updates job status to PROCESSING
   - Fetches user data, profile, and recent applications
   - Renders HTML template with user information
   - Uses Puppeteer to convert HTML to PDF
   - Uploads PDF to Google Cloud Storage
   - Updates Resume record with URL, generatedAt, expiresAt, status=READY
   - Marks ResumeJob as DONE with resumeId
5. **Download**: User can download the resume via `/api/resume/download/[id]` which returns a signed GCS URL

### Worker Notes

- The worker runs continuously and processes jobs sequentially
- Failed jobs are marked with status=FAILED
- Resumes expire after 7 days (configurable in worker code)
- Puppeteer runs in headless mode with `--no-sandbox` and `--disable-setuid-sandbox` flags
- For production, consider deploying the worker as a separate service with proper error handling and monitoring

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed the database with test data
- `npm run worker:start` - Start the resume generation worker

## Testing the Resume Flow

1. Start both the web app (`npm run dev`) and worker (`npm run worker:start`)
2. Sign in using Google OAuth or use test session for `candidate@example.com`
3. Navigate to the index page
4. Click "Generate Resume" button
5. Check worker terminal logs - you should see job processing messages
6. Once complete, the resume download link will be available
7. Click download to get a signed URL to the generated PDF

## Deploying to Google Cloud Platform

This guide walks you through deploying the Bridgealis app to Google Cloud Platform (GCP) as simply as possible.

### Prerequisites

- Google Cloud account with billing enabled
- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed
- A GCP project created

### Step 1: Set Up Google Cloud Services

```sh
# Login to Google Cloud
gcloud auth login

# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
```

### Step 2: Create PostgreSQL Database

```sh
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create bridgealis-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Set a password for the postgres user
gcloud sql users set-password postgres \
  --instance=bridgealis-db \
  --password=YOUR_SECURE_PASSWORD

# Create the database
gcloud sql databases create bridgealis --instance=bridgealis-db
```

### Step 3: Create Google Cloud Storage Bucket

```sh
# Create a bucket for resume PDFs
gsutil mb -l us-central1 gs://bridgealis-resumes-$PROJECT_ID

# Make bucket private (files accessed via signed URLs)
gsutil iam ch allUsers:objectViewer gs://bridgealis-resumes-$PROJECT_ID
```

### Step 4: Set Up Google OAuth Credentials

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Select **Web application**
4. Add authorized redirect URI: `https://YOUR_APP_URL/api/auth/callback/google`
5. Save the **Client ID** and **Client Secret**

### Step 5: Deploy the Web App to Cloud Run

```sh
# Build and deploy the Next.js app
gcloud run deploy bridgealis-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXTAUTH_URL=https://bridgealis-app-XXXXX.run.app" \
  --set-env-vars "NEXTAUTH_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@/bridgealis?host=/cloudsql/$PROJECT_ID:us-central1:bridgealis-db" \
  --set-env-vars "GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET" \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars "GCS_BUCKET_NAME=bridgealis-resumes-$PROJECT_ID" \
  --add-cloudsql-instances $PROJECT_ID:us-central1:bridgealis-db
```

**Note**: After deployment, update the OAuth redirect URI with the actual Cloud Run URL.

### Step 6: Run Database Migrations

```sh
# Connect to Cloud SQL and run migrations
gcloud sql connect bridgealis-db --user=postgres

# In another terminal, use Cloud SQL Proxy
cloud_sql_proxy -instances=$PROJECT_ID:us-central1:bridgealis-db=tcp:5432

# Set DATABASE_URL and run migrations
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/bridgealis"
npx prisma migrate deploy

# Optional: Seed the database
npm run seed
```

### Step 7: Deploy the Worker to Cloud Run Jobs

Create a `worker.Dockerfile`:

```dockerfile
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
COPY worker/package*.json ./
RUN npm ci --only=production
COPY worker/ ./
COPY lib/ ../lib/
COPY prisma/ ../prisma/

CMD ["node", "index.js"]
```

Deploy the worker:

```sh
# Build and push Docker image
gcloud builds submit --tag gcr.io/$PROJECT_ID/bridgealis-worker ./worker

# Create and run the worker job
gcloud run jobs create bridgealis-worker \
  --image gcr.io/$PROJECT_ID/bridgealis-worker \
  --region us-central1 \
  --set-env-vars "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@/bridgealis?host=/cloudsql/$PROJECT_ID:us-central1:bridgealis-db" \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars "GCS_BUCKET_NAME=bridgealis-resumes-$PROJECT_ID" \
  --add-cloudsql-instances $PROJECT_ID:us-central1:bridgealis-db \
  --task-timeout 3600 \
  --max-retries 3

# Execute the job (for continuous running, use Cloud Scheduler)
gcloud run jobs execute bridgealis-worker --region us-central1
```

### Step 8: Set Up Cloud Scheduler (Optional - for continuous worker)

```sh
# Create a Cloud Scheduler job to run the worker every 5 minutes
gcloud scheduler jobs create http bridgealis-worker-trigger \
  --location us-central1 \
  --schedule "*/5 * * * *" \
  --uri "https://YOUR_CLOUD_RUN_JOB_URL" \
  --http-method POST
```

### Simplified Alternative: Use App Engine

For an even simpler deployment without Docker:

```sh
# Create app.yaml
cat > app.yaml << EOF
runtime: nodejs18
env: standard
instance_class: F2

env_variables:
  NEXTAUTH_URL: "https://$PROJECT_ID.appspot.com"
  NEXTAUTH_SECRET: "$(openssl rand -base64 32)"
  DATABASE_URL: "postgresql://postgres:YOUR_PASSWORD@/bridgealis?host=/cloudsql/$PROJECT_ID:us-central1:bridgealis-db"
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID"
  GOOGLE_CLIENT_SECRET: "YOUR_GOOGLE_CLIENT_SECRET"
  GCP_PROJECT_ID: "$PROJECT_ID"
  GCS_BUCKET_NAME: "bridgealis-resumes-$PROJECT_ID"

beta_settings:
  cloud_sql_instances: "$PROJECT_ID:us-central1:bridgealis-db"
EOF

# Deploy to App Engine
gcloud app deploy
```

### Post-Deployment Steps

1. **Update OAuth redirect URIs** in Google Cloud Console with your actual deployment URL
2. **Run database migrations** using Cloud SQL Proxy
3. **Test the application** by visiting your Cloud Run or App Engine URL
4. **Monitor logs**: `gcloud run logs read --service bridgealis-app`
5. **Set up monitoring** in Google Cloud Console for performance tracking

### Cost Optimization Tips

- Use Cloud SQL `db-f1-micro` or `db-g1-small` for development
- Enable Cloud Run autoscaling (min instances = 0)
- Set Cloud Storage lifecycle policies to delete old resumes
- Use Cloud Scheduler to run worker only during business hours

## Architecture

- **Frontend**: Next.js with React
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth with Google provider and Prisma adapter
- **Storage**: Google Cloud Storage for resume PDFs
- **Queue**: Database-backed job queue (ResumeJob model)
- **Worker**: Node.js process with Puppeteer for PDF generation

## Project Structure

```
bridgealis-app/
├── components/         # React components
├── lib/               # Utility modules (prisma, gcs, supabase)
├── pages/             # Next.js pages and API routes
│   ├── api/          # API endpoints
│   │   ├── auth/     # NextAuth configuration
│   │   └── resume/   # Resume generation endpoints
│   ├── index.tsx     # Home page
│   └── pricing.tsx   # Pricing page
├── prisma/            # Prisma schema and migrations
├── scripts/           # Utility scripts (seed.js)
├── worker/            # Resume generation worker
│   ├── index.js      # Worker main file
│   └── package.json  # Worker dependencies
└── .env.example       # Environment variables template
```

## Troubleshooting

### Worker Issues

- **Puppeteer fails to launch**: Ensure you have required system dependencies. On Linux: `sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0`
- **GCS upload fails**: Verify GCP_SERVICE_ACCOUNT_KEY is properly formatted and has Storage Object Creator permissions
- **Worker not processing jobs**: Check DATABASE_URL is accessible from worker context

### Database Issues

- **Migration fails**: Ensure PostgreSQL is running and DATABASE_URL is correct
- **Connection errors**: Check firewall settings and database credentials

## Next Steps / Future Enhancements

- Add CI/CD pipeline
- Implement automated tests
- Add monitoring and alerting
- Configure GCS bucket lifecycle policies
- Optimize Puppeteer Docker image for production
- Add retry logic for failed resume jobs
- Implement rate limiting
- Add email notifications when resume is ready

## Contributing

Please read [CONTRIBUTING.md](https://example.com) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.