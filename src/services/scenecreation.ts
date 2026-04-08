import {
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_DISTANCE,
  DEFAULT_GRID_UNITS,
  MODULE_ID
} from "../config/constants.js";
import { calibrateSectorGrid } from "./hexgridalignment.js";
import { travellerMapService } from "./travellermap.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type { TravellerSectorSelection } from "../types/traveller.js";

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

export async function createSectorScene(sector: TravellerSectorSelection): Promise<Scene> {
  if (!game.user?.isGM) {
    throw new Error(localize("Errors.OnlyGM"));
  }

  const poster = await travellerMapService.getPosterImageInfo(sector);
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

  await scene.update({
    [`flags.${MODULE_ID}.backgroundState`]: {
      requested: poster.url,
      levelId: level.id ?? null,
      levelBackgroundSrc: levelData.background?.src ?? null,
      levelTextures: levelData.textures ?? null,
      sceneBackgroundColor: scene.toObject().backgroundColor ?? null
    }
  } as never);

  await scene.activate();
  return scene;
}
