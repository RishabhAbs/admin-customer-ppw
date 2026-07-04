/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * One-time cleanup: remove `media` rows whose file no longer exists in S3
 * (or the local UPLOADS_PATH fallback).
 *
 * These are orphaned DB rows — e.g. an item shows 4 image slots but only 2
 * files were ever uploaded/kept in storage — causing broken image icons in
 * the customer/admin UI for the missing slots.
 *
 * Usage (from admin/backend):
 *   node scripts/cleanup-missing-media.js          # dry run, report only
 *   node scripts/cleanup-missing-media.js --apply  # actually delete orphaned rows
 *
 * Reads DB + S3 config from the same env vars the app uses (.env).
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const APPLY = process.argv.includes('--apply');

function s3KeyFor(urlName, slot) {
  return slot.startsWith('vid')
    ? `uploads/items/videos/${urlName}.webm`
    : `uploads/items/${urlName}.webp`;
}

async function existsInS3(s3, bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
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

  const [rows] = await db.query('SELECT id, masterid, slot, type, url_name FROM media');
  console.log(`Checking ${rows.length} media row(s) against storage. ${APPLY ? '' : '(dry run — pass --apply to delete)'}`);
  console.log(`Source: ${bucket ? `S3 bucket "${bucket}"` : `local "${localRoot}"`}\n`);

  const orphaned = [];
  let checked = 0;

  for (const r of rows) {
    const key = s3KeyFor(r.url_name, r.slot);
    let found = false;

    if (s3) {
      found = await existsInS3(s3, bucket, key);
    }
    if (!found) {
      const localPath = path.join(localRoot, key);
      found = fs.existsSync(localPath) && fs.statSync(localPath).isFile();
    }

    if (!found) {
      orphaned.push(r);
      console.log(`  ✗ missing: masterid=${r.masterid} slot=${r.slot} url_name=${r.url_name} (${key})`);
    }

    checked++;
    if (checked % 200 === 0) console.log(`  ...checked ${checked}/${rows.length}`);
  }

  console.log(`\n${orphaned.length} orphaned row(s) found out of ${rows.length}.`);

  if (orphaned.length && APPLY) {
    const ids = orphaned.map(r => r.id);
    await db.query('DELETE FROM media WHERE id IN (?)', [ids]);
    console.log(`Deleted ${ids.length} orphaned row(s) from media.`);
  } else if (orphaned.length) {
    console.log('Dry run only — re-run with --apply to delete these rows.');
  }

  await db.end();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
