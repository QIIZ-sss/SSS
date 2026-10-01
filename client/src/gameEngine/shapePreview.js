// shapePreview.js: Live Ghost Draft & Real-time Dimension Indicator Logic

/**
 * Calculates bounding box dimensions and center coords for shape preview
 * @param {string} shapeType - 'circle' | 'rect' | 'triangle' | 'line'
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 */
export function calculateShapeDimensions(shapeType, x1, y1, x2, y2) {
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  if (shapeType === 'circle') {
    const radius = Math.round(Math.sqrt(width * width + height * height));
    return {
      width: radius * 2,
      height: radius * 2,
      radius,
      label: `Radius: ${radius}px (${radius * 2}x${radius * 2}px)`
    };
  } else if (shapeType === 'line') {
    const length = Math.round(Math.sqrt(width * width + height * height));
    return {
      width,
      height,
      length,
      label: `Length: ${length}px`
    };
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    label: `${Math.round(width)} × ${Math.round(height)} px`
  };
}

/**
 * Renders live ghost preview shape on canvas context
 */
export function drawGhostPreview(ctx, shapeType, x1, y1, x2, y2, color, size) {
  ctx.save();
  ctx.setLineDash([6, 6]); // Dashed ghost line
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = size;

  ctx.beginPath();
  if (shapeType === 'circle') {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
  } else if (shapeType === 'rect') {
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
  } else if (shapeType === 'triangle') {
    ctx.moveTo(x1, y2);
    ctx.lineTo((x1 + x2) / 2, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
  } else if (shapeType === 'line') {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  // Bounding box outline for Geometric Shapes
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.strokeRect(
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.abs(x2 - x1),
    Math.abs(y2 - y1)
  );

  ctx.restore();
}
