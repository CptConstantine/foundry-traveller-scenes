import {
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_DISTANCE,
  DEFAULT_GRID_UNITS,
  DEFAULT_SYSTEM_NOTE_OPTIONS,
  MODULE_ID
} from "../config/constants.js";
import { calibrateSectorGrid } from "./hexgridalignment.js";
import { generateSystemJournalsAndNotes } from "./systemnotes.js";
import { travellerMapService } from "./travellermap.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  TravellerPosterOptions,
  TravellerSectorSelection,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

function createLevelBackgroundData(src: string) {
  return {
    src,
    tint: "#ffffff",
    alphaThreshold: 0,
    color: 0x000000
  } as const;
}

async function configureSceneLevel(
  scene: Scene,
  sector: TravellerSectorSelection,
  posterUrl: string
) {
  const sceneWithLevels = scene as any;
  const background = createLevelBackgroundData(posterUrl);
  const existingLevel = sceneWithLevels.initialLevel ?? sceneWithLevels.firstLevel;

  if (existingLevel) {
    await existingLevel.update({
      name: formatLocalize("Scene.Name", { name: sector.name }),
      background
    } as never);

    return existingLevel;
  }

  const [createdLevel] = (await sceneWithLevels.createEmbeddedDocuments("Level", [
    {
      name: formatLocalize("Scene.Name", { name: sector.name }),
      sort: 0,
      background
    }
  ])) as any[];

  if (!createdLevel) {
    throw new Error(localize("Errors.SceneLevelMissing"));
  }

  return createdLevel;
}

export async function createSectorScene(
  sector: TravellerSectorSelection,
  posterOptions: Partial<TravellerPosterOptions> = {},
  systemNoteOptions: TravellerSystemNoteOptions = DEFAULT_SYSTEM_NOTE_OPTIONS
): Promise<Scene> {
  if (!game.user?.isGM) {
    throw new Error(localize("Errors.OnlyGM"));
  }

  const poster = await travellerMapService.getPosterImageInfo(sector, posterOptions);
  const grid = calibrateSectorGrid(poster, sector.dimensions);

  const sceneData = {
    name: formatLocalize("Scene.Name", { name: sector.name }),
    navName: sector.name,
    width: grid.sceneWidth,
    height: grid.sceneHeight,
    padding: 0,
    backgroundColor: "#000000",
    tokenVision: false,
    fogExploration: false,
    grid: {
      type: grid.gridType,
      size: grid.gridSize,
      distance: DEFAULT_GRID_DISTANCE,
      units: DEFAULT_GRID_UNITS,
      color: DEFAULT_GRID_COLOR,
      alpha: 0.4,
      thickness: 1,
      x: grid.gridOffsetX,
      y: grid.gridOffsetY
    },
    flags: {
      [MODULE_ID]: {
        sector,
        posterOptions: poster.posterOptions,
        alignment: grid,
        background: {
          src: poster.url,
          storedPath: poster.url
        }
      }
    }
  } as const;

  const scene = (await Scene.create(sceneData as never)) as Scene | null;
  if (!scene) {
    throw new Error(localize("Errors.SceneCreateMissing"));
  }

  const level = await configureSceneLevel(
    scene,
    sector,
    poster.url
  );

  const levelData = level.toObject();

  const notesSummary = await generateSystemJournalsAndNotes(
    scene,
    sector,
    grid,
    poster.posterOptions,
    systemNoteOptions
  );

  await scene.update({
    [`flags.${MODULE_ID}.backgroundState`]: {
      requested: poster.url,
      levelId: level.id ?? null,
      levelBackgroundSrc: levelData.background?.src ?? null,
      levelTextures: levelData.textures ?? null,
      sceneBackgroundColor: scene.toObject().backgroundColor ?? null
    },
    [`flags.${MODULE_ID}.systemNotes`]: {
      enabled: systemNoteOptions.generateSystemNotes,
      detailLevel: systemNoteOptions.detailLevel,
      createdNotes: notesSummary.createdNotes,
      touchedJournals: notesSummary.touchedJournals
    }
  } as never);

  await scene.activate();
  return scene;
}
