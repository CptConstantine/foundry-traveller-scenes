import type { SectorDimensions } from "../types/traveller.js";

const HEX_HEIGHT_TO_WIDTH_RATIO = Math.sqrt(3) / 2;

export interface FlatTopHexMetrics {
  hexWidth: number;
  hexHeight: number;
  stepX: number;
  stepY: number;
}

export function calculateFlatTopHexMetricsFromGridSize(gridSize: number): FlatTopHexMetrics {
  const hexHeight = Math.max(1, gridSize);
  const hexWidth = hexHeight / HEX_HEIGHT_TO_WIDTH_RATIO;

  return {
    hexWidth,
    hexHeight,
    stepX: hexWidth * 0.75,
    stepY: hexHeight
  };
}

export function calculateFlatTopHexMetricsFromImage(
  imageWidth: number,
  imageHeight: number,
  dimensions: SectorDimensions
): FlatTopHexMetrics {
  const normalizedHexHeight = imageHeight / (dimensions.rows + 0.5);

  return calculateFlatTopHexMetricsFromGridSize(normalizedHexHeight);
}
