import {
  SECTOR_HEX_COLUMNS,
  SECTOR_HEX_ROWS
} from "../config/constants.js";
import type {
  CalibratedGridConfig,
  SectorDimensions
} from "../types/traveller.js";
import { calculateFlatTopHexMetricsFromImage } from "../utils/geometry.js";

const DEFAULT_DIMENSIONS: SectorDimensions = {
  columns: SECTOR_HEX_COLUMNS,
  rows: SECTOR_HEX_ROWS
};

export function calibrateSectorGrid(
  image: { width: number; height: number },
  dimensions: SectorDimensions = DEFAULT_DIMENSIONS
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

export function getHexCenterPoint(
  gridConfig: CalibratedGridConfig,
  column: number,
  row: number
): { x: number; y: number } {
  const grid = new foundry.grid.HexagonalGrid({
    size: gridConfig.gridSize,
    columns: true,
    even: true
  });
  const center = grid.getCenterPoint({ i: row - 1, j: column - 1 });

  return {
    x: Math.round(center.x + gridConfig.gridOffsetX),
    y: Math.round(center.y + gridConfig.gridOffsetY)
  };
}
