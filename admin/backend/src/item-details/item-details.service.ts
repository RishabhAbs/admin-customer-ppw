import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { ItemDetail } from '../entities/item-detail.entity';
import { ItemMedia } from '../entities/item-media.entity';
import { StockItem } from '../entities/stock-item.entity';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { applyWatermark } from './watermark';

@Injectable()
export class ItemDetailsService {
  private readonly logger = new Logger(ItemDetailsService.name);
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private localMediaRoot: string;

  constructor(
    @InjectRepository(ItemDetail)
    private detailRepo: Repository<ItemDetail>,
    @InjectRepository(ItemMedia)
    private mediaRepo: Repository<ItemMedia>,
    @InjectRepository(StockItem)
    private stockItemRepo: Repository<StockItem>,
  ) {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.S3_BUCKET_NAME || '';
    if (!this.bucket) {
      this.logger.error(
        'S3_BUCKET_NAME is not set — uploads will fail. Set the env var on your deploy target.',
      );
    }
    this.s3 = new S3Client({ region: this.region });
    this.localMediaRoot = path.resolve(
      process.env.UPLOADS_PATH || path.join(process.cwd(), 'public'),
    );
  }

  private s3Key(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `uploads/items/videos/${urlName}.webm`
      : `uploads/items/${urlName}.webp`;
  }

  private mediaProxyPath(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `/api/media/items/videos/${urlName}.webm`
      : `/api/media/items/${urlName}.webp`;
  }

  private buildMediaUrl(
    baseUrl: string | undefined,
    urlName: string,
    slot: string,
  ): string {
    const proxyPath = this.mediaProxyPath(urlName, slot);
    // Prefer a RELATIVE path so each portal loads media from its own origin
    // (the customer portal proxies /api → backend; production is same-origin).
    // Only bake in an absolute host when BACKEND_PUBLIC_URL is explicitly set
    // (e.g. a CDN). The per-request host (baseUrl) is intentionally NOT used:
    // behind a proxy it resolves to the backend's internal host (localhost:3002),
    // which is unreachable from / cross-origin to the browser → broken images.
    void baseUrl;
    const explicit = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
    return explicit ? `${explicit}${proxyPath}` : proxyPath;
  }

  async getDetails(masterid: string, baseUrl?: string) {
    const detail = await this.detailRepo.findOne({ where: { masterid } });
    const rawMedia = await this.mediaRepo.find({
      where: { masterid },
      order: { slot: 'ASC' },
    });
    const images = rawMedia
      .filter((m) => m.type === 'image')
      .map((m) => ({
        id: m.id,
        masterid: m.masterid,
        image_slot: parseInt(m.slot.replace('img', '')) || 1,
        image_url: this.buildMediaUrl(baseUrl, m.url_name, m.slot),
      }));
    const videos = rawMedia
      .filter((m) => m.type === 'video')
      .map((m) => ({
        id: m.id,
        masterid: m.masterid,
        slot: m.slot,
        video_url: this.buildMediaUrl(baseUrl, m.url_name, m.slot),
      }));
    return { details: detail, images, videos };
  }

  async getThumbnails(
    masterids: string[],
    baseUrl?: string,
  ): Promise<Record<string, string>> {
    if (!masterids.length) return {};
    const rows = await this.mediaRepo
      .createQueryBuilder('m')
      .where('m.masterid IN (:...ids) AND m.type = :type', { ids: masterids, type: 'image' })
      .orderBy('m.slot', 'ASC')
      .getMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (!result[row.masterid]) {
        result[row.masterid] = this.buildMediaUrl(baseUrl, row.url_name, row.slot);
      }
    }
    return result;
  }

  async streamMedia(
    s3Key: string,
    res: Response,
    contentType: string,
  ): Promise<void> {
    if (this.bucket) {
      try {
        const obj = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
        );
        res.setHeader('Content-Type', obj.ContentType || contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        if (obj.ContentLength) {
          res.setHeader('Content-Length', String(obj.ContentLength));
        }
        if (obj.ETag) res.setHeader('ETag', obj.ETag);
        if (obj.Body instanceof Readable) {
          obj.Body.pipe(res);
          return;
        }
      } catch (err: any) {
        const code = err?.name || err?.Code;
        if (code !== 'NoSuchKey' && code !== 'NotFound' && code !== 'AccessDenied') {
          this.logger.warn(`S3 stream failed for ${s3Key}: ${err?.message || err}`);
        }
      }
    }

    const localPath = path.join(this.localMediaRoot, s3Key);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Content-Length', String(fs.statSync(localPath).size));
      fs.createReadStream(localPath).pipe(res);
      return;
    }

    res.status(404).send('Media not found');
  }

  private async deleteFromS3(urlName: string, slot: string): Promise<void> {
    const key = this.s3Key(urlName, slot);
    if (this.bucket) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch { /* ignore missing */ }
    } else {
      // Local storage mode — remove the file from disk if present.
      try {
        const localPath = path.join(this.localMediaRoot, key);
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch { /* ignore missing */ }
    }
  }

  async saveDetails(
    masterid: string,
    description: string,
    userId: number,
    files: { slot: string; file: Express.Multer.File }[],
    removedSlots: string[],
    name?: string,
    baseUrl?: string,
  ) {
    if (name) {
      await this.stockItemRepo.update({ masterid }, { name });
    }

    let detail = await this.detailRepo.findOne({ where: { masterid } });
    if (detail) {
      detail.description = description;
      detail.updated_by = userId;
    } else {
      detail = this.detailRepo.create({ masterid, description, updated_by: userId });
    }
    await this.detailRepo.save(detail);

    for (const slot of removedSlots) {
      await this.deleteMedia(masterid, slot);
    }

    const stockItem = await this.stockItemRepo.findOne({ where: { masterid } });
    const nameCode = stockItem?.name?.match(/^(\S+)/)?.[1];
    const code = nameCode || masterid;

    for (const { slot, file } of files) {
      const existing = await this.mediaRepo.findOne({ where: { masterid, slot } });
      if (existing) {
        await this.deleteFromS3(existing.url_name, slot);
        await this.mediaRepo.remove(existing);
      }

      const urlName = `${code}${slot}`;
      const key = this.s3Key(urlName, slot);
      const isVideo = slot.startsWith('vid');
      const contentType = isVideo ? 'video/webm' : 'image/webp';

      // Normalize the upload to a storable buffer. Never let a bad image abort
      // the whole save: fall back to the raw bytes so the file is still written.
      let body: Buffer;
      try {
        body = isVideo ? file.buffer : await applyWatermark(file.buffer);
      } catch (err: any) {
        this.logger.warn(
          `Image processing failed for ${urlName} (${err?.message}); storing raw bytes.`,
        );
        body = file.buffer;
      }

      if (this.bucket) {
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }));
      } else {
        // No S3 configured — persist to the local media root so the read path
        // (which also falls back to local) can serve it.
        const localPath = path.join(this.localMediaRoot, key);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, body);
        // Verify the write actually landed — surface storage errors instead of
        // silently saving a DB row that points at a missing file.
        if (!fs.existsSync(localPath)) {
          throw new Error(`Failed to persist media file at ${localPath}`);
        }
        this.logger.log(`Saved media ${urlName} (${body.length} bytes) -> ${localPath}`);
      }

      const type = slot.startsWith('vid') ? 'video' : 'image';
      await this.mediaRepo.save(
        this.mediaRepo.create({ masterid, slot, type, url_name: urlName, uploaded_by: userId }),
      );
    }

    return this.getDetails(masterid, baseUrl);
  }

  async deleteMedia(masterid: string, slot: string) {
    const existing = await this.mediaRepo.findOne({ where: { masterid, slot } });
    if (existing) {
      await this.deleteFromS3(existing.url_name, slot);
      await this.mediaRepo.remove(existing);
    }
    return { success: true };
  }

  async deleteImage(masterid: string, slot: number) {
    return this.deleteMedia(masterid, `img${slot}`);
  }
}
