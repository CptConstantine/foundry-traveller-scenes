import type { SectorDimensions } from "../types/traveller.js";

const HEX_HEIGHT_TO_WIDTH_RATIO = Math.sqrt(3) / 2;

export interface FlatTopHexMetrics {
  hexWidth: number;
  hexHeight: number;
  stepX: number;
  stepY: number;
}

export function calculateFlatTopHexMetricsFromImage(
  imageWidth: number,
  imageHeight: number,
  dimensions: SectorDimensions
): FlatTopHexMetrics {
  const normalizedHexHeight = imageHeight / (dimensions.rows + 0.5);
  const normalizedHexWidth = normalizedHexHeight / HEX_HEIGHT_TO_WIDTH_RATIO;

  return {
    hexWidth: normalizedHexWidth,
    hexHeight: normalizedHexHeight,
    stepX: normalizedHexWidth * 0.75,
    stepY: normalizedHexHeight
  };
}
