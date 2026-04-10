import {
  DEFAULT_POSTER_RENDER_OPTIONS,
  DEFAULT_POSTER_OPTIONS,
  MODULE_ID,
  POSTER_STORAGE_PATH,
  POSTER_RENDER_OPTION_MASKS,
  SECTOR_HEX_COLUMNS,
  SECTOR_HEX_ROWS,
  SUBSECTOR_HEX_COLUMNS,
  SUBSECTOR_HEX_ROWS,
  TRAVELLER_MAP_API_BASE
} from "../config/constants.js";
import { buildGeneratedSystemJumpMapData } from "./generatedtraveller.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  GeneratedTravellerContent,
  PosterImageInfo,
  TravellerMapMetadataResponse,
  TravellerMapSearchResponse,
  TravellerMapSectorResult,
  TravellerMapSearchItem,
  TravellerMapSubsectorResult,
  TravellerPosterOptions,
  TravellerSectorMetadata,
  TravellerSectorSelection,
  TravellerSectorSystem
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

  resolvePosterOptions(options: Partial<TravellerPosterOptions> = {}): TravellerPosterOptions {
    return { ...DEFAULT_POSTER_OPTIONS, ...options };
  }

  buildPosterUrl(
    sector: TravellerSectorSelection,
    options: Partial<TravellerPosterOptions> = {}
  ): string {
    const resolvedOptions = this.resolvePosterOptions(options);
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/poster`);

    url.searchParams.set("sector", sector.sectorName);

    if (sector.kind === "subsector" && sector.subsectorIndex) {
      url.searchParams.set("subsector", sector.subsectorIndex);
    }

    this.applyPosterRenderParameters(url, resolvedOptions);

    return url.toString();
  }

  async getPosterImageInfo(
    sector: TravellerSectorSelection,
    options: Partial<TravellerPosterOptions> = {}
  ): Promise<PosterImageInfo> {
    const resolvedOptions = this.resolvePosterOptions(options);
    const posterBlob = await this.fetchPosterBlobForSelection(sector, resolvedOptions);
    const dimensions = await this.loadImageDimensionsFromBlob(posterBlob);
    const cachedPath = await this.cachePosterBlob(sector, resolvedOptions, posterBlob);

    return {
      url: cachedPath,
      posterOptions: resolvedOptions,
      ...dimensions
    };
  }

  async getSectorMetadata(
    sector: TravellerSectorSelection,
    options: Partial<TravellerPosterOptions> = {}
  ): Promise<TravellerSectorMetadata> {
    const generatedContent = this.getGeneratedContent(sector);
    if (generatedContent) {
      return generatedContent.metadata;
    }

    const resolvedOptions = this.resolvePosterOptions(options);
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/metadata`);

    url.searchParams.set("sector", sector.sectorName);

    if (resolvedOptions.milieu) {
      url.searchParams.set("milieu", resolvedOptions.milieu);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.MetadataStatus", { status: response.status }));
    }

    const payload = (await response.json()) as TravellerMapMetadataResponse;
    const defaultSectorName = payload.Names?.find((name) => name.Text)?.Text ?? sector.sectorName;
    const subsectorDefinitions = payload.Subsectors ?? payload.DataFile?.Subsectors ?? [];
    const subsectorNames = Object.fromEntries(
      subsectorDefinitions
        .filter((subsector): subsector is { Index: string; Name?: string } => Boolean(subsector.Index))
        .map((subsector) => [subsector.Index, subsector.Name?.trim() || subsector.Index])
    );

    return {
      sectorName: defaultSectorName,
      abbreviation: payload.Abbreviation,
      milieu: payload.DataFile?.Milieu ?? resolvedOptions.milieu,
      subsectorNames
    };
  }

  async getSectorSystems(
    sector: TravellerSectorSelection,
    metadata: TravellerSectorMetadata,
    options: Partial<TravellerPosterOptions> = {}
  ): Promise<TravellerSectorSystem[]> {
    const generatedContent = this.getGeneratedContent(sector);
    if (generatedContent) {
      return generatedContent.systems;
    }

    const resolvedOptions = this.resolvePosterOptions(options);
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/sec`);

    url.searchParams.set("sector", sector.sectorName);
    url.searchParams.set("type", "TabDelimited");
    url.searchParams.set("metadata", "0");

    if (sector.kind === "subsector" && sector.subsectorIndex) {
      url.searchParams.set("subsector", sector.subsectorIndex);
    }

    if (resolvedOptions.milieu) {
      url.searchParams.set("milieu", resolvedOptions.milieu);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.SystemDataStatus", { status: response.status }));
    }

    return this.parseSectorSystems(await response.text(), metadata);
  }

  async fetchGeneratedJumpMapBlob(
    sector: TravellerSectorSelection,
    system: TravellerSectorSystem,
    options: Partial<TravellerPosterOptions> = {}
  ): Promise<Blob> {
    const generatedContent = this.getGeneratedContent(sector);
    const resolvedOptions = this.resolvePosterOptions(options);
    const milieu = generatedContent?.metadata.milieu ?? resolvedOptions.milieu;
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/jumpmap`);

    url.searchParams.set("jump", "0");
    url.searchParams.set("hex", system.hex);
    url.searchParams.set("style", resolvedOptions.style);
    url.searchParams.set("scale", String(Math.max(64, Math.round(resolvedOptions.scale))));
    url.searchParams.set("options", "0");
    url.searchParams.set("border", "0");
    url.searchParams.set("lint", "0");

    if (milieu) {
      url.searchParams.set("milieu", milieu);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: buildGeneratedSystemJumpMapData(system)
    });

    if (!response.ok) {
      throw new Error(formatLocalize("Errors.JumpMapStatus", { status: response.status }));
    }

    return await response.blob();
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
      source: "travellermap",
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
      source: "travellermap",
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

  private parseSectorSystems(
    payload: string,
    metadata: TravellerSectorMetadata
  ): TravellerSectorSystem[] {
    const rows = payload
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    const header = rows.shift();
    if (!header) {
      return [];
    }

    const headers = header.split("\t");

    return rows
      .map((row) => this.parseSectorSystemRow(row, headers, metadata))
      .filter((system): system is TravellerSectorSystem => system !== null)
      .sort((left, right) => left.hex.localeCompare(right.hex));
  }

  private parseSectorSystemRow(
    row: string,
    headers: string[],
    metadata: TravellerSectorMetadata
  ): TravellerSectorSystem | null {
    const columns = row.split("\t");
    const record = Object.fromEntries(headers.map((header, index) => [header, columns[index]?.trim() ?? ""]));
    const hex = record.Hex;

    if (!hex || !/^\d{4}$/.test(hex)) {
      return null;
    }

    const hexX = Number.parseInt(hex.slice(0, 2), 10);
    const hexY = Number.parseInt(hex.slice(2, 4), 10);

    if (!Number.isFinite(hexX) || !Number.isFinite(hexY)) {
      return null;
    }

    const subsectorIndex = record.SS || this.getSubsectorIndexForHex(hexX, hexY);
    const subsectorName = metadata.subsectorNames[subsectorIndex] ?? subsectorIndex;
    const displayName = record.Name?.trim() || formatLocalize("Journals.UnnamedWorld", { hex });

    return {
      sector: record.Sector || metadata.abbreviation || metadata.sectorName,
      subsectorIndex,
      subsectorName,
      hex,
      hexX,
      hexY,
      localHexX: ((hexX - 1) % SUBSECTOR_HEX_COLUMNS) + 1,
      localHexY: ((hexY - 1) % SUBSECTOR_HEX_ROWS) + 1,
      name: record.Name?.trim() || "",
      displayName,
      uwp: record.UWP || "",
      bases: record.Bases || "",
      remarks: record.Remarks || "",
      zone: record.Zone || "",
      pbg: record.PBG || "",
      allegiance: record.Allegiance || "",
      stars: record.Stars || "",
      importance: record["{Ix}"] || "",
      economics: record["(Ex)"] || "",
      culture: record["[Cx]"] || "",
      nobility: record.Nobility || "",
      worlds: record.W || "",
      resourceUnits: record.RU || ""
    };
  }

  private getSubsectorIndexForHex(hexX: number, hexY: number): string {
    const subsectorColumn = Math.floor((hexX - 1) / SUBSECTOR_HEX_COLUMNS);
    const subsectorRow = Math.floor((hexY - 1) / SUBSECTOR_HEX_ROWS);
    const subsectorNumber = subsectorRow * 4 + subsectorColumn;

    return String.fromCharCode(65 + subsectorNumber);
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
    const optionFingerprint = this.slugify([
      options.style,
      options.routes ? "routes" : "noroutes",
      options.noGrid ? "nogrid" : "grid",
      options.showBorders ? "borders" : "noborders",
      options.showSectorSubsectorNames ? "sectornames" : "nosectornames",
      options.showLabels ? "labels" : "nolabels",
      options.compositing ? "composite" : "opaque",
      options.milieu ?? "default"
    ].join("-"));
    const selectionFingerprint = this.slugify([
      sector.kind,
      sector.sectorName,
      sector.subsectorIndex ?? "full",
      sector.name
    ].join("-"));
    const fileName = `${selectionFingerprint}-${sector.sectorX}-${sector.sectorY}-${optionFingerprint}-${Date.now()}.${extension}`;
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

  private getGeneratedContent(sector: TravellerSectorSelection): GeneratedTravellerContent | null {
    if (sector.source !== "generated") {
      return null;
    }

    if (!sector.generatedContent) {
      throw new Error(localize("Errors.GeneratedContentMissing"));
    }

    return sector.generatedContent;
  }

  private async fetchPosterBlobForSelection(
    sector: TravellerSectorSelection,
    options: TravellerPosterOptions
  ): Promise<Blob> {
    const generatedContent = this.getGeneratedContent(sector);

    if (generatedContent) {
      return await this.fetchGeneratedPosterBlob(sector, options, generatedContent);
    }

    return await this.fetchPosterBlob(this.buildPosterUrl(sector, options));
  }

  private async fetchGeneratedPosterBlob(
    sector: TravellerSectorSelection,
    options: TravellerPosterOptions,
    generatedContent: GeneratedTravellerContent
  ): Promise<Blob> {
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/poster`);

    if (sector.kind === "subsector" && sector.subsectorIndex) {
      url.searchParams.set("subsector", sector.subsectorIndex);
    }

    this.applyPosterRenderParameters(url, options);

    const body = new URLSearchParams({
      data: generatedContent.poster.data,
      metadata: generatedContent.poster.metadata
    });

    const response = await fetch(url, {
      method: "POST",
      body
    });

    if (!response.ok) {
      throw new Error(formatLocalize("Errors.PosterStatus", { status: response.status }));
    }

    return await response.blob();
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

  private applyPosterRenderParameters(url: URL, options: TravellerPosterOptions): void {
    url.searchParams.set("style", options.style);
    url.searchParams.set("scale", String(options.scale));

    if (options.compositing) {
      url.searchParams.set("compositing", "1");
    }

    const renderOptions = this.buildPosterRenderOptions(options);
    if (renderOptions !== undefined) {
      url.searchParams.set("options", String(renderOptions));
    }

    if (options.noGrid) {
      url.searchParams.set("nogrid", "1");
    }

    if (!options.routes) {
      url.searchParams.set("routes", "0");
    }

    if (options.milieu) {
      url.searchParams.set("milieu", options.milieu);
    }
  }

  private buildPosterRenderOptions(options: TravellerPosterOptions): number | undefined {
    if (options.showBorders && options.showSectorSubsectorNames && options.showLabels) {
      return undefined;
    }

    let renderOptions = DEFAULT_POSTER_RENDER_OPTIONS;

    if (!options.showBorders) {
      renderOptions &= ~POSTER_RENDER_OPTION_MASKS.borders;
    }

    if (!options.showSectorSubsectorNames) {
      renderOptions &= ~POSTER_RENDER_OPTION_MASKS.sectorSubsectorNames;
    }

    if (!options.showLabels) {
      renderOptions &= ~POSTER_RENDER_OPTION_MASKS.labels;
    }

    return renderOptions;
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
