import { ValidationError } from '../utils/api-response';

export interface VisionRule {
  labels: string[];
  output: string;
}

export interface ParsedImageDataUrl {
  contentType: string;
  extension: string;
  base64Payload: string;
  imageBuffer: Buffer;
}

export function parseImageDataUrl(imageDataUrl: string): ParsedImageDataUrl {
  const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([\s\S]+)$/i);

  if (!match) {
    throw new ValidationError('Image payload must be a valid image data URL.');
  }

  const [, contentType, base64Payload] = match;
  const normalizedContentType =
    contentType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : contentType.toLowerCase();
  const normalizedBase64 = base64Payload.replace(/\s/g, '');
  const extension =
    normalizedContentType === 'image/png'
      ? 'png'
      : normalizedContentType === 'image/webp'
        ? 'webp'
        : 'jpg';

  return {
    contentType: normalizedContentType,
    extension,
    base64Payload: normalizedBase64,
    imageBuffer: Buffer.from(normalizedBase64, 'base64'),
  };
}

export interface VisionTag {
  name: string;
  prob: number;
}

export function normalizeAndSortVisionTags(
  tags: Array<Partial<VisionTag>>,
  minProbability = 0.3,
) {
  return [...tags]
    .filter((tag): tag is VisionTag => typeof tag.name === 'string' && typeof tag.prob === 'number')
    .filter((tag) => tag.prob >= minProbability)
    .map((tag) => ({
      name: tag.name.trim(),
      prob: tag.prob,
    }))
    .sort((left, right) => right.prob - left.prob);
}

export function pickOutputsFromRules(tags: VisionTag[], rules: VisionRule[]) {
  const tagNames = new Set(tags.map((tag) => tag.name.toLowerCase()));
  return Array.from(
    new Set(
      rules
        .filter((rule) => rule.labels.some((label) => tagNames.has(label)))
        .map((rule) => rule.output),
    ),
  );
}

export function getTopTagNames(tags: VisionTag[], limit = 6) {
  return tags.slice(0, limit).map((tag) => tag.name);
}
