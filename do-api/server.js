const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = Number(process.env.PORT || 8080);
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '');

const SPACES_KEY = String(process.env.SPACES_KEY || '');
const SPACES_SECRET = String(process.env.SPACES_SECRET || '');
const SPACES_BUCKET = String(process.env.SPACES_BUCKET || '');
const SPACES_REGION = String(process.env.SPACES_REGION || 'nyc3');
const SPACES_ENDPOINT = String(process.env.SPACES_ENDPOINT || `https://${SPACES_REGION}.digitaloceanspaces.com`);

const STATE_OBJECT_KEY = String(process.env.STATE_OBJECT_KEY || 'state/main.json');
const MEDIA_PREFIX = String(process.env.MEDIA_PREFIX || 'media/');
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

if (!SPACES_KEY || !SPACES_SECRET || !SPACES_BUCKET) {
  console.warn('[DAM API] Missing Spaces env vars. Configure SPACES_KEY, SPACES_SECRET, SPACES_BUCKET.');
}

const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET
  }
});

function jsonError(res, status, message) {
  return res.status(status).json({ ok: false, message });
}

function cleanMediaKey(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.{2,}/g, '')
    .replace(/[^a-zA-Z0-9._\-/]/g, '_');
}

function getMediaObjectKey(mediaKey) {
  const safe = cleanMediaKey(mediaKey);
  return `${MEDIA_PREFIX}${safe}`;
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return false;
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token && token === ADMIN_TOKEN;
}

function authRequired(req, res, next) {
  if (!isAuthorized(req)) {
    return jsonError(res, 401, 'Unauthorized');
  }
  next();
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'dam-do-api' });
});

app.get('/dam/state', async (_req, res) => {
  try {
    const cmd = new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: STATE_OBJECT_KEY
    });
    const response = await s3.send(cmd);
    const text = await streamToString(response.Body);
    const parsed = text ? JSON.parse(text) : { version: 1, kv: {}, media: {}, updatedAt: '' };
    return res.json(parsed);
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode || 500;
    if (status === 404 || error?.name === 'NoSuchKey') {
      return res.json({ version: 1, kv: {}, media: {}, updatedAt: '' });
    }
    console.error('[DAM API] /dam/state GET error', error);
    return jsonError(res, 500, 'Failed to read state');
  }
});

app.put('/dam/state', authRequired, async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : null;
    if (!payload) return jsonError(res, 400, 'Invalid JSON payload');

    const body = JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }, null, 2);

    const cmd = new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: STATE_OBJECT_KEY,
      Body: body,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'no-store'
    });

    await s3.send(cmd);
    return res.json({ ok: true });
  } catch (error) {
    console.error('[DAM API] /dam/state PUT error', error);
    return jsonError(res, 500, 'Failed to write state');
  }
});

app.get('/dam/media-list', authRequired, async (_req, res) => {
  try {
    const cmd = new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: MEDIA_PREFIX
    });
    const output = await s3.send(cmd);
    const items = (output.Contents || []).map((obj) => {
      const fullKey = String(obj.Key || '');
      const key = fullKey.startsWith(MEDIA_PREFIX) ? fullKey.slice(MEDIA_PREFIX.length) : fullKey;
      return {
        key,
        path: fullKey,
        size: Number(obj.Size || 0),
        updatedAt: obj.LastModified ? new Date(obj.LastModified).toISOString() : ''
      };
    });
    return res.json({ ok: true, items });
  } catch (error) {
    console.error('[DAM API] /dam/media-list error', error);
    return jsonError(res, 500, 'Failed to list media');
  }
});

app.put('/dam/media/:key', authRequired, upload.single('file'), async (req, res) => {
  try {
    const mediaKey = cleanMediaKey(req.params.key);
    if (!mediaKey) return jsonError(res, 400, 'Invalid media key');

    const objectKey = getMediaObjectKey(mediaKey);

    const bodyBuffer = req.file?.buffer || (Buffer.isBuffer(req.body) ? req.body : null);
    if (!bodyBuffer) {
      return jsonError(res, 400, 'No file body. Use multipart/form-data with field "file".');
    }

    const contentType = req.file?.mimetype || req.headers['content-type'] || 'application/octet-stream';

    const cmd = new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: objectKey,
      Body: bodyBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    });

    await s3.send(cmd);

    const head = await s3.send(new HeadObjectCommand({ Bucket: SPACES_BUCKET, Key: objectKey }));

    return res.json({
      ok: true,
      key: mediaKey,
      path: objectKey,
      size: Number(head.ContentLength || bodyBuffer.length || 0),
      contentType: String(head.ContentType || contentType),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DAM API] /dam/media PUT error', error);
    return jsonError(res, 500, 'Failed to upload media');
  }
});

app.delete('/dam/media/:key', authRequired, async (req, res) => {
  try {
    const mediaKey = cleanMediaKey(req.params.key);
    if (!mediaKey) return jsonError(res, 400, 'Invalid media key');

    const cmd = new DeleteObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: getMediaObjectKey(mediaKey)
    });

    await s3.send(cmd);
    return res.json({ ok: true, key: mediaKey });
  } catch (error) {
    console.error('[DAM API] /dam/media DELETE error', error);
    return jsonError(res, 500, 'Failed to delete media');
  }
});

app.listen(PORT, () => {
  console.log(`[DAM API] listening on :${PORT}`);
});
