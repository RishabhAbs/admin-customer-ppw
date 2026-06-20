/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * One-time backfill: bake the brand watermark into all EXISTING product images.
 *
 * Reads every `media` row of type 'image', pulls the stored .webp from S3
 * (or the local UPLOADS_PATH fallback), applies the same tiled watermark used
 * on new uploads, and writes it back in place.
 *
 * Safe to run repeatedly: re-watermarking an already-watermarked image just
 * adds the pattern again, so run ONCE. Missing files are skipped and reported.
 *
 * Usage (from admin/backend):
 *   node scripts/watermark-existing.js          # apply
 *   node scripts/watermark-existing.js --dry    # report only, no writes
 *
 * Reads DB + S3 config from the same env vars the app uses (.env).
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const DRY = process.argv.includes('--dry');
const TEXT = 'Purbanchal Papers & Works  9864114007';

async function applyWatermark(input) {
  const img = sharp(input, { failOn: 'none' });
  const meta = await img.metadata();
  const width = meta.width || 800;
  const height = meta.height || 800;
  const base = Math.max(160, Math.round(Math.min(width, height) / 3));
  const fontSize = Math.max(12, Math.round(base / 12));
  const escaped = TEXT.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wm" width="${base}" height="${Math.round(base * 0.6)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><text x="0" y="${Math.round(base * 0.35)}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#000000" fill-opacity="0.16">${escaped}</text></pattern></defs><rect width="100%" height="100%" fill="url(#wm)"/></svg>`;
  return img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .webp({ quality: 82 })
    .toBuffer();
}

function s3KeyForImage(urlName) {
  return `uploads/items/${urlName}.webp`;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

(async () => {
  const bucket = process.env.S3_BUCKET_NAME || '';
  const region = process.env.AWS_REGION || 'ap-south-1';
  const localRoot = path.resolve(process.env.UPLOADS_PATH || path.join(process.cwd(), 'public'));
  const s3 = bucket ? new S3Client({ region }) : null;

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await db.query(
    "SELECT id, masterid, slot, url_name FROM media WHERE type='image'",
  );
  console.log(`Found ${rows.length} image(s). ${DRY ? '(dry run)' : ''}`);
  console.log(`Source: ${bucket ? `S3 bucket "${bucket}"` : `local "${localRoot}"`}`);

  let done = 0, missing = 0, failed = 0;

  for (const r of rows) {
    const key = s3KeyForImage(r.url_name);
    const localPath = path.join(localRoot, key);
    try {
      // Load the original bytes (S3 first, then local fallback).
      let buf = null;
      if (s3) {
        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
          buf = await streamToBuffer(obj.Body);
        } catch (e) {
          if (fs.existsSync(localPath)) buf = fs.readFileSync(localPath);
        }
      } else if (fs.existsSync(localPath)) {
        buf = fs.readFileSync(localPath);
      }

      if (!buf) {
        missing++;
        console.log(`  ✗ missing file for ${r.url_name} (${key})`);
        continue;
      }

      if (DRY) { done++; console.log(`  • would watermark ${r.url_name}`); continue; }

      const out = await applyWatermark(buf);

      // Write back to the same location.
      if (s3) {
        await s3.send(new PutObjectCommand({
          Bucket: bucket, Key: key, Body: out, ContentType: 'image/webp',
        }));
      } else {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, out);
      }
      done++;
      console.log(`  ✓ watermarked ${r.url_name}`);
    } catch (e) {
      failed++;
      console.log(`  ! error on ${r.url_name}: ${e.message}`);
    }
  }

  await db.end();
  console.log(`\nDone. watermarked=${done} missing=${missing} failed=${failed}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
