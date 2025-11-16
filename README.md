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