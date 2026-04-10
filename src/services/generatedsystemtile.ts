import {
  DEFAULT_POSTER_OPTIONS,
  GENERATED_SYSTEM_TILE_RENDER_SCALE,
  GENERATED_SYSTEM_TILE_SIZE_RATIO,
  MODULE_ID,
  SYSTEM_TILE_STORAGE_PATH
} from "../config/constants.js";
import { travellerMapService } from "./travellermap.js";
import { calculateFlatTopHexMetricsFromGridSize } from "../utils/geometry.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  TravellerSectorSelection,
  TravellerSectorSystem
} from "../types/traveller.js";

export interface GeneratedSystemTileSummary {
  createdTiles: number;
  tileId: string | null;
}

export interface GeneratedSystemTileOptions {
  centerX?: number;
  centerY?: number;
  gridSize?: number;
  replaceExisting?: boolean;
}

interface CachedGeneratedSystemTileImage {
  textureSrc: string;
  width: number;
  height: number;
}

interface ProcessedGeneratedSystemTileImage {
  blob: Blob;
  width: number;
  height: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getImageFileExtension(contentType: string): string {
  if (contentType.includes("jpeg")) {
    return "jpg";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "png";
}

async function loadImageElementFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error(localize("Errors.JumpMapLoadFailed")));
      };
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getOpaqueImageBounds(image: CanvasImageSource, width: number, height: number): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = width;
  canvasElement.height = height;

  const context = canvasElement.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      left: 0,
      top: 0,
      width,
      height
    };
  }

  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = imageData[((y * width) + x) * 4 + 3] ?? 0;
      if (alpha <= 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      left: 0,
      top: 0,
      width,
      height
    };
  }

  const padding = 1;
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);

  return {
    left,
    top,
    width: Math.max(1, (right - left) + 1),
    height: Math.max(1, (bottom - top) + 1)
  };
}

async function cropGeneratedSystemTileImage(blob: Blob): Promise<ProcessedGeneratedSystemTileImage> {
  const image = await loadImageElementFromBlob(blob);
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  const bounds = getOpaqueImageBounds(image, width, height);

  if (bounds.left === 0 && bounds.top === 0 && bounds.width === width && bounds.height === height) {
    return {
      blob,
      width,
      height
    };
  }

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = bounds.width;
  croppedCanvas.height = bounds.height;

  const croppedContext = croppedCanvas.getContext("2d");
  if (!croppedContext) {
    return {
      blob,
      width,
      height
    };
  }

  croppedContext.drawImage(
    image,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );

  const croppedBlob = await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error(localize("Errors.JumpMapLoadFailed")));
          return;
        }

        resolve(value);
      },
      blob.type || "image/png"
    );
  });

  return {
    blob: croppedBlob,
    width: bounds.width,
    height: bounds.height
  };
}

async function ensureStorageDirectory(
  filePicker: typeof foundry.applications.apps.FilePicker.implementation
): Promise<void> {
  const parts = SYSTEM_TILE_STORAGE_PATH.split("/").filter(Boolean);
  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    try {
      await filePicker.createDirectory("data", currentPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|eexist/i.test(message)) {
        continue;
      }

      throw new Error(formatLocalize("Errors.SystemTileDirectoryCreateFailed", { message }));
    }
  }
}

async function cacheGeneratedSystemTileImage(
  sector: TravellerSectorSelection,
  system: TravellerSectorSystem,
  tileRenderScale: number
): Promise<CachedGeneratedSystemTileImage> {
  const filePicker = foundry.applications.apps.FilePicker.implementation;
  const seed = sector.generatedContent?.seed ?? "generated";
  const jumpMapBlob = await travellerMapService.fetchGeneratedJumpMapBlob(sector, system, {
    ...DEFAULT_POSTER_OPTIONS,
    scale: tileRenderScale
  });
  const processedImage = await cropGeneratedSystemTileImage(jumpMapBlob);
  const extension = getImageFileExtension(processedImage.blob.type || jumpMapBlob.type);
  const fileName = `${slugify(`${system.displayName}-${seed}`) || "generated-system"}.${extension}`;
  const file = new File([processedImage.blob], fileName, {
    type: processedImage.blob.type || jumpMapBlob.type || `image/${extension}`
  });

  await ensureStorageDirectory(filePicker);

  const upload = await filePicker.upload(
    "data",
    SYSTEM_TILE_STORAGE_PATH,
    file,
    {},
    { notify: false }
  );

  if (!upload || typeof upload !== "object" || !("path" in upload) || !upload.path) {
    throw new Error(localize("Errors.SystemTileStoreFailed"));
  }

  return {
    textureSrc: String(upload.path).replace(/\\/g, "/"),
    width: processedImage.width,
    height: processedImage.height
  };
}

export async function createGeneratedSystemTile(
  scene: Scene,
  sector: TravellerSectorSelection,
  options: GeneratedSystemTileOptions = {}
): Promise<GeneratedSystemTileSummary> {
  if (sector.source !== "generated") {
    return {
      createdTiles: 0,
      tileId: null
    };
  }

  const system = sector.generatedContent?.systems[0];
  if (!system) {
    throw new Error(localize("Errors.GeneratedContentMissing"));
  }

  const existingGeneratedTiles = scene.tiles.contents
    .filter((tile) => {
      const flags = tile.flags as Record<string, Record<string, unknown>> | undefined;
      return Boolean(flags?.[MODULE_ID]?.generatedSystemTile);
    })
    .flatMap((tile) => tile.id ? [tile.id] : []);

  if (options.replaceExisting && existingGeneratedTiles.length > 0) {
    await scene.deleteEmbeddedDocuments("Tile", existingGeneratedTiles);
  }

  const sceneData = scene.toObject() as Record<string, any>;
  const sceneWidth = Number(sceneData.width ?? 0);
  const sceneHeight = Number(sceneData.height ?? 0);
  const sceneGrid = sceneData.grid as Record<string, any> | undefined;
  const gridSize = Math.max(50, Math.round(Number(options.gridSize ?? sceneGrid?.size ?? 100)));
  const centerX = Number(options.centerX ?? (sceneWidth / 2));
  const centerY = Number(options.centerY ?? (sceneHeight / 2));
  const hexMetrics = calculateFlatTopHexMetricsFromGridSize(gridSize);
  const targetHexWidth = Math.max(32, Math.round(hexMetrics.hexWidth * GENERATED_SYSTEM_TILE_SIZE_RATIO));
  const targetHexHeight = Math.max(32, Math.round(hexMetrics.hexHeight * GENERATED_SYSTEM_TILE_SIZE_RATIO));
  const tileRenderScale = Math.max(
    GENERATED_SYSTEM_TILE_RENDER_SCALE,
    targetHexWidth,
    targetHexHeight
  );
  const cachedTileImage = await cacheGeneratedSystemTileImage(sector, system, tileRenderScale);
  const tileWidth = targetHexWidth;
  const tileHeight = targetHexHeight;

  const [createdTile] = await scene.createEmbeddedDocuments("Tile", [
    {
      x: Math.round(centerX - (tileWidth / 2)),
      y: Math.round(centerY - (tileHeight / 2)),
      width: tileWidth,
      height: tileHeight,
      rotation: 0,
      alpha: 1,
      hidden: false,
      locked: false,
      overhead: false,
      texture: {
        src: cachedTileImage.textureSrc,
        scaleX: 1,
        scaleY: 1,
        tint: null
      },
      flags: {
        [MODULE_ID]: {
          generatedSystemTile: true,
          seed: sector.generatedContent?.seed ?? null,
          systemName: system.displayName,
          systemHex: system.hex
        }
      }
    }
  ] as never[]) as any[];

  if (!createdTile) {
    throw new Error(localize("Errors.SystemTileCreateFailed"));
  }

  return {
    createdTiles: 1,
    tileId: createdTile.id ?? null
  };
}
