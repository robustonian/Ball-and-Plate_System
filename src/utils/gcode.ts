/**
 * G-code and image processing utilities for Ball and Plate system
 */

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  edgeThreshold: number; // 0-255, higher = less edges
  pointReduction: number; // 0-1, higher = fewer points
  targetSize: number; // target size in meters (plate size)
}

/**
 * G-code metadata
 */
export interface GCodeMetadata {
  source: 'image' | 'file';
  name: string;
  pointCount: number;
  pathLength: number; // meters
}

/**
 * Point in 2D space
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Default image processing options
 */
export const DEFAULT_IMAGE_OPTIONS: ImageProcessingOptions = {
  edgeThreshold: 128,
  pointReduction: 0.01,
  targetSize: 0.4, // 0.4m fits within 0.5m plate
};

/**
 * Process image to extract contour path
 */
export async function processImageToPath(
  file: File,
  options: ImageProcessingOptions = DEFAULT_IMAGE_OPTIONS
): Promise<Point2D[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const points = extractContourFromImage(img, options);
          resolve(points);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract contour from image using edge detection
 */
function extractContourFromImage(img: HTMLImageElement, options: ImageProcessingOptions): Point2D[] {
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set canvas size
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw image
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale
  const gray = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Apply Sobel edge detection
  const edges = sobelEdgeDetection(gray, canvas.width, canvas.height, options.edgeThreshold);

  // Find contour points
  const contourPoints = findContourPoints(edges, canvas.width, canvas.height);

  // Reduce points using Douglas-Peucker algorithm
  const reducedPoints = douglasPeucker(
    contourPoints,
    options.pointReduction * Math.max(canvas.width, canvas.height)
  );

  // Scale and center to plate coordinates
  const scaledPoints = scaleToPlateCoordinates(reducedPoints, options.targetSize);

  return scaledPoints;
}

/**
 * Sobel edge detection
 */
function sobelEdgeDetection(
  gray: Float32Array,
  width: number,
  height: number,
  threshold: number
): Uint8Array {
  const edges = new Uint8Array(width * height);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Apply kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kIdx = (ky + 1) * 3 + (kx + 1);
          const pixel = gray[idx];
          gx += pixel * sobelX[kIdx];
          gy += pixel * sobelY[kIdx];
        }
      }

      // Compute magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = y * width + x;
      edges[idx] = magnitude > threshold ? 255 : 0;
    }
  }

  return edges;
}

/**
 * Find contour points from edge map
 */
function findContourPoints(edges: Uint8Array, width: number, height: number): Point2D[] {
  const points: Point2D[] = [];

  // Find first edge pixel
  let startX = -1;
  let startY = -1;

  for (let y = 0; y < height && startX === -1; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] === 255) {
        startX = x;
        startY = y;
        break;
      }
    }
  }

  if (startX === -1) {
    // No edges found, return empty array
    return points;
  }

  // Trace contour using Moore-Neighbor tracing
  const visited = new Set<number>();
  let x = startX;
  let y = startY;

  // Directions: N, NE, E, SE, S, SW, W, NW
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  let dir = 0; // Start direction
  const maxIterations = width * height; // Prevent infinite loop
  let iterations = 0;

  while (iterations < maxIterations) {
    const idx = y * width + x;
    if (!visited.has(idx)) {
      points.push({ x, y });
      visited.add(idx);
    }

    // Find next edge pixel
    let found = false;
    for (let i = 0; i < 8; i++) {
      const newDir = (dir + i) % 8;
      const nx = x + dx[newDir];
      const ny = y + dy[newDir];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (edges[nIdx] === 255) {
          x = nx;
          y = ny;
          dir = (newDir + 6) % 8; // Turn left for next search
          found = true;
          break;
        }
      }
    }

    if (!found || (x === startX && y === startY && points.length > 1)) {
      break; // Contour complete or stuck
    }

    iterations++;
  }

  return points;
}

/**
 * Douglas-Peucker algorithm for path simplification
 */
function douglasPeucker(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;

  // Find the point with maximum distance
  let maxDist = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  const denominator = Math.sqrt(dx * dx + dy * dy);

  return numerator / denominator;
}

/**
 * Scale points to plate coordinates (-targetSize/2 to +targetSize/2)
 */
function scaleToPlateCoordinates(
  points: Point2D[],
  targetSize: number
): Point2D[] {
  if (points.length === 0) return points;

  // Find bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = targetSize / Math.max(width, height);

  // Center and scale
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return points.map((p) => ({
    x: (p.x - centerX) * scale,
    y: -(p.y - centerY) * scale, // Flip Y axis (image Y goes down, plate Y goes up)
  }));
}

/**
 * Parse G-code file to extract path
 */
export async function parseGCodeFile(file: File): Promise<Point2D[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const points = parseGCodeText(text);
        resolve(points);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse G-code text
 */
function parseGCodeText(text: string): Point2D[] {
  const lines = text.split('\n');
  const points: Point2D[] = [];

  let currentX = 0;
  let currentY = 0;
  let absoluteMode = true; // G90 (absolute) vs G91 (relative)
  let unit = 1.0; // mm by default, 25.4 if inches

  for (const line of lines) {
    // Remove comments
    const cleanLine = line.split(';')[0].trim().toUpperCase();
    if (!cleanLine) continue;

    // Check for mode changes
    if (cleanLine.includes('G90')) {
      absoluteMode = true;
      continue;
    }
    if (cleanLine.includes('G91')) {
      absoluteMode = false;
      continue;
    }
    if (cleanLine.includes('G20')) {
      unit = 25.4; // inches to mm
      continue;
    }
    if (cleanLine.includes('G21')) {
      unit = 1.0; // mm
      continue;
    }

    // Parse G00 or G01 commands
    if (cleanLine.startsWith('G0') || cleanLine.startsWith('G1')) {
      const xMatch = cleanLine.match(/X([+-]?\d+\.?\d*)/);
      const yMatch = cleanLine.match(/Y([+-]?\d+\.?\d*)/);

      if (xMatch || yMatch) {
        const x = xMatch ? parseFloat(xMatch[1]) * unit : currentX;
        const y = yMatch ? parseFloat(yMatch[1]) * unit : currentY;

        if (absoluteMode) {
          currentX = x;
          currentY = y;
        } else {
          currentX += x;
          currentY += y;
        }

        points.push({ x: currentX, y: currentY });
      }
    }
  }

  if (points.length === 0) {
    throw new Error('No valid G-code coordinates found');
  }

  // Convert from mm to meters and scale to plate
  return scaleGCodeToPlate(points, 0.4);
}

/**
 * Scale G-code points to plate coordinates
 */
function scaleGCodeToPlate(points: Point2D[], targetSize: number): Point2D[] {
  if (points.length === 0) return points;

  // Find bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const scale = targetSize / Math.max(bboxWidth, bboxHeight) / 1000; // mm to meters

  // Center and scale
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return points.map((p) => ({
    x: (p.x - centerX) * scale,
    y: (p.y - centerY) * scale,
  }));
}

/**
 * Calculate path length
 */
export function calculatePathLength(points: Point2D[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}
