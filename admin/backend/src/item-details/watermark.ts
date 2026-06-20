import sharp from 'sharp';

/** The fixed brand watermark text tiled across product images. */
export const WATERMARK_TEXT = 'Purbanchal Papers & Works  9864114007';

/**
 * Normalize an uploaded image to a WebP buffer.
 *
 * The brand watermark has been disabled per request — images are stored as-is
 * (just re-encoded to WebP for consistent serving). The function name and
 * signature are kept so callers in the service don't need to change; re-enable
 * watermarking here if it's ever wanted again.
 */
export async function applyWatermark(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: 'none' }).webp({ quality: 82 }).toBuffer();
}
