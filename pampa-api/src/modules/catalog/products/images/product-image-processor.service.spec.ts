import sharp from 'sharp';

import {
  ProductImageDecodeError,
  ProductImageInvalidTypeError,
} from './product-image.errors';
import { ProductImageProcessorService } from './product-image-processor.service';

async function buildPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 30 },
    },
  })
    .png()
    .toBuffer();
}

describe('ProductImageProcessorService', () => {
  const service = new ProductImageProcessorService();

  it('rejects a declared mimetype outside the JPG/PNG/WebP whitelist', async () => {
    await expect(
      service.process({
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
      }),
    ).rejects.toBeInstanceOf(ProductImageInvalidTypeError);
  });

  it('rejects bytes that are not a real decodable image, even with an allowed mimetype', async () => {
    await expect(
      service.process({
        mimetype: 'image/png',
        buffer: Buffer.from('this is not actually a png'),
      }),
    ).rejects.toBeInstanceOf(ProductImageDecodeError);
  });

  it('re-encodes a valid image to WebP', async () => {
    const png = await buildPng(20, 20);

    const result = await service.process({
      mimetype: 'image/png',
      buffer: png,
    });

    expect(result.contentType).toBe('image/webp');
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
  });

  it('caps oversized images to the max dimension instead of rejecting them', async () => {
    const oversized = await buildPng(2000, 1000);

    const result = await service.process({
      mimetype: 'image/png',
      buffer: oversized,
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });

  it('never upscales an image smaller than the cap', async () => {
    const small = await buildPng(50, 40);

    const result = await service.process({
      mimetype: 'image/png',
      buffer: small,
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(40);
  });
});
