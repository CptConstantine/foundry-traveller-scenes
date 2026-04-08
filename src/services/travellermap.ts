import {
  DEFAULT_POSTER_OPTIONS,
  MODULE_ID,
  POSTER_STORAGE_PATH,
  SECTOR_HEX_COLUMNS,
  SECTOR_HEX_ROWS,
  SUBSECTOR_HEX_COLUMNS,
  SUBSECTOR_HEX_ROWS,
  TRAVELLER_MAP_API_BASE
} from "../config/constants.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  PosterImageInfo,
  TravellerMapSearchResponse,
  TravellerMapSectorResult,
  TravellerMapSearchItem,
  TravellerMapSubsectorResult,
  TravellerPosterOptions,
  TravellerSectorSelection
} from "../types/traveller.js";

export class TravellerMapService {
  async searchSectors(query: string): Promise<TravellerSectorSelection[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const url = new URL(`${TRAVELLER_MAP_API_BASE}/search`);
    url.searchParams.set("q", trimmedQuery);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.SearchStatus", { status: response.status }));
    }

    const payload = (await response.json()) as TravellerMapSearchResponse;
    const items = payload.Results?.Items ?? [];

    const deduped = new Map<string, TravellerSectorSelection>();

    for (const item of items) {
      const selection = this.toSectorSelection(item);
      if (!selection) {
        continue;
      }

      deduped.set(selection.key, selection);
    }

    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  buildPosterUrl(
    sector: TravellerSectorSelection,
    options: Partial<TravellerPosterOptions> = {}
  ): string {
    const resolvedOptions = { ...DEFAULT_POSTER_OPTIONS, ...options };
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/poster`);

    url.searchParams.set("sector", sector.sectorName);

    if (sector.kind === "subsector" && sector.subsectorIndex) {
      url.searchParams.set("subsector", sector.subsectorIndex);
    }

    url.searchParams.set("style", resolvedOptions.style);
    url.searchParams.set("scale", String(resolvedOptions.scale));

    if (resolvedOptions.compositing) {
      url.searchParams.set("compositing", "1");
    }

    if (resolvedOptions.noGrid) {
      url.searchParams.set("nogrid", "1");
    }

    if (!resolvedOptions.routes) {
      url.searchParams.set("routes", "0");
    }

    if (resolvedOptions.milieu) {
      url.searchParams.set("milieu", resolvedOptions.milieu);
    }

    return url.toString();
  }

  async getPosterImageInfo(
    sector: TravellerSectorSelection,
    options: Partial<TravellerPosterOptions> = {}
  ): Promise<PosterImageInfo> {
    const resolvedOptions = { ...DEFAULT_POSTER_OPTIONS, ...options };
    const remoteUrl = this.buildPosterUrl(sector, resolvedOptions);
    const posterBlob = await this.fetchPosterBlob(remoteUrl);
    const dimensions = await this.loadImageDimensionsFromBlob(posterBlob);
    const cachedPath = await this.cachePosterBlob(sector, resolvedOptions, posterBlob);

    return {
      url: cachedPath,
      ...dimensions
    };
  }

  private createTypedSectorKey(type: "sector" | "subsector", name: string, location: string): string {
    return `${type}::${name}::${location}`;
  }

  private toSectorSelection(item: TravellerMapSearchItem): TravellerSectorSelection | null {
    if (item.Sector) {
      return this.fromSectorResult(item.Sector);
    }

    if (item.Subsector) {
      return this.fromSubsectorResult(item.Subsector);
    }

    return null;
  }

  private fromSectorResult(sector: TravellerMapSectorResult): TravellerSectorSelection {
    return {
      key: this.createTypedSectorKey("sector", sector.Name, `${sector.SectorX},${sector.SectorY}`),
      name: sector.Name,
      sectorX: sector.SectorX,
      sectorY: sector.SectorY,
      tags: this.parseTags(sector.SectorTags),
      kind: "sector",
      sectorName: sector.Name,
      dimensions: {
        columns: SECTOR_HEX_COLUMNS,
        rows: SECTOR_HEX_ROWS
      }
    };
  }

  private fromSubsectorResult(subsector: TravellerMapSubsectorResult): TravellerSectorSelection {
    return {
      key: this.createTypedSectorKey("subsector", subsector.Sector, subsector.Index),
      name: `${subsector.Name} (${subsector.Sector})`,
      sectorX: subsector.SectorX,
      sectorY: subsector.SectorY,
      tags: [...this.parseTags(subsector.SectorTags), `Subsector ${subsector.Index}`],
      kind: "subsector",
      sectorName: subsector.Sector,
      subsectorIndex: subsector.Index,
      dimensions: {
        columns: SUBSECTOR_HEX_COLUMNS,
        rows: SUBSECTOR_HEX_ROWS
      }
    };
  }

  private parseTags(tagString?: string): string[] {
    return (tagString ?? "")
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private async fetchPosterBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.PosterStatus", { status: response.status }));
    }

    return await response.blob();
  }

  private async cachePosterBlob(
    sector: TravellerSectorSelection,
    options: TravellerPosterOptions,
    posterBlob: Blob
  ): Promise<string> {
    const filePicker = foundry.applications.apps.FilePicker.implementation;
    const extension = this.getPosterFileExtension(posterBlob.type);
    const fileName = `${this.slugify(sector.name)}-${sector.sectorX}-${sector.sectorY}-${options.scale}-${Date.now()}.${extension}`;
    const file = new File([posterBlob], fileName, { type: posterBlob.type || `image/${extension}` });

    await this.ensurePosterStorageDirectory(filePicker);

    const upload = await filePicker.upload(
      "data",
      POSTER_STORAGE_PATH,
      file,
      {},
      { notify: false }
    );

    if (!upload || typeof upload !== "object" || !("path" in upload) || !upload.path) {
      throw new Error(localize("Errors.PosterStoreFailed"));
    }

    return this.normalizeFoundryAssetPath(upload.path);
  }

  private async ensurePosterStorageDirectory(
    filePicker: typeof foundry.applications.apps.FilePicker.implementation
  ): Promise<void> {
    const parts = POSTER_STORAGE_PATH.split("/").filter(Boolean);
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

        throw new Error(formatLocalize("Errors.PosterDirectoryCreateFailed", { message }));
      }
    }
  }

  private getPosterFileExtension(contentType: string): string {
    if (contentType.includes("jpeg")) {
      return "jpg";
    }

    if (contentType.includes("webp")) {
      return "webp";
    }

    return "png";
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private normalizeFoundryAssetPath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  private async loadImageDimensionsFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
    const objectUrl = URL.createObjectURL(blob);

    try {
      return await this.loadImageDimensions(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      };
      image.onerror = () => {
        reject(new Error(localize("Errors.PosterLoadFailed")));
      };
      image.src = url;
    });
  }
}

export const travellerMapService = new TravellerMapService();
