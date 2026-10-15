import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { base64ByteSize } from './fileExport';

const SCALES = [1, 0.8, 0.65, 0.5, 0.4, 0.3, 0.2];
const MIN_QUALITY = 0.05;
const MAX_QUALITY = 0.92;
const QUALITY_STEPS = 6;

const render = async (uri, actions, compress) => {
  const result = await manipulateAsync(uri, actions, {
    compress,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return { ...result, bytes: base64ByteSize(result.base64) };
};

// Center-crop to a target aspect ratio, then scale to exact pixel size.
const fitActions = (srcW, srcH, outW, outH) => {
  const srcRatio = srcW / srcH;
  const outRatio = outW / outH;
  const actions = [];
  if (Math.abs(srcRatio - outRatio) > 0.01) {
    let cropW = srcW;
    let cropH = srcH;
    if (srcRatio > outRatio) cropW = Math.round(srcH * outRatio);
    else cropH = Math.round(srcW / outRatio);
    actions.push({
      crop: {
        originX: Math.round((srcW - cropW) / 2),
        originY: Math.round((srcH - cropH) / 2),
        width: cropW,
        height: cropH,
      },
    });
  }
  actions.push({ resize: { width: outW, height: outH } });
  return actions;
};

/**
 * Produce a JPEG no larger than targetBytes. Binary-searches JPEG quality at
 * each scale and only shrinks pixel dimensions when quality alone cannot reach
 * the target. If `dimensions` is given, output is cropped/scaled to exactly
 * that size first and only quality is lowered.
 *
 * Returns { uri, width, height, bytes, reachedTarget }.
 */
export const compressToTarget = async (uri, targetBytes, dimensions) => {
  const probe = await manipulateAsync(uri, [], { format: SaveFormat.JPEG, compress: 1 });
  const baseActions = dimensions
    ? fitActions(probe.width, probe.height, dimensions.width, dimensions.height)
    : [];
  const baseW = dimensions ? dimensions.width : probe.width;

  const scales = dimensions ? [1] : SCALES;
  let best = null;

  for (const scale of scales) {
    const actions =
      scale === 1
        ? baseActions
        : [...baseActions, { resize: { width: Math.max(1, Math.round(baseW * scale)) } }];

    // Cheapest attempt first: if max quality already fits, we are done.
    let attempt = await render(uri, actions, MAX_QUALITY);
    if (attempt.bytes <= targetBytes) return { ...attempt, reachedTarget: true };

    let low = MIN_QUALITY;
    let high = MAX_QUALITY;
    let fit = null;
    let smallest = attempt;
    for (let i = 0; i < QUALITY_STEPS; i += 1) {
      const mid = (low + high) / 2;
      attempt = await render(uri, actions, mid);
      if (attempt.bytes < smallest.bytes) smallest = attempt;
      if (attempt.bytes <= targetBytes) {
        fit = attempt;
        low = mid;
      } else {
        high = mid;
      }
    }
    if (fit) return { ...fit, reachedTarget: true };
    best = smallest;
  }

  return { ...best, reachedTarget: false };
};
