// src/config/constants.ts
var MODULE_ID = "traveller-scenes";
var MODULE_TITLE = "Traveller Scenes";
var TRAVELLER_MAP_API_BASE = "https://travellermap.com/api";
var SECTOR_HEX_COLUMNS = 32;
var SECTOR_HEX_ROWS = 40;
var SUBSECTOR_HEX_COLUMNS = 8;
var SUBSECTOR_HEX_ROWS = 10;
var DEFAULT_GRID_DISTANCE = 1;
var DEFAULT_GRID_UNITS = "pc";
var DEFAULT_GRID_COLOR = "#4ac0ff";
var POSTER_STORAGE_PATH = `assets/${MODULE_ID}/posters`;
var SECTOR_SEARCH_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/sector-search-app.hbs`;
var DEFAULT_POSTER_OPTIONS = Object.freeze({
  style: "poster",
  scale: 128,
  compositing: true,
  noGrid: true,
  routes: false,
  showBorders: true,
  showSectorSubsectorNames: true,
  showLabels: true
});
var DEFAULT_SYSTEM_NOTE_OPTIONS = Object.freeze({
  generateSystemNotes: true,
  detailLevel: "basic"
});
var SYSTEM_NOTE_ICON = "icons/svg/book.svg";
var SYSTEM_NOTE_ICON_SIZE = 40;
var SYSTEM_NOTE_FONT_SIZE = 24;
var JOURNAL_FOLDER_SORTING = "a";
var DEFAULT_POSTER_RENDER_OPTIONS = 9207;
var POSTER_RENDER_OPTION_MASKS = Object.freeze({
  borders: 48,
  sectorSubsectorNames: 4,
  labels: 192
});
var POSTER_STYLE_OPTIONS = Object.freeze([
  { value: "poster", label: "Poster" },
  { value: "print", label: "Print" },
  { value: "atlas", label: "Atlas" },
  { value: "candy", label: "Candy" },
  { value: "draft", label: "Draft" },
  { value: "fasa", label: "FASA" },
  { value: "terminal", label: "Terminal" },
  { value: "mongoose", label: "Mongoose" }
]);
var POSTER_MILIEU_OPTIONS = Object.freeze([
  "M1105",
  "IW",
  "M0",
  "M600",
  "M990",
  "M1120",
  "M1201",
  "M1248",
  "M1900"
]);

// src/utils/geometry.ts
var HEX_HEIGHT_TO_WIDTH_RATIO = Math.sqrt(3) / 2;
function calculateFlatTopHexMetricsFromImage(imageWidth, imageHeight, dimensions) {
  const normalizedHexHeight = imageHeight / (dimensions.rows + 0.5);
  const normalizedHexWidth = normalizedHexHeight / HEX_HEIGHT_TO_WIDTH_RATIO;
  return {
    hexWidth: normalizedHexWidth,
    hexHeight: normalizedHexHeight,
    stepX: normalizedHexWidth * 0.75,
    stepY: normalizedHexHeight
  };
}

// src/services/hexgridalignment.ts
var DEFAULT_DIMENSIONS = {
  columns: SECTOR_HEX_COLUMNS,
  rows: SECTOR_HEX_ROWS
};
function calibrateSectorGrid(image, dimensions = DEFAULT_DIMENSIONS) {
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
function getHexCenterPoint(gridConfig, column, row) {
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

// src/utils/localization.ts
var LOCALIZATION_PREFIX = "TRAVELLER_SCENES";
function getLocalizationKey(key) {
  return `${LOCALIZATION_PREFIX}.${key}`;
}
function toFormatValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value == null ? "" : String(value)])
  );
}
function localize(key) {
  const localizationKey = getLocalizationKey(key);
  return game.i18n?.localize(localizationKey) ?? localizationKey;
}
function formatLocalize(key, values = {}) {
  const localizationKey = getLocalizationKey(key);
  return game.i18n?.format(localizationKey, toFormatValues(values)) ?? localizationKey;
}

// src/services/travellermap.ts
var TravellerMapService = class {
  async searchSectors(query) {
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
    const payload = await response.json();
    const items = payload.Results?.Items ?? [];
    const deduped = /* @__PURE__ */ new Map();
    for (const item of items) {
      const selection = this.toSectorSelection(item);
      if (!selection) {
        continue;
      }
      deduped.set(selection.key, selection);
    }
    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
  }
  resolvePosterOptions(options = {}) {
    return { ...DEFAULT_POSTER_OPTIONS, ...options };
  }
  buildPosterUrl(sector, options = {}) {
    const resolvedOptions = this.resolvePosterOptions(options);
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
    const renderOptions = this.buildPosterRenderOptions(resolvedOptions);
    if (renderOptions !== void 0) {
      url.searchParams.set("options", String(renderOptions));
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
  async getPosterImageInfo(sector, options = {}) {
    const resolvedOptions = this.resolvePosterOptions(options);
    const remoteUrl = this.buildPosterUrl(sector, resolvedOptions);
    const posterBlob = await this.fetchPosterBlob(remoteUrl);
    const dimensions = await this.loadImageDimensionsFromBlob(posterBlob);
    const cachedPath = await this.cachePosterBlob(sector, resolvedOptions, posterBlob);
    return {
      url: cachedPath,
      posterOptions: resolvedOptions,
      ...dimensions
    };
  }
  async getSectorMetadata(sector, options = {}) {
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
    const payload = await response.json();
    const defaultSectorName = payload.Names?.find((name) => name.Text)?.Text ?? sector.sectorName;
    const subsectorDefinitions = payload.Subsectors ?? payload.DataFile?.Subsectors ?? [];
    const subsectorNames = Object.fromEntries(
      subsectorDefinitions.filter((subsector) => Boolean(subsector.Index)).map((subsector) => [subsector.Index, subsector.Name?.trim() || subsector.Index])
    );
    return {
      sectorName: defaultSectorName,
      abbreviation: payload.Abbreviation,
      milieu: payload.DataFile?.Milieu ?? resolvedOptions.milieu,
      subsectorNames
    };
  }
  async getSectorSystems(sector, metadata, options = {}) {
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
  createTypedSectorKey(type, name, location) {
    return `${type}::${name}::${location}`;
  }
  toSectorSelection(item) {
    if (item.Sector) {
      return this.fromSectorResult(item.Sector);
    }
    if (item.Subsector) {
      return this.fromSubsectorResult(item.Subsector);
    }
    return null;
  }
  fromSectorResult(sector) {
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
  fromSubsectorResult(subsector) {
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
  parseTags(tagString) {
    return (tagString ?? "").split(/\s+/).map((tag) => tag.trim()).filter(Boolean);
  }
  parseSectorSystems(payload, metadata) {
    const rows = payload.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.length > 0 && !line.startsWith("#"));
    const header = rows.shift();
    if (!header) {
      return [];
    }
    const headers = header.split("	");
    return rows.map((row) => this.parseSectorSystemRow(row, headers, metadata)).filter((system) => system !== null).sort((left, right) => left.hex.localeCompare(right.hex));
  }
  parseSectorSystemRow(row, headers, metadata) {
    const columns = row.split("	");
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
      localHexX: (hexX - 1) % SUBSECTOR_HEX_COLUMNS + 1,
      localHexY: (hexY - 1) % SUBSECTOR_HEX_ROWS + 1,
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
  getSubsectorIndexForHex(hexX, hexY) {
    const subsectorColumn = Math.floor((hexX - 1) / SUBSECTOR_HEX_COLUMNS);
    const subsectorRow = Math.floor((hexY - 1) / SUBSECTOR_HEX_ROWS);
    const subsectorNumber = subsectorRow * 4 + subsectorColumn;
    return String.fromCharCode(65 + subsectorNumber);
  }
  async fetchPosterBlob(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.PosterStatus", { status: response.status }));
    }
    return await response.blob();
  }
  async cachePosterBlob(sector, options, posterBlob) {
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
  async ensurePosterStorageDirectory(filePicker) {
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
  getPosterFileExtension(contentType) {
    if (contentType.includes("jpeg")) {
      return "jpg";
    }
    if (contentType.includes("webp")) {
      return "webp";
    }
    return "png";
  }
  buildPosterRenderOptions(options) {
    if (options.showBorders && options.showSectorSubsectorNames && options.showLabels) {
      return void 0;
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
  slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  normalizeFoundryAssetPath(path) {
    return path.replace(/\\/g, "/");
  }
  async loadImageDimensionsFromBlob(blob) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await this.loadImageDimensions(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  async loadImageDimensions(url) {
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
};
var travellerMapService = new TravellerMapService();

// src/services/systemnotes.ts
var TRADE_CODE_TOKENS = /* @__PURE__ */ new Set([
  "Ag",
  "As",
  "Ba",
  "De",
  "Fl",
  "Ga",
  "He",
  "Hi",
  "Ht",
  "Ic",
  "In",
  "Lo",
  "Lt",
  "Na",
  "Ni",
  "Oc",
  "Pa",
  "Ph",
  "Pi",
  "Po",
  "Pr",
  "Ri",
  "Va",
  "Wa"
]);
function getModuleFlag(document2, key) {
  const flags = document2.flags;
  const scopeFlags = flags?.[MODULE_ID];
  if (!scopeFlags) {
    return void 0;
  }
  return scopeFlags[key];
}
async function generateSystemJournalsAndNotes(scene, sector, grid, posterOptions, noteOptions) {
  if (!noteOptions.generateSystemNotes) {
    return {
      createdNotes: 0,
      touchedJournals: 0
    };
  }
  const metadata = await travellerMapService.getSectorMetadata(sector, posterOptions);
  const systems = await travellerMapService.getSectorSystems(sector, metadata, posterOptions);
  const relevantSystems = sector.kind === "subsector" && sector.subsectorIndex ? systems.filter((system) => system.subsectorIndex === sector.subsectorIndex) : systems;
  if (relevantSystems.length === 0) {
    return {
      createdNotes: 0,
      touchedJournals: 0
    };
  }
  const rootFolder = await ensureJournalFolder(localize("Journals.RootFolder"), null);
  const sectorFolder = await ensureJournalFolder(metadata.sectorName, rootFolder);
  const systemsBySubsector = groupSystemsBySubsector(relevantSystems);
  const pageLinks = /* @__PURE__ */ new Map();
  let touchedJournals = 0;
  for (const [subsectorIndex, subsectorSystems] of systemsBySubsector) {
    const entry = await ensureSubsectorJournalEntry(
      sectorFolder,
      metadata,
      subsectorIndex,
      subsectorSystems,
      posterOptions
    );
    touchedJournals += 1;
    for (const system of subsectorSystems) {
      const page = findSystemPage(entry, system.hex);
      if (entry.id && page?.id) {
        pageLinks.set(system.hex, {
          entryId: entry.id,
          pageId: page.id
        });
      }
    }
  }
  const existingGeneratedNotes = scene.notes.contents.filter((note) => Boolean(getModuleFlag(note, "generatedSystemNote"))).flatMap((note) => note.id ? [note.id] : []);
  if (existingGeneratedNotes.length > 0) {
    await scene.deleteEmbeddedDocuments("Note", existingGeneratedNotes);
  }
  const noteData = relevantSystems.map((system) => buildSceneNoteData(system, sector, grid, pageLinks.get(system.hex))).filter((note) => note !== null);
  if (noteData.length > 0) {
    await scene.createEmbeddedDocuments("Note", noteData);
  }
  return {
    createdNotes: noteData.length,
    touchedJournals
  };
}
async function ensureJournalFolder(name, parent) {
  const existing = game.folders?.contents.find(
    (folder) => folder.type === "JournalEntry" && folder.name === name && (folder.folder?.id ?? null) === (parent?.id ?? null)
  );
  if (existing) {
    return existing;
  }
  const created = await Folder.create({
    name,
    type: "JournalEntry",
    folder: parent?.id ?? null,
    sorting: JOURNAL_FOLDER_SORTING
  });
  if (!created) {
    throw new Error(localize("Errors.JournalFolderCreateFailed"));
  }
  return created;
}
function groupSystemsBySubsector(systems) {
  const groups = /* @__PURE__ */ new Map();
  for (const system of systems) {
    const existing = groups.get(system.subsectorIndex);
    if (existing) {
      existing.push(system);
      continue;
    }
    groups.set(system.subsectorIndex, [system]);
  }
  return groups;
}
async function ensureSubsectorJournalEntry(folder, metadata, subsectorIndex, systems, posterOptions) {
  const subsectorName = systems[0]?.subsectorName ?? subsectorIndex;
  const milieu = posterOptions.milieu ?? metadata.milieu ?? "M1105";
  const flagData = {
    kind: "subsector-journal",
    sectorName: metadata.sectorName,
    subsectorIndex,
    milieu
  };
  const existing = game.journal?.contents.find((entry2) => {
    const flag = getModuleFlag(entry2, "systemNoteJournal");
    return flag?.kind === flagData.kind && flag.sectorName === flagData.sectorName && flag.subsectorIndex === flagData.subsectorIndex && flag.milieu === flagData.milieu;
  });
  const entryName = formatJournalEntryName(subsectorName, metadata.sectorName, milieu);
  const entry = existing ?? await JournalEntry.create({
    name: entryName,
    folder: folder.id,
    flags: {
      [MODULE_ID]: {
        systemNoteJournal: flagData
      }
    }
  });
  if (!entry) {
    throw new Error(localize("Errors.JournalEntryCreateFailed"));
  }
  if (entry.name !== entryName || (entry.folder?.id ?? null) !== folder.id) {
    await entry.update({
      name: entryName,
      folder: folder.id
    });
  }
  const updates = [];
  const creations = [];
  for (const [index, system] of systems.entries()) {
    const existingPage = findSystemPage(entry, system.hex);
    const pageData = buildJournalPageData(system, metadata.sectorName, milieu, index);
    if (existingPage?.id) {
      updates.push({
        _id: existingPage.id,
        ...pageData
      });
      continue;
    }
    creations.push(pageData);
  }
  if (updates.length > 0) {
    await entry.updateEmbeddedDocuments("JournalEntryPage", updates);
  }
  if (creations.length > 0) {
    await entry.createEmbeddedDocuments("JournalEntryPage", creations);
  }
  return entry;
}
function findSystemPage(entry, hex) {
  return entry.pages.contents.find((page) => {
    const flag = getModuleFlag(page, "systemPage");
    return flag?.kind === "system-page" && flag.hex === hex;
  }) ?? null;
}
function buildJournalPageData(system, sectorName, milieu, sort) {
  const flagData = {
    kind: "system-page",
    hex: system.hex,
    sectorName,
    subsectorIndex: system.subsectorIndex,
    milieu
  };
  return {
    name: formatLocalize("Journals.PageName", {
      name: system.displayName,
      hex: system.hex
    }),
    type: "text",
    sort,
    title: {
      show: true,
      level: 1
    },
    text: {
      content: renderBasicSystemPage(system, sectorName),
      format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
    },
    flags: {
      [MODULE_ID]: {
        systemPage: flagData
      }
    }
  };
}
function renderBasicSystemPage(system, sectorName) {
  const escape = foundry.utils.escapeHTML;
  const overviewParagraphs = buildOverviewParagraphs(system, sectorName).map((paragraph) => `<p>${escape(paragraph)}</p>`).join("");
  const profileRows = buildProfileRows(system).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("");
  const tradeCodeItems = buildTradeCodeItems(system).map((item) => `<li>${escape(item)}</li>`).join("");
  const classificationItems = buildClassificationItems(system).map((item) => `<li>${escape(item)}</li>`).join("");
  const rawDetails = [
    [localize("Journals.Fields.Hex"), system.hex],
    [localize("Journals.Fields.UWP"), system.uwp],
    [localize("Journals.Fields.Remarks"), system.remarks],
    [localize("Journals.Fields.Bases"), system.bases],
    [localize("Journals.Fields.Zone"), system.zone],
    [localize("Journals.Fields.PBG"), system.pbg],
    [localize("Journals.Fields.Allegiance"), system.allegiance],
    [localize("Journals.Fields.Stars"), system.stars],
    [localize("Journals.Fields.Importance"), system.importance],
    [localize("Journals.Fields.Economics"), system.economics],
    [localize("Journals.Fields.Culture"), system.culture],
    [localize("Journals.Fields.Nobility"), system.nobility],
    [localize("Journals.Fields.Worlds"), system.worlds],
    [localize("Journals.Fields.ResourceUnits"), system.resourceUnits]
  ].filter(([, value]) => Boolean(value));
  const rawDetailRows = rawDetails.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("");
  return [
    `<section class="traveller-scenes__journal-page">`,
    `<h2>${escape(localize("Journals.Sections.Overview"))}</h2>`,
    overviewParagraphs,
    `<h2>${escape(localize("Journals.Sections.Profile"))}</h2>`,
    `<dl>${profileRows}</dl>`,
    `<h2>${escape(localize("Journals.Sections.TradeCodes"))}</h2>`,
    tradeCodeItems ? `<ul>${tradeCodeItems}</ul>` : `<p>${escape(localize("Journals.EmptyTradeCodes"))}</p>`,
    `<h2>${escape(localize("Journals.Sections.Classifications"))}</h2>`,
    classificationItems ? `<ul>${classificationItems}</ul>` : `<p>${escape(localize("Journals.EmptyClassifications"))}</p>`,
    `<h2>${escape(localize("Journals.Sections.RawData"))}</h2>`,
    `<dl>${rawDetailRows}</dl>`,
    `</section>`
  ].join("");
}
function buildOverviewParagraphs(system, sectorName) {
  const uwp = parseUwp(system.uwp);
  const remarks = describeRemarkTokens(system.remarks);
  const remarkSummary = remarks.slice(0, 3).join(", ");
  const paragraphs = [
    formatLocalize("Journals.Description", {
      name: system.displayName,
      hex: system.hex,
      subsector: system.subsectorName,
      sector: sectorName
    })
  ];
  if (uwp) {
    paragraphs.push(formatLocalize("Journals.Overview.WorldSummary", {
      starport: describeStarport(uwp.starport),
      size: describeSize(uwp.size),
      atmosphere: describeAtmosphere(uwp.atmosphere),
      hydrographics: describeHydrographics(uwp.hydrographics),
      population: describePopulation(uwp.population),
      government: describeGovernment(uwp.government),
      law: describeLawLevel(uwp.lawLevel),
      techLevel: describeTechLevel(uwp.techLevel)
    }));
  }
  if (remarkSummary) {
    paragraphs.push(formatLocalize("Journals.Overview.ClassificationSummary", {
      classifications: remarkSummary
    }));
  }
  if (system.zone) {
    paragraphs.push(formatLocalize("Journals.Overview.TravelZoneSummary", {
      zone: describeTravelZone(system.zone)
    }));
  }
  return paragraphs;
}
function buildProfileRows(system) {
  const uwp = parseUwp(system.uwp);
  const rows = [];
  if (uwp) {
    rows.push([localize("Journals.Profile.Starport"), describeStarport(uwp.starport)]);
    rows.push([localize("Journals.Profile.Size"), describeSize(uwp.size)]);
    rows.push([localize("Journals.Profile.Atmosphere"), describeAtmosphere(uwp.atmosphere)]);
    rows.push([localize("Journals.Profile.Hydrographics"), describeHydrographics(uwp.hydrographics)]);
    rows.push([localize("Journals.Profile.Population"), describePopulation(uwp.population)]);
    rows.push([localize("Journals.Profile.Government"), describeGovernment(uwp.government)]);
    rows.push([localize("Journals.Profile.LawLevel"), describeLawLevel(uwp.lawLevel)]);
    rows.push([localize("Journals.Profile.TechLevel"), describeTechLevel(uwp.techLevel)]);
  }
  const pbgSummary = describePbg(system.pbg);
  if (pbgSummary) {
    rows.push([localize("Journals.Profile.PBGExpanded"), pbgSummary]);
  }
  if (system.stars) {
    rows.push([localize("Journals.Profile.Stellar"), system.stars]);
  }
  if (system.allegiance) {
    rows.push([localize("Journals.Profile.AllegianceExpanded"), system.allegiance]);
  }
  return rows;
}
function buildClassificationItems(system) {
  const items = getRemarkTokens(system.remarks).filter((token) => !isTradeCodeToken(token)).map((token) => describeRemarkToken(token));
  if (system.bases) {
    items.push(formatLocalize("Journals.Classifications.BasesPresent", {
      bases: system.bases
    }));
  }
  if (system.zone) {
    items.push(formatLocalize("Journals.Classifications.TravelZone", {
      zone: describeTravelZone(system.zone)
    }));
  }
  if (system.importance) {
    items.push(formatLocalize("Journals.Classifications.ImportanceRating", {
      importance: system.importance
    }));
  }
  if (system.economics) {
    items.push(formatLocalize("Journals.Classifications.EconomicsRating", {
      economics: system.economics
    }));
  }
  if (system.culture) {
    items.push(formatLocalize("Journals.Classifications.CultureRating", {
      culture: system.culture
    }));
  }
  return items;
}
function buildTradeCodeItems(system) {
  return getRemarkTokens(system.remarks).filter((token) => isTradeCodeToken(token)).map((token) => formatTradeCode(token));
}
function formatTradeCode(token) {
  return `${token} (${describeRemarkToken(token)})`;
}
function parseUwp(uwp) {
  const match = uwp.match(/^(.)(.)(.)(.)(.)(.)(.)-(.)$/);
  if (!match) {
    return null;
  }
  const [, starport, size, atmosphere, hydrographics, population, government, lawLevel, techLevel] = match;
  return {
    starport,
    size,
    atmosphere,
    hydrographics,
    population,
    government,
    lawLevel,
    techLevel
  };
}
function decodeEHex(value) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const index = alphabet.indexOf(normalized);
  return index >= 0 ? index : null;
}
function describeStarport(code) {
  const descriptions = {
    A: localize("Journals.Starport.A"),
    B: localize("Journals.Starport.B"),
    C: localize("Journals.Starport.C"),
    D: localize("Journals.Starport.D"),
    E: localize("Journals.Starport.E"),
    X: localize("Journals.Starport.X")
  };
  return descriptions[code.toUpperCase()] ?? formatLocalize("Journals.GenericCode", { code });
}
function describeSize(code) {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }
  if (value === 0) {
    return localize("Journals.Size.0");
  }
  const diameter = value * 1600;
  return formatLocalize("Journals.Size.Other", { code, diameter });
}
function describeAtmosphere(code) {
  const descriptions = {
    "0": localize("Journals.Atmosphere.0"),
    "1": localize("Journals.Atmosphere.1"),
    "2": localize("Journals.Atmosphere.2"),
    "3": localize("Journals.Atmosphere.3"),
    "4": localize("Journals.Atmosphere.4"),
    "5": localize("Journals.Atmosphere.5"),
    "6": localize("Journals.Atmosphere.6"),
    "7": localize("Journals.Atmosphere.7"),
    "8": localize("Journals.Atmosphere.8"),
    "9": localize("Journals.Atmosphere.9"),
    A: localize("Journals.Atmosphere.A"),
    B: localize("Journals.Atmosphere.B"),
    C: localize("Journals.Atmosphere.C"),
    D: localize("Journals.Atmosphere.D"),
    E: localize("Journals.Atmosphere.E"),
    F: localize("Journals.Atmosphere.F")
  };
  return descriptions[code.toUpperCase()] ?? formatLocalize("Journals.GenericCode", { code });
}
function describeHydrographics(code) {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }
  const percentage = Math.min(value, 10) * 10;
  return formatLocalize("Journals.Hydrographics.Description", { code, percentage });
}
function describePopulation(code) {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }
  if (value === 0) {
    return localize("Journals.Population.0");
  }
  if (value <= 3) {
    return formatLocalize("Journals.Population.Low", { code });
  }
  if (value <= 6) {
    return formatLocalize("Journals.Population.Moderate", { code });
  }
  if (value <= 8) {
    return formatLocalize("Journals.Population.High", { code });
  }
  return formatLocalize("Journals.Population.VeryHigh", { code });
}
function describeGovernment(code) {
  const descriptions = {
    "0": localize("Journals.Government.0"),
    "1": localize("Journals.Government.1"),
    "2": localize("Journals.Government.2"),
    "3": localize("Journals.Government.3"),
    "4": localize("Journals.Government.4"),
    "5": localize("Journals.Government.5"),
    "6": localize("Journals.Government.6"),
    "7": localize("Journals.Government.7"),
    "8": localize("Journals.Government.8"),
    "9": localize("Journals.Government.9"),
    A: localize("Journals.Government.A"),
    B: localize("Journals.Government.B"),
    C: localize("Journals.Government.C"),
    D: localize("Journals.Government.D"),
    E: localize("Journals.Government.E"),
    F: localize("Journals.Government.F")
  };
  return descriptions[code.toUpperCase()] ?? formatLocalize("Journals.GenericCode", { code });
}
function describeLawLevel(code) {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }
  if (value === 0) {
    return localize("Journals.LawLevel.0");
  }
  if (value <= 3) {
    return formatLocalize("Journals.LawLevel.Light", { code });
  }
  if (value <= 7) {
    return formatLocalize("Journals.LawLevel.Moderate", { code });
  }
  if (value <= 10) {
    return formatLocalize("Journals.LawLevel.Strict", { code });
  }
  return formatLocalize("Journals.LawLevel.Extreme", { code });
}
function describeTechLevel(code) {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }
  if (value <= 5) {
    return formatLocalize("Journals.TechLevel.Low", { code });
  }
  if (value <= 8) {
    return formatLocalize("Journals.TechLevel.Moderate", { code });
  }
  if (value <= 11) {
    return formatLocalize("Journals.TechLevel.Advanced", { code });
  }
  return formatLocalize("Journals.TechLevel.VeryAdvanced", { code });
}
function describePbg(pbg) {
  const match = pbg.match(/^(\w)(\w)(\w)$/i);
  if (!match) {
    return pbg || null;
  }
  const [, populationMultiplierCode, planetoidBeltsCode, gasGiantsCode] = match;
  const populationMultiplier = decodeEHex(populationMultiplierCode);
  const planetoidBelts = decodeEHex(planetoidBeltsCode);
  const gasGiants = decodeEHex(gasGiantsCode);
  return formatLocalize("Journals.Profile.PBGDescription", {
    populationMultiplier: populationMultiplier ?? populationMultiplierCode,
    planetoidBelts: planetoidBelts ?? planetoidBeltsCode,
    gasGiants: gasGiants ?? gasGiantsCode
  });
}
function describeTravelZone(zone) {
  const normalized = zone.trim().toUpperCase();
  if (!normalized) {
    return localize("Journals.TravelZone.None");
  }
  if (normalized === "A") {
    return localize("Journals.TravelZone.Amber");
  }
  if (normalized === "R") {
    return localize("Journals.TravelZone.Red");
  }
  return formatLocalize("Journals.GenericCode", { code: zone });
}
function describeRemarkTokens(remarks) {
  return getRemarkTokens(remarks).map((token) => describeRemarkToken(token));
}
function getRemarkTokens(remarks) {
  return remarks.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}
function isTradeCodeToken(token) {
  return TRADE_CODE_TOKENS.has(token);
}
function describeRemarkToken(token) {
  const descriptions = {
    Ag: localize("Journals.Remarks.Ag"),
    An: localize("Journals.Remarks.An"),
    As: localize("Journals.Remarks.As"),
    Ba: localize("Journals.Remarks.Ba"),
    Cp: localize("Journals.Remarks.Cp"),
    Cs: localize("Journals.Remarks.Cs"),
    Da: localize("Journals.Remarks.Da"),
    De: localize("Journals.Remarks.De"),
    Di: localize("Journals.Remarks.Di"),
    Fl: localize("Journals.Remarks.Fl"),
    Fo: localize("Journals.Remarks.Fo"),
    Ga: localize("Journals.Remarks.Ga"),
    He: localize("Journals.Remarks.He"),
    Hi: localize("Journals.Remarks.Hi"),
    Ht: localize("Journals.Remarks.Ht"),
    Ic: localize("Journals.Remarks.Ic"),
    In: localize("Journals.Remarks.In"),
    Lo: localize("Journals.Remarks.Lo"),
    Lt: localize("Journals.Remarks.Lt"),
    Mr: localize("Journals.Remarks.Mr"),
    Na: localize("Journals.Remarks.Na"),
    Ni: localize("Journals.Remarks.Ni"),
    Oc: localize("Journals.Remarks.Oc"),
    Pa: localize("Journals.Remarks.Pa"),
    Ph: localize("Journals.Remarks.Ph"),
    Pi: localize("Journals.Remarks.Pi"),
    Po: localize("Journals.Remarks.Po"),
    Pr: localize("Journals.Remarks.Pr"),
    Pz: localize("Journals.Remarks.Pz"),
    Re: localize("Journals.Remarks.Re"),
    Ri: localize("Journals.Remarks.Ri"),
    RsA: localize("Journals.Remarks.RsA"),
    RsB: localize("Journals.Remarks.RsB"),
    RsD: localize("Journals.Remarks.RsD"),
    RsE: localize("Journals.Remarks.RsE"),
    RsG: localize("Journals.Remarks.RsG"),
    RsT: localize("Journals.Remarks.RsT"),
    Sa: localize("Journals.Remarks.Sa"),
    Va: localize("Journals.Remarks.Va"),
    Wa: localize("Journals.Remarks.Wa")
  };
  if (token.startsWith("O:")) {
    return formatLocalize("Journals.Remarks.Ownership", {
      target: token.slice(2)
    });
  }
  return descriptions[token] ?? token;
}
function buildSceneNoteData(system, sector, grid, journalLink) {
  if (!journalLink) {
    return null;
  }
  const notePosition = sector.kind === "subsector" ? getHexCenterPoint(grid, system.localHexX, system.localHexY) : getHexCenterPoint(grid, system.hexX, system.hexY);
  return {
    entryId: journalLink.entryId,
    pageId: journalLink.pageId,
    x: notePosition.x,
    y: notePosition.y,
    iconSize: SYSTEM_NOTE_ICON_SIZE,
    text: system.displayName,
    fontSize: SYSTEM_NOTE_FONT_SIZE,
    textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
    global: true,
    texture: {
      src: SYSTEM_NOTE_ICON,
      anchorX: 0.5,
      anchorY: 0.5,
      fit: "contain"
    },
    flags: {
      [MODULE_ID]: {
        generatedSystemNote: true,
        hex: system.hex,
        subsectorIndex: system.subsectorIndex,
        sectorName: system.sector
      }
    }
  };
}
function formatJournalEntryName(subsectorName, _sectorName, milieu) {
  const defaultMilieu = milieu === "M1105";
  const baseName = formatLocalize("Journals.EntryName", { subsector: subsectorName });
  if (defaultMilieu) {
    return baseName;
  }
  return formatLocalize("Journals.EntryNameWithMilieu", {
    subsector: subsectorName,
    milieu
  });
}

// src/services/scenecreation.ts
function createLevelBackgroundData(src) {
  return {
    src,
    tint: "#ffffff",
    alphaThreshold: 0,
    color: 0
  };
}
async function configureSceneLevel(scene, sector, posterUrl) {
  const sceneWithLevels = scene;
  const background = createLevelBackgroundData(posterUrl);
  const existingLevel = sceneWithLevels.initialLevel ?? sceneWithLevels.firstLevel;
  if (existingLevel) {
    await existingLevel.update({
      name: formatLocalize("Scene.Name", { name: sector.name }),
      background
    });
    return existingLevel;
  }
  const [createdLevel] = await sceneWithLevels.createEmbeddedDocuments("Level", [
    {
      name: formatLocalize("Scene.Name", { name: sector.name }),
      sort: 0,
      background
    }
  ]);
  if (!createdLevel) {
    throw new Error(localize("Errors.SceneLevelMissing"));
  }
  return createdLevel;
}
async function createSectorScene(sector, posterOptions = {}, systemNoteOptions = DEFAULT_SYSTEM_NOTE_OPTIONS) {
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
  };
  const scene = await Scene.create(sceneData);
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
  });
  await scene.activate();
  return scene;
}

// src/ui/sector-search-app.ts
var SectorSearchApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);
var SectorSearchApplication = class extends SectorSearchApplicationBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: `${MODULE_ID}-sector-search`,
      classes: [MODULE_ID],
      tag: "section",
      window: {
        title: localize("Search.WindowTitle"),
        icon: "fa-solid fa-hexagon-image"
      },
      position: {
        width: 560
      }
    },
    { inplace: false }
  );
  static PARTS = {
    content: {
      template: SECTOR_SEARCH_TEMPLATE_PATH
    }
  };
  #query = "";
  #results = [];
  #selectedKey = null;
  #isLoading = false;
  #isCreating = false;
  #error = null;
  #posterOptions = { ...DEFAULT_POSTER_OPTIONS };
  #systemNoteOptions = { ...DEFAULT_SYSTEM_NOTE_OPTIONS };
  #posterOptionsExpanded = false;
  async _prepareContext(options) {
    await super._prepareContext(options);
    const context = {
      query: this.#query,
      results: this.#results.map((result) => this.#toResultViewModel(result)),
      hasResults: this.#results.length > 0,
      canCreate: Boolean(this.#selectedSector) && !this.#isCreating,
      isLoading: this.#isLoading,
      isCreating: this.#isCreating,
      error: this.#error,
      posterOptions: this.#toPosterOptionsViewModel(),
      systemNotes: this.#toSystemNotesViewModel()
    };
    return context;
  }
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    const searchInput = htmlElement.querySelector('input[name="query"]');
    searchInput?.addEventListener("input", (event) => {
      this.#query = event.currentTarget.value;
    });
    searchInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.#executeSearch();
      }
    });
    const searchButton = htmlElement.querySelector('[data-action="search"]');
    searchButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#executeSearch();
    });
    htmlElement.querySelectorAll('input[name="sector"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.#selectedKey = input.value;
      });
    });
    const posterOptionsDetails = htmlElement.querySelector('[data-role="poster-options"]');
    posterOptionsDetails?.addEventListener("toggle", () => {
      this.#posterOptionsExpanded = posterOptionsDetails.open;
    });
    const styleSelect = htmlElement.querySelector('select[name="poster-style"]');
    styleSelect?.addEventListener("change", (event) => {
      this.#posterOptions.style = event.currentTarget.value;
    });
    const milieuSelect = htmlElement.querySelector('select[name="poster-milieu"]');
    milieuSelect?.addEventListener("change", (event) => {
      const selectedMilieu = event.currentTarget.value.trim();
      this.#posterOptions.milieu = selectedMilieu || void 0;
    });
    const routesInput = htmlElement.querySelector('input[name="poster-routes"]');
    routesInput?.addEventListener("change", (event) => {
      this.#posterOptions.routes = event.currentTarget.checked;
    });
    const gridInput = htmlElement.querySelector('input[name="poster-show-grid"]');
    gridInput?.addEventListener("change", (event) => {
      this.#posterOptions.noGrid = !event.currentTarget.checked;
    });
    const bordersInput = htmlElement.querySelector('input[name="poster-show-borders"]');
    bordersInput?.addEventListener("change", (event) => {
      this.#posterOptions.showBorders = event.currentTarget.checked;
    });
    const sectorSubsectorNamesInput = htmlElement.querySelector('input[name="poster-show-sector-subsector-names"]');
    sectorSubsectorNamesInput?.addEventListener("change", (event) => {
      this.#posterOptions.showSectorSubsectorNames = event.currentTarget.checked;
    });
    const labelsInput = htmlElement.querySelector('input[name="poster-show-labels"]');
    labelsInput?.addEventListener("change", (event) => {
      this.#posterOptions.showLabels = event.currentTarget.checked;
    });
    const systemNotesInput = htmlElement.querySelector('input[name="generate-system-notes"]');
    systemNotesInput?.addEventListener("change", (event) => {
      this.#systemNoteOptions.generateSystemNotes = event.currentTarget.checked;
    });
    const createButton = htmlElement.querySelector('[data-action="create-sector-scene"]');
    createButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#createSectorScene();
    });
  }
  get #selectedSector() {
    return this.#results.find((result) => result.key === this.#selectedKey) ?? null;
  }
  #toResultViewModel(result) {
    return {
      key: result.key,
      name: result.name,
      coordinateText: formatLocalize("Search.Coordinates", { x: result.sectorX, y: result.sectorY }),
      tagText: result.tags.length > 0 ? result.tags.join(" \xB7 ") : localize("Search.NoTags"),
      isSelected: result.key === this.#selectedKey
    };
  }
  #toPosterOptionsViewModel() {
    const defaultMilieuOption = {
      value: "",
      label: localize("Search.PosterOptions.Milieu.DefaultOption")
    };
    return {
      styleOptions: this.#toChoiceViewModels(POSTER_STYLE_OPTIONS, this.#posterOptions.style),
      milieuOptions: this.#toChoiceViewModels(
        [defaultMilieuOption, ...POSTER_MILIEU_OPTIONS.map((milieu) => ({ value: milieu, label: milieu }))],
        this.#posterOptions.milieu ?? ""
      ),
      routes: this.#posterOptions.routes,
      showGrid: !this.#posterOptions.noGrid,
      showBorders: this.#posterOptions.showBorders,
      showSectorSubsectorNames: this.#posterOptions.showSectorSubsectorNames,
      showLabels: this.#posterOptions.showLabels,
      isExpanded: this.#posterOptionsExpanded
    };
  }
  #toSystemNotesViewModel() {
    return {
      generateSystemNotes: this.#systemNoteOptions.generateSystemNotes
    };
  }
  #toChoiceViewModels(options, selectedValue) {
    return options.map((option) => ({
      ...option,
      selected: option.value === selectedValue
    }));
  }
  async #executeSearch() {
    const trimmedQuery = this.#query.trim();
    if (!trimmedQuery) {
      this.#results = [];
      this.#selectedKey = null;
      this.#error = localize("Search.Errors.EnterQuery");
      await this.render({ force: true });
      return;
    }
    this.#isLoading = true;
    this.#error = null;
    await this.render({ force: true });
    try {
      const results = await travellerMapService.searchSectors(trimmedQuery);
      this.#results = results;
      this.#selectedKey = results[0]?.key ?? null;
      this.#error = results.length === 0 ? formatLocalize("Search.Errors.NoResults", { query: trimmedQuery }) : null;
    } catch (error) {
      console.error(`${MODULE_ID} | TravellerMap search failed`, error);
      this.#results = [];
      this.#selectedKey = null;
      this.#error = error instanceof Error ? error.message : localize("Errors.SearchFailed");
    } finally {
      this.#isLoading = false;
      await this.render({ force: true });
    }
  }
  async #createSectorScene() {
    const selectedSector = this.#selectedSector;
    if (!selectedSector) {
      this.#error = localize("Search.Errors.ChooseSector");
      await this.render({ force: true });
      return;
    }
    this.#isCreating = true;
    this.#error = null;
    await this.render({ force: true });
    try {
      const scene = await createSectorScene(selectedSector, {
        ...this.#posterOptions,
        compositing: true
      }, this.#systemNoteOptions);
      ui.notifications?.info(formatLocalize("Notifications.CreatedScene", { name: scene.name }));
      await this.close();
    } catch (error) {
      console.error(`${MODULE_ID} | Scene creation failed`, error);
      this.#error = error instanceof Error ? error.message : localize("Errors.SceneCreationFailed");
      ui.notifications?.error(this.#error);
    } finally {
      this.#isCreating = false;
      if (this.rendered) {
        await this.render({ force: true });
      }
    }
  }
};

// src/hooks.ts
var sectorSearchApplication = null;
var SIDEBAR_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-sidebar-launcher`;
function openSectorSearchApplication() {
  sectorSearchApplication ??= new SectorSearchApplication();
  void sectorSearchApplication.render({ force: true });
}
function injectSidebarLauncher(element) {
  if (element.querySelector(`[${SIDEBAR_LAUNCHER_ATTRIBUTE}]`)) {
    return;
  }
  const actionContainer = element.querySelector(".header-actions, .action-buttons, .directory-header");
  if (!actionContainer) {
    return;
  }
  const launcherButton = document.createElement("button");
  launcherButton.type = "button";
  launcherButton.className = "traveller-scenes__sidebar-launcher";
  launcherButton.setAttribute(SIDEBAR_LAUNCHER_ATTRIBUTE, "true");
  launcherButton.innerHTML = '<i class="fa-solid fa-earth-americas" aria-hidden="true"></i>';
  const launcherLabel = document.createElement("span");
  launcherLabel.textContent = localize("Sidebar.CreateScene");
  launcherButton.append(launcherLabel);
  launcherButton.addEventListener("click", () => {
    openSectorSearchApplication();
  });
  actionContainer.prepend(launcherButton);
}
function registerHooks() {
  Hooks.on("renderSceneDirectory", (_application, element) => {
    if (!game.user?.isGM) {
      return;
    }
    injectSidebarLauncher(element);
  });
}

// src/module.ts
Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing ${MODULE_TITLE}`);
  registerHooks();
});
Hooks.once("ready", () => {
  console.info(`${MODULE_ID} | Ready`);
});
//# sourceMappingURL=module.mjs.map
