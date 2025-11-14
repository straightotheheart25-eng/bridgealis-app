import { Storage } from '@google-cloud/storage';

if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('Missing GCS_BUCKET_NAME in env');
}

const projectId = process.env.GCP_PROJECT_ID;

let storage: Storage;
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  // allow passing service account JSON as an env var (base64 or raw JSON)
  let creds = process.env.GCP_SERVICE_ACCOUNT_KEY;
  try {
    creds = Buffer.from(creds, 'base64').toString();
    const key = JSON.parse(creds);
    storage = new Storage({ projectId, credentials: key });
  } catch (err) {
    // fallback: try parse raw JSON
    try {
      const key = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY as string);
      storage = new Storage({ projectId, credentials: key });
    } catch (err2) {
      throw new Error('Invalid GCP_SERVICE_ACCOUNT_KEY: must be JSON or base64-encoded JSON');
    }
  }
} else {
  storage = new Storage({ projectId });
}

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName!);

export async function uploadBuffer(buffer: Buffer, destination: string, contentType = 'application/pdf') {
  const file = bucket.file(destination);
  await file.save(buffer, { contentType, resumable: false });
  return file.name;
}

export async function getSignedUrl(path: string, expiresSec = 3600) {
  const file = bucket.file(path);
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + expiresSec * 1000 });
  return url;
}