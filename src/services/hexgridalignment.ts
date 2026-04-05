import {
  REGION_HEX_COLUMNS,
  REGION_HEX_ROWS
} from "../config/constants.js";
import type {
  CalibratedGridConfig,
  RegionDimensions
} from "../types/traveller.js";
import { calculateFlatTopHexMetricsFromImage } from "../utils/geometry.js";

const DEFAULT_DIMENSIONS: RegionDimensions = {
  columns: REGION_HEX_COLUMNS,
  rows: REGION_HEX_ROWS
};

export function calibrateRegionGrid(
  image: { width: number; height: number },
  dimensions: RegionDimensions = DEFAULT_DIMENSIONS
): CalibratedGridConfig {
  const metrics = calculateFlatTopHexMetricsFromImage(image.width, image.height, dimensions);
  const verticalColumnOffset = Math.max(0, Math.round(image.height - metrics.hexHeight * dimensions.rows));

  return {
    gridType: CONST.GRID_TYPES.HEXEVENQ,
    gridSize: Math.round(metrics.hexHeight),
    gridOffsetX: 0,
    gridOffsetY: verticalColumnOffset,
    sceneWidth: Math.round(image.width),
    sceneHeight: Math.round(image.height),
    backgroundOffsetX: 0,
    backgroundOffsetY: 0,
    columns: dimensions.columns,
    rows: dimensions.rows
  };
}
