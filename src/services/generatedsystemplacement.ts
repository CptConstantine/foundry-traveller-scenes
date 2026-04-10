import {
  DEFAULT_POSTER_OPTIONS,
  DEFAULT_SYSTEM_NOTE_OPTIONS,
  MODULE_ID
} from "../config/constants.js";
import { createGeneratedSystemTile } from "./generatedsystemtile.js";
import { generateSystemJournalsAndNotes } from "./systemnotes.js";
import { localize } from "../utils/localization.js";
import type {
  CalibratedGridConfig,
  TravellerSectorSelection,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

export interface GeneratedSystemPlacementSummary {
  scene: Scene;
  createdTiles: number;
  tileId: string | null;
  touchedJournals: number;
  createdNotes: number;
}

function getCurrentScene(): Scene {
  const currentCanvas = typeof canvas === "undefined" ? null : canvas;
  const scene = currentCanvas?.scene;

  if (!scene) {
    throw new Error(localize("Errors.CurrentSceneMissing"));
  }

  return scene;
}

function createSceneGridSummary(scene: Scene): CalibratedGridConfig {
  const sceneData = scene.toObject() as Record<string, any>;
  const grid = sceneData.grid as Record<string, any> | undefined;

  return {
    gridType: Number(grid?.type ?? CONST.GRID_TYPES.GRIDLESS),
    gridSize: Math.max(50, Math.round(Number(grid?.size ?? 100))),
    gridOffsetX: Math.round(Number(grid?.x ?? 0)),
    gridOffsetY: Math.round(Number(grid?.y ?? 0)),
    sceneWidth: Math.round(Number(sceneData.width ?? 0)),
    sceneHeight: Math.round(Number(sceneData.height ?? 0)),
    backgroundOffsetX: 0,
    backgroundOffsetY: 0,
    columns: 0,
    rows: 0
  };
}

export async function placeGeneratedSystemOnCurrentScene(
  sector: TravellerSectorSelection,
  systemNoteOptions: TravellerSystemNoteOptions = DEFAULT_SYSTEM_NOTE_OPTIONS
): Promise<GeneratedSystemPlacementSummary> {
  if (!game.user?.isGM) {
    throw new Error(localize("Errors.OnlyGM"));
  }

  if (sector.source !== "generated") {
    throw new Error(localize("Errors.GeneratedContentMissing"));
  }

  const scene = getCurrentScene();
  const grid = createSceneGridSummary(scene);
  const milieu = sector.generatedContent?.metadata.milieu;
  const noteSummary = await generateSystemJournalsAndNotes(
    scene,
    sector,
    grid,
    {
      ...DEFAULT_POSTER_OPTIONS,
      milieu
    },
    systemNoteOptions
  );
  const tileSummary = await createGeneratedSystemTile(scene, sector, {
    gridSize: grid.gridSize,
    replaceExisting: false
  });

  await scene.update({
    [`flags.${MODULE_ID}.lastGeneratedSystemTile`]: {
      tileId: tileSummary.tileId,
      seed: sector.generatedContent?.seed ?? null,
      systemName: sector.generatedContent?.systems[0]?.displayName ?? null
    }
  } as never);

  return {
    scene,
    createdTiles: tileSummary.createdTiles,
    tileId: tileSummary.tileId,
    touchedJournals: noteSummary.touchedJournals,
    createdNotes: noteSummary.createdNotes
  };
}
