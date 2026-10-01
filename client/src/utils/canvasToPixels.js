/**
 * canvasToPixels.js
 * Converts an HTML5 Canvas drawing to a 28x28 grayscale normalized pixel array (784 floats)
 * matching the Google Quick, Draw! dataset format (0.0 = background, 1.0 = stroke).
 */

export function canvasToPixels(canvasElement) {
  let canvas = canvasElement;
  if (typeof canvas === 'string') {
    canvas = document.querySelector(canvas);
  }
  if (!canvas || !canvas.getContext) {
    canvas = document.querySelector('canvas');
  }

  if (!canvas) {
    return new Array(784).fill(0);
  }

  const width = canvas.width || 640;
  const height = canvas.height || 480;

  let ctx;
  try {
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  } catch (e) {
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    return new Array(784).fill(0);
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Scan for bounding box of drawn strokes
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let strokeCount = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Pixel is considered a stroke if it's not white and has alpha
      // Canvas background is #ffffff (255, 255, 255)
      if (a > 10 && (r < 240 || g < 240 || b < 240)) {
        strokeCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no strokes or barely a speck, return 784 zeros
  if (strokeCount < 6 || maxX < minX || maxY < minY) {
    return new Array(784).fill(0);
  }

  // 2. Center and crop bounding box into a square with padding (Quick, Draw! standard)
  const strokeW = maxX - minX + 1;
  const strokeH = maxY - minY + 1;
  const maxDim = Math.max(strokeW, strokeH);
  const padding = Math.max(maxDim * 0.18, 12);
  const squareSize = maxDim + padding * 2;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const srcX = centerX - squareSize / 2;
  const srcY = centerY - squareSize / 2;

  // 3. Draw cropped region onto offscreen 28x28 canvas
  const offscreen = document.createElement('canvas');
  offscreen.width = 28;
  offscreen.height = 28;
  const offCtx = offscreen.getContext('2d');

  // Fill white background on offscreen canvas
  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, 28, 28);

  // Downscale and center drawing to 28x28
  offCtx.drawImage(
    canvas,
    srcX, srcY, squareSize, squareSize,
    0, 0, 28, 28
  );

  // 4. Extract 28x28 pixels and invert to Quick Draw format
  // (Quick, Draw!: background = 0, stroke = 255 / 1.0)
  const d28 = offCtx.getImageData(0, 0, 28, 28).data;
  const pixels = new Array(784);

  for (let i = 0; i < 784; i++) {
    const idx = i * 4;
    const r = d28[idx];
    const g = d28[idx + 1];
    const b = d28[idx + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Invert so dark stroke becomes close to 1.0, white canvas becomes 0.0
    const val = Math.max(0, Math.min(1, (255 - gray) / 255));
    pixels[i] = Math.round(val * 1000) / 1000;
  }

  return pixels;
}

export default canvasToPixels;
