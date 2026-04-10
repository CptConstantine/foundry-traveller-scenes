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
var SYSTEM_TILE_STORAGE_PATH = `assets/${MODULE_ID}/system-tiles`;
var GENERATED_SYSTEM_TILE_SIZE_RATIO = 1;
var GENERATED_SYSTEM_TILE_RENDER_SCALE = 200;
var SECTOR_SEARCH_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/sector-search-app.hbs`;
var GENERATED_SYSTEM_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/generated-system-app.hbs`;
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

// src/services/generatedtraveller.ts
var EHEX_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var GENERATED_SUBSECTOR_INDEX = "A";
var GENERATED_HEX_X = 4;
var GENERATED_HEX_Y = 5;
var NAME_PREFIXES = [
  "Ala",
  "Ar",
  "Bel",
  "Cor",
  "Dra",
  "Eri",
  "Fal",
  "Gal",
  "Hel",
  "Ira",
  "Jan",
  "Kel",
  "Lor",
  "Mer",
  "Nor",
  "Or",
  "Pra",
  "Qua",
  "Ryl",
  "Sol",
  "Tal",
  "Ur",
  "Val",
  "Wes",
  "Xan",
  "Yor",
  "Zer"
];
var NAME_SUFFIXES = [
  "aris",
  "ath",
  "ea",
  "eus",
  "ia",
  "ion",
  "ora",
  "os",
  " Prime",
  " Reach",
  "on",
  "or",
  "ara",
  "is",
  "um",
  "e",
  "ara",
  "ai"
];
var SECTOR_SUFFIXES = ["Sector", "Reach", "March", "Expanse", "Frontier"];
var SUBSECTOR_SUFFIXES = ["Subsector", "Cluster", "Drift", "Main"];
var TAB_DELIMITED_HEADERS = [
  "Sector",
  "SS",
  "Hex",
  "Name",
  "UWP",
  "Bases",
  "Remarks",
  "Zone",
  "PBG",
  "Allegiance",
  "Stars",
  "{Ix}",
  "(Ex)",
  "[Cx]",
  "Nobility",
  "W",
  "RU"
];
var SeededRandom = class {
  #state;
  constructor(seed) {
    this.#state = this.#hash(seed);
  }
  next() {
    this.#state += 1831565813;
    let t = this.#state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick(values) {
    return values[this.int(0, values.length - 1)];
  }
  chance(probability) {
    return this.next() < probability;
  }
  rollDice(count, sides) {
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      total += this.int(1, sides);
    }
    return total;
  }
  #hash(value) {
    let hash = 1779033703 ^ value.length;
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
      hash = hash << 13 | hash >>> 19;
    }
    return hash >>> 0 || 1;
  }
};
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function toEHex(value) {
  return EHEX_ALPHABET[Math.max(0, Math.min(value, EHEX_ALPHABET.length - 1))] ?? "0";
}
function generateSeed() {
  return `seed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function generateName(random) {
  const prefix = random.pick(NAME_PREFIXES);
  const suffix = random.pick(NAME_SUFFIXES);
  const maybeMiddle = random.chance(0.25) ? `${random.pick(["n", "l", "r", "th", "v"])}` : "";
  return `${prefix}${maybeMiddle}${suffix}`.replace(/\s+/g, " ").trim();
}
function generateSectorName(random) {
  return `${generateName(random)} ${random.pick(SECTOR_SUFFIXES)}`;
}
function generateSubsectorName(random) {
  return `${generateName(random)} ${random.pick(SUBSECTOR_SUFFIXES)}`;
}
function createSectorAbbreviation(sectorName) {
  const letters = sectorName.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 4) || "GENR").padEnd(4, "X");
}
function generateUwp(random) {
  const size = clamp(random.rollDice(2, 6) - 2, 0, 10);
  const atmosphere = clamp(size + random.rollDice(2, 6) - 7, 0, 15);
  let hydrographics = clamp(atmosphere + random.rollDice(2, 6) - 7, 0, 10);
  if (size <= 1) {
    hydrographics = 0;
  }
  if (atmosphere <= 1 || atmosphere >= 10) {
    hydrographics = clamp(hydrographics - 4, 0, 10);
  }
  const population = clamp(random.rollDice(2, 6) - 2, 0, 10);
  const government = population === 0 ? 0 : clamp(population + random.rollDice(2, 6) - 7, 0, 15);
  const lawLevel = population === 0 ? 0 : clamp(government + random.rollDice(2, 6) - 7, 0, 15);
  const starportRoll = random.rollDice(2, 6);
  const starport = starportRoll <= 2 ? "X" : starportRoll <= 4 ? "E" : starportRoll <= 6 ? "D" : starportRoll <= 8 ? "C" : starportRoll <= 10 ? "B" : "A";
  let techLevel = random.int(1, 6);
  techLevel += starport === "A" ? 6 : starport === "B" ? 4 : starport === "C" ? 2 : starport === "X" ? -4 : 0;
  techLevel += size <= 1 ? 2 : size <= 4 ? 1 : 0;
  techLevel += atmosphere <= 3 || atmosphere >= 10 ? 1 : 0;
  techLevel += hydrographics === 0 || hydrographics === 9 ? 1 : hydrographics === 10 ? 2 : 0;
  techLevel += population >= 1 && population <= 5 ? 1 : population === 9 ? 2 : population === 10 ? 4 : 0;
  techLevel += government === 0 || government === 5 ? 1 : government === 7 ? 2 : government >= 13 ? -2 : 0;
  techLevel = clamp(techLevel, 0, 15);
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
function formatUwp(uwp) {
  return [
    uwp.starport,
    toEHex(uwp.size),
    toEHex(uwp.atmosphere),
    toEHex(uwp.hydrographics),
    toEHex(uwp.population),
    toEHex(uwp.government),
    toEHex(uwp.lawLevel),
    "-",
    toEHex(uwp.techLevel)
  ].join("");
}
function generateBases(random, starport) {
  const bases = /* @__PURE__ */ new Set();
  if ((starport === "A" || starport === "B") && random.chance(0.45)) {
    bases.add("N");
  }
  if (["A", "B", "C"].includes(starport) && random.chance(0.55)) {
    bases.add("S");
  }
  if (starport === "A" && random.chance(0.15)) {
    bases.add("R");
  }
  return Array.from(bases).join("");
}
function generatePbg(random, population) {
  const populationMultiplier = population === 0 ? 0 : random.int(1, 9);
  const belts = random.int(0, 4);
  const gasGiants = random.int(0, 4);
  return `${populationMultiplier}${toEHex(belts)}${toEHex(gasGiants)}`;
}
function generateTravelZone(random, uwp) {
  if (uwp.population === 0) {
    return "";
  }
  if (uwp.lawLevel >= 10 && uwp.government >= 10 || uwp.atmosphere >= 12 && uwp.hydrographics >= 1) {
    return random.chance(0.2) ? "R" : "A";
  }
  if (uwp.techLevel <= 3 && random.chance(0.15)) {
    return "A";
  }
  return "";
}
function generateAllegiance(random) {
  return random.chance(0.75) ? "Na" : "--";
}
function generateStellarData(random) {
  const spectralClass = random.pick(["M", "M", "M", "K", "K", "G", "F", "A"]);
  const spectralDecimal = random.int(0, 9);
  const luminosity = random.pick(["V", "V", "V", "V", "IV", "III", "D"]);
  const primary = `${spectralClass}${spectralDecimal} ${luminosity}`;
  if (!random.chance(0.28)) {
    return primary;
  }
  const companionClass = random.pick(["M", "M", "K", "G", "D"]);
  const companionDecimal = companionClass === "D" ? "" : String(random.int(0, 9));
  const companionLuminosity = companionClass === "D" ? "" : ` ${random.pick(["V", "VI", "D"])}`;
  return `${primary} ${companionClass}${companionDecimal}${companionLuminosity}`.trim();
}
function generateWorldCount(random) {
  return String(random.int(1, 10));
}
function calculateImportance(uwp, starport, remarks) {
  let score = 0;
  if (starport === "A" || starport === "B") {
    score += 1;
  }
  if (starport === "D" || starport === "E" || starport === "X") {
    score -= 1;
  }
  if (uwp.techLevel >= 10) {
    score += 1;
  }
  if (uwp.techLevel <= 8) {
    score -= 1;
  }
  if (uwp.population >= 8) {
    score += 1;
  }
  if (uwp.population <= 6) {
    score -= 1;
  }
  if (remarks.includes("Ag")) {
    score += 1;
  }
  if (remarks.includes("In")) {
    score += 1;
  }
  return `{ ${score >= 0 ? score : `-${Math.abs(score)}`} }`;
}
function calculateEconomics(random, pbg, uwp, importance) {
  const resources = clamp((parseInt(pbg[1] ?? "0", 36) || 0) + (parseInt(pbg[2] ?? "0", 36) || 0), 0, 15);
  const labor = clamp(Math.max(0, uwp.population - 1), 0, 15);
  const infrastructure = clamp((uwp.population === 0 ? 0 : uwp.population) + random.int(-1, 2), 0, 15);
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;
  const efficiency = clamp(random.int(-3, 3) + importanceValue, -5, 5);
  const efficiencyPrefix = efficiency >= 0 ? `+${efficiency}` : String(efficiency);
  return `(${toEHex(resources)}${toEHex(labor)}${toEHex(infrastructure)}${efficiencyPrefix})`;
}
function calculateCulture(random, uwp) {
  const heterogeneity = clamp(uwp.population + random.int(-2, 2), 0, 15);
  const acceptance = clamp(uwp.population + random.int(-3, 1), 0, 15);
  const strangeness = clamp(random.int(1, 10), 0, 15);
  const symbols = clamp(random.int(0, 15), 0, 15);
  return `[${toEHex(heterogeneity)}${toEHex(acceptance)}${toEHex(strangeness)}${toEHex(symbols)}]`;
}
function calculateNobility(importance) {
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;
  if (importanceValue >= 4) {
    return "BcC";
  }
  if (importanceValue >= 2) {
    return "Bc";
  }
  return importanceValue >= 1 ? "B" : "";
}
function calculateResourceUnits(random, importance) {
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;
  return String(Math.max(0, random.int(1, 6) + importanceValue));
}
function buildTradeCodes(uwp) {
  const codes = [];
  if (uwp.atmosphere >= 4 && uwp.atmosphere <= 9 && uwp.hydrographics >= 4 && uwp.hydrographics <= 8 && uwp.population >= 5 && uwp.population <= 7) {
    codes.push("Ag");
  }
  if (uwp.size === 0 && uwp.atmosphere === 0 && uwp.hydrographics === 0) {
    codes.push("As");
  }
  if (uwp.population === 0 && uwp.government === 0 && uwp.lawLevel === 0) {
    codes.push("Ba");
  }
  if (uwp.atmosphere >= 2 && uwp.hydrographics === 0) {
    codes.push("De");
  }
  if (uwp.atmosphere >= 10 && uwp.hydrographics >= 1) {
    codes.push("Fl");
  }
  if (uwp.size >= 6 && uwp.size <= 8 && [5, 6, 8].includes(uwp.atmosphere) && uwp.hydrographics >= 5 && uwp.hydrographics <= 7 && uwp.population >= 4 && uwp.population <= 8) {
    codes.push("Ga");
  }
  if (uwp.population >= 9) {
    codes.push("Hi");
  }
  if (uwp.techLevel >= 12) {
    codes.push("Ht");
  }
  if ([0, 1].includes(uwp.atmosphere) && uwp.hydrographics >= 1) {
    codes.push("Ic");
  }
  if ([0, 1, 2, 4, 7, 9].includes(uwp.atmosphere) && uwp.population >= 9) {
    codes.push("In");
  }
  if (uwp.population >= 1 && uwp.population <= 3) {
    codes.push("Lo");
  }
  if (uwp.techLevel <= 5) {
    codes.push("Lt");
  }
  if (uwp.atmosphere <= 3 && uwp.hydrographics <= 3 && uwp.population >= 6) {
    codes.push("Na");
  }
  if (uwp.population >= 4 && uwp.population <= 6) {
    codes.push("Ni");
  }
  if (uwp.atmosphere >= 2 && uwp.atmosphere <= 5 && uwp.hydrographics <= 3) {
    codes.push("Po");
  }
  if ([6, 8].includes(uwp.atmosphere) && uwp.population >= 6 && uwp.population <= 8 && uwp.government >= 4 && uwp.government <= 9) {
    codes.push("Ri");
  }
  if (uwp.atmosphere === 0) {
    codes.push("Va");
  }
  if (uwp.hydrographics === 10) {
    codes.push("Wa");
  }
  return Array.from(new Set(codes));
}
function buildPosterTabDelimitedData() {
  return `${TAB_DELIMITED_HEADERS.join("	")}
`;
}
function normalizeTabDelimitedField(value) {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}
function buildSystemTabDelimitedRow(system) {
  const fields = [
    system.sector,
    system.subsectorIndex,
    system.hex,
    system.name || system.displayName,
    system.uwp,
    system.bases,
    system.remarks,
    system.zone,
    system.pbg,
    system.allegiance,
    system.stars,
    system.importance,
    system.economics,
    system.culture,
    system.nobility,
    system.worlds,
    system.resourceUnits
  ];
  return fields.map((field) => normalizeTabDelimitedField(field ?? "")).join("	");
}
function buildGeneratedSystemJumpMapData(system) {
  return `${TAB_DELIMITED_HEADERS.join("	")}
${buildSystemTabDelimitedRow(system)}
`;
}
function buildMetadataXml(sectorName, subsectorName) {
  return [
    '<?xml version="1.0"?>',
    "<Sector>",
    `  <Name>${sectorName}</Name>`,
    "  <Subsectors>",
    `    <Subsector Index="${GENERATED_SUBSECTOR_INDEX}">${subsectorName}</Subsector>`,
    "  </Subsectors>",
    "</Sector>"
  ].join("\n");
}
function createGeneratedContent(seed, metadata, system) {
  return {
    seed,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    metadata,
    systems: [system],
    poster: {
      data: buildPosterTabDelimitedData(),
      metadata: buildMetadataXml(metadata.sectorName, system.subsectorName)
    }
  };
}
var GeneratedTravellerService = class {
  generateRandomSystemSelection(options = {}) {
    const seed = options.seed?.trim() || generateSeed();
    const random = new SeededRandom(seed);
    const sectorName = generateSectorName(random);
    const subsectorName = generateSubsectorName(random);
    const worldName = options.name?.trim() || generateName(random);
    const abbreviation = createSectorAbbreviation(sectorName);
    const uwpParts = generateUwp(random);
    const remarks = buildTradeCodes(uwpParts);
    const pbg = generatePbg(random, uwpParts.population);
    const importance = calculateImportance(uwpParts, uwpParts.starport, remarks);
    const economics = calculateEconomics(random, pbg, uwpParts, importance);
    const culture = calculateCulture(random, uwpParts);
    const system = {
      sector: abbreviation,
      subsectorIndex: GENERATED_SUBSECTOR_INDEX,
      subsectorName,
      hex: `${String(GENERATED_HEX_X).padStart(2, "0")}${String(GENERATED_HEX_Y).padStart(2, "0")}`,
      hexX: GENERATED_HEX_X,
      hexY: GENERATED_HEX_Y,
      localHexX: GENERATED_HEX_X,
      localHexY: GENERATED_HEX_Y,
      name: worldName,
      displayName: worldName,
      uwp: formatUwp(uwpParts),
      bases: generateBases(random, uwpParts.starport),
      remarks: remarks.join(" "),
      zone: generateTravelZone(random, uwpParts),
      pbg,
      allegiance: generateAllegiance(random),
      stars: generateStellarData(random),
      importance,
      economics,
      culture,
      nobility: calculateNobility(importance),
      worlds: generateWorldCount(random),
      resourceUnits: calculateResourceUnits(random, importance)
    };
    const metadata = {
      sectorName,
      abbreviation,
      milieu: options.milieu ?? "M1105",
      subsectorNames: {
        [GENERATED_SUBSECTOR_INDEX]: subsectorName
      }
    };
    const generatedContent = createGeneratedContent(seed, metadata, system);
    return {
      key: `generated::system::${seed}`,
      name: `${worldName} System`,
      sectorX: 0,
      sectorY: 0,
      tags: ["Generated", `Seed ${seed}`],
      source: "generated",
      kind: "subsector",
      sectorName,
      subsectorIndex: GENERATED_SUBSECTOR_INDEX,
      dimensions: {
        columns: SUBSECTOR_HEX_COLUMNS,
        rows: SUBSECTOR_HEX_ROWS
      },
      generatedContent
    };
  }
};
var generatedTravellerService = new GeneratedTravellerService();

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
    this.applyPosterRenderParameters(url, resolvedOptions);
    return url.toString();
  }
  async getPosterImageInfo(sector, options = {}) {
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
  async getSectorMetadata(sector, options = {}) {
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
  async fetchGeneratedJumpMapBlob(sector, system, options = {}) {
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
      source: "travellermap",
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
  getGeneratedContent(sector) {
    if (sector.source !== "generated") {
      return null;
    }
    if (!sector.generatedContent) {
      throw new Error(localize("Errors.GeneratedContentMissing"));
    }
    return sector.generatedContent;
  }
  async fetchPosterBlobForSelection(sector, options) {
    const generatedContent = this.getGeneratedContent(sector);
    if (generatedContent) {
      return await this.fetchGeneratedPosterBlob(sector, options, generatedContent);
    }
    return await this.fetchPosterBlob(this.buildPosterUrl(sector, options));
  }
  async fetchGeneratedPosterBlob(sector, options, generatedContent) {
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
  applyPosterRenderParameters(url, options) {
    url.searchParams.set("style", options.style);
    url.searchParams.set("scale", String(options.scale));
    if (options.compositing) {
      url.searchParams.set("compositing", "1");
    }
    const renderOptions = this.buildPosterRenderOptions(options);
    if (renderOptions !== void 0) {
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

// src/utils/geometry.ts
var HEX_HEIGHT_TO_WIDTH_RATIO = Math.sqrt(3) / 2;
function calculateFlatTopHexMetricsFromGridSize(gridSize) {
  const hexHeight = Math.max(1, gridSize);
  const hexWidth = hexHeight / HEX_HEIGHT_TO_WIDTH_RATIO;
  return {
    hexWidth,
    hexHeight,
    stepX: hexWidth * 0.75,
    stepY: hexHeight
  };
}
function calculateFlatTopHexMetricsFromImage(imageWidth, imageHeight, dimensions) {
  const normalizedHexHeight = imageHeight / (dimensions.rows + 0.5);
  return calculateFlatTopHexMetricsFromGridSize(normalizedHexHeight);
}

// src/services/generatedsystemtile.ts
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function getImageFileExtension(contentType) {
  if (contentType.includes("jpeg")) {
    return "jpg";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  return "png";
}
async function loadImageElementFromBlob(blob) {
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
function getOpaqueImageBounds(image, width, height) {
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
      const alpha = imageData[(y * width + x) * 4 + 3] ?? 0;
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
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1)
  };
}
async function cropGeneratedSystemTileImage(blob) {
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
  const croppedBlob = await new Promise((resolve, reject) => {
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
async function ensureStorageDirectory(filePicker) {
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
async function cacheGeneratedSystemTileImage(sector, system, tileRenderScale) {
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
async function createGeneratedSystemTile(scene, sector, options = {}) {
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
  const existingGeneratedTiles = scene.tiles.contents.filter((tile) => {
    const flags = tile.flags;
    return Boolean(flags?.[MODULE_ID]?.generatedSystemTile);
  }).flatMap((tile) => tile.id ? [tile.id] : []);
  if (options.replaceExisting && existingGeneratedTiles.length > 0) {
    await scene.deleteEmbeddedDocuments("Tile", existingGeneratedTiles);
  }
  const sceneData = scene.toObject();
  const sceneWidth = Number(sceneData.width ?? 0);
  const sceneHeight = Number(sceneData.height ?? 0);
  const sceneGrid = sceneData.grid;
  const gridSize = Math.max(50, Math.round(Number(options.gridSize ?? sceneGrid?.size ?? 100)));
  const centerX = Number(options.centerX ?? sceneWidth / 2);
  const centerY = Number(options.centerY ?? sceneHeight / 2);
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
      x: Math.round(centerX - tileWidth / 2),
      y: Math.round(centerY - tileHeight / 2),
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
  ]);
  if (!createdTile) {
    throw new Error(localize("Errors.SystemTileCreateFailed"));
  }
  return {
    createdTiles: 1,
    tileId: createdTile.id ?? null
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
  if (sector.source === "generated") {
    return {
      createdNotes: 0,
      touchedJournals
    };
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

// src/services/generatedsystemplacement.ts
function getCurrentScene() {
  const currentCanvas = typeof canvas === "undefined" ? null : canvas;
  const scene = currentCanvas?.scene;
  if (!scene) {
    throw new Error(localize("Errors.CurrentSceneMissing"));
  }
  return scene;
}
function createSceneGridSummary(scene) {
  const sceneData = scene.toObject();
  const grid = sceneData.grid;
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
async function placeGeneratedSystemOnCurrentScene(sector, systemNoteOptions = DEFAULT_SYSTEM_NOTE_OPTIONS) {
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
  });
  return {
    scene,
    createdTiles: tileSummary.createdTiles,
    tileId: tileSummary.tileId,
    touchedJournals: noteSummary.touchedJournals,
    createdNotes: noteSummary.createdNotes
  };
}

// src/ui/generated-system-app.ts
var GeneratedSystemApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);
var GeneratedSystemApplication = class extends GeneratedSystemApplicationBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: `${MODULE_ID}-generated-system`,
      classes: [MODULE_ID],
      tag: "section",
      window: {
        title: localize("Generator.WindowTitle"),
        icon: "fa-solid fa-star"
      },
      position: {
        width: 460
      }
    },
    { inplace: false }
  );
  static PARTS = {
    content: {
      template: GENERATED_SYSTEM_TEMPLATE_PATH
    }
  };
  #seed = "";
  #systemName = "";
  #milieu = "M1105";
  #isGenerating = false;
  #error = null;
  #systemNoteOptions = { ...DEFAULT_SYSTEM_NOTE_OPTIONS };
  async _prepareContext(options) {
    await super._prepareContext(options);
    const currentCanvas = typeof canvas === "undefined" ? null : canvas;
    const currentSceneName = currentCanvas?.scene?.name ?? null;
    const context = {
      seed: this.#seed,
      systemName: this.#systemName,
      currentSceneName,
      hasCurrentScene: Boolean(currentSceneName),
      isGenerating: this.#isGenerating,
      error: this.#error,
      milieuOptions: this.#toMilieuOptions(),
      systemNotes: this.#toSystemNotesViewModel()
    };
    return context;
  }
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    const seedInput = htmlElement.querySelector('input[name="generation-seed"]');
    seedInput?.addEventListener("input", (event) => {
      this.#seed = event.currentTarget.value;
    });
    const systemNameInput = htmlElement.querySelector('input[name="system-name"]');
    systemNameInput?.addEventListener("input", (event) => {
      this.#systemName = event.currentTarget.value;
    });
    const milieuSelect = htmlElement.querySelector('select[name="generation-milieu"]');
    milieuSelect?.addEventListener("change", (event) => {
      this.#milieu = event.currentTarget.value;
    });
    const systemNotesInput = htmlElement.querySelector('input[name="generate-system-notes"]');
    systemNotesInput?.addEventListener("change", (event) => {
      this.#systemNoteOptions.generateSystemNotes = event.currentTarget.checked;
    });
    const placeButton = htmlElement.querySelector('[data-action="place-generated-system"]');
    placeButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#placeGeneratedSystem();
    });
  }
  #toMilieuOptions() {
    return POSTER_MILIEU_OPTIONS.map((milieu) => ({
      value: milieu,
      label: milieu,
      selected: milieu === this.#milieu
    }));
  }
  #toSystemNotesViewModel() {
    return {
      generateSystemNotes: this.#systemNoteOptions.generateSystemNotes
    };
  }
  async #placeGeneratedSystem() {
    const currentCanvas = typeof canvas === "undefined" ? null : canvas;
    if (!currentCanvas?.scene) {
      this.#error = localize("Errors.CurrentSceneMissing");
      await this.render({ force: true });
      return;
    }
    this.#isGenerating = true;
    this.#error = null;
    await this.render({ force: true });
    try {
      const generatedSelection = generatedTravellerService.generateRandomSystemSelection({
        seed: this.#seed,
        name: this.#systemName,
        milieu: this.#milieu
      });
      this.#seed = generatedSelection.generatedContent?.seed ?? this.#seed;
      const summary = await placeGeneratedSystemOnCurrentScene(
        generatedSelection,
        this.#systemNoteOptions
      );
      ui.notifications?.info(formatLocalize("Notifications.GeneratedSystemPlaced", {
        scene: summary.scene.name
      }));
      ui.notifications?.info(formatLocalize("Notifications.GeneratedSystemTile", { name: generatedSelection.name }));
      await this.close();
    } catch (error) {
      console.error(`${MODULE_ID} | Generated system placement failed`, error);
      this.#error = error instanceof Error ? error.message : localize("Errors.GeneratedSystemPlacementFailed");
      ui.notifications?.error(this.#error);
    } finally {
      this.#isGenerating = false;
      if (this.rendered) {
        await this.render({ force: true });
      }
    }
  }
};

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
      isCreatingSelection: this.#isCreating,
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
var generatedSystemApplication = null;
var SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-scene-sidebar-launcher`;
var SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-generator-sidebar-launcher`;
function openSectorSearchApplication() {
  sectorSearchApplication ??= new SectorSearchApplication();
  void sectorSearchApplication.render({ force: true });
}
function openGeneratedSystemApplication() {
  generatedSystemApplication ??= new GeneratedSystemApplication();
  void generatedSystemApplication.render({ force: true });
}
function injectSidebarLauncher(element) {
  if (element.querySelector(`[${SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE}]`) || element.querySelector(`[${SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE}]`)) {
    return;
  }
  const actionContainer = element.querySelector(".header-actions, .action-buttons, .directory-header");
  if (!actionContainer) {
    return;
  }
  const createSceneButton = document.createElement("button");
  createSceneButton.type = "button";
  createSceneButton.className = "traveller-scenes__sidebar-launcher";
  createSceneButton.setAttribute(SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE, "true");
  createSceneButton.innerHTML = '<i class="fa-solid fa-earth-americas" aria-hidden="true"></i>';
  const createSceneLabel = document.createElement("span");
  createSceneLabel.textContent = localize("Sidebar.CreateScene");
  createSceneButton.append(createSceneLabel);
  createSceneButton.addEventListener("click", () => {
    openSectorSearchApplication();
  });
  const generateSystemButton = document.createElement("button");
  generateSystemButton.type = "button";
  generateSystemButton.className = "traveller-scenes__sidebar-launcher";
  generateSystemButton.setAttribute(SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE, "true");
  generateSystemButton.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
  const generateSystemLabel = document.createElement("span");
  generateSystemLabel.textContent = localize("Sidebar.GenerateSystem");
  generateSystemButton.append(generateSystemLabel);
  generateSystemButton.addEventListener("click", () => {
    openGeneratedSystemApplication();
  });
  actionContainer.prepend(generateSystemButton);
  actionContainer.prepend(createSceneButton);
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
