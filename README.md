# Bridgealis App

A job marketplace platform focused on returning citizens, youth, and older workers. Features include a gated resume generator that creates downloadable PDFs after candidates apply to multiple jobs.

## Getting Started

Follow these steps to run the Bridgealis app locally for development and testing.

### Prerequisites

* Node.js (v16 or higher)
* npm or yarn
* PostgreSQL database
* Google Cloud Platform account (for resume storage)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/straightotheheart25-eng/bridgealis-app.git
   cd bridgealis-app
   ```

2. Copy `.env.example` to `.env.local` and configure environment variables:
   ```sh
   cp .env.example .env.local
   ```

3. Set required environment variables in `.env.local`:
   ```sh
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/bridgealis"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # Google Cloud Storage (for resume uploads)
   GCP_PROJECT_ID="your-gcp-project-id"
   GCS_BUCKET_NAME="bridgealis-resumes"
   GCP_SERVICE_ACCOUNT_KEY="base64-encoded-json-or-raw-json"
   
   # Google OAuth (optional for testing)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. Install dependencies:
   ```sh
   npm install
   ```

5. Run database migrations:
   ```sh
   npx prisma migrate dev --name init
   ```

6. (Optional) Seed test data:
   ```sh
   npm run seed
   ```
   
   This creates test data including:
   - Employer account: `employer@example.com`
   - Candidate account: `candidate@example.com`
   - Sample company "Acme Co" with two jobs
   - Two job applications for the candidate

### Running the Application

1. Start the web application:
   ```sh
   npm run dev
   ```
   The app will be available at http://localhost:3000

2. In a separate terminal, start the resume worker:
   ```sh
   npm run worker:start
   ```
   The worker polls for queued resume generation jobs and processes them using Puppeteer.

### Testing Resume Generation

1. Sign in as `candidate@example.com` (or use Google authentication)
2. Navigate to the home page
3. Click "Generate resume (PDF)"
4. The worker will process the job and generate a PDF resume
5. Once complete, a download link will appear
6. Click the download link to get a signed URL to the resume stored in Google Cloud Storage

### Worker Notes

The resume worker (`worker/index.js`) runs as a separate process and:
- Polls the database for queued resume jobs every 3 seconds
- Generates PDF resumes using Puppeteer
- Uploads resumes to Google Cloud Storage
- Updates the Resume and ResumeJob records in the database
- Marks jobs as FAILED on errors

The worker requires the same database and GCS credentials as the main app.

### Scripts

* `npm run dev` - Start Next.js development server
* `npm run build` - Build the application for production
* `npm start` - Start production server
* `npm run lint` - Run ESLint
* `npm run seed` - Populate database with test data
* `npm run worker:start` - Start the resume generation worker

### Architecture

* **Frontend**: Next.js with React
* **Backend**: Next.js API Routes
* **Database**: PostgreSQL with Prisma ORM
* **Authentication**: NextAuth.js with Google OAuth
* **Storage**: Google Cloud Storage
* **PDF Generation**: Puppeteer (headless Chrome)

### Contributing

Please read [CONTRIBUTING.md](https://example.com) for details on our code of conduct and the process for submitting pull requests.

### License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.