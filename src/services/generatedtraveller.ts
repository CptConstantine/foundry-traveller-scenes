import {
  SUBSECTOR_HEX_COLUMNS,
  SUBSECTOR_HEX_ROWS
} from "../config/constants.js";
import type {
  GeneratedTravellerContent,
  TravellerGeneratedSystemOptions,
  TravellerSectorMetadata,
  TravellerSectorSelection,
  TravellerSectorSystem
} from "../types/traveller.js";

const EHEX_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const GENERATED_SUBSECTOR_INDEX = "A";
const GENERATED_HEX_X = 4;
const GENERATED_HEX_Y = 5;

const NAME_PREFIXES = [
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
] as const;

const NAME_SUFFIXES = [
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
] as const;

const SECTOR_SUFFIXES = ["Sector", "Reach", "March", "Expanse", "Frontier"] as const;
const SUBSECTOR_SUFFIXES = ["Subsector", "Cluster", "Drift", "Main"] as const;
const TAB_DELIMITED_HEADERS = [
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
] as const;

interface GeneratedUwpParts {
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  lawLevel: number;
  techLevel: number;
}

class SeededRandom {
  #state: number;

  constructor(seed: string) {
    this.#state = this.#hash(seed);
  }

  next(): number {
    this.#state += 0x6d2b79f5;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  rollDice(count: number, sides: number): number {
    let total = 0;

    for (let index = 0; index < count; index += 1) {
      total += this.int(1, sides);
    }

    return total;
  }

  #hash(value: string): number {
    let hash = 1779033703 ^ value.length;

    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }

    return (hash >>> 0) || 1;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toEHex(value: number): string {
  return EHEX_ALPHABET[Math.max(0, Math.min(value, EHEX_ALPHABET.length - 1))] ?? "0";
}

function generateSeed(): string {
  return `seed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateName(random: SeededRandom): string {
  const prefix = random.pick(NAME_PREFIXES);
  const suffix = random.pick(NAME_SUFFIXES);
  const maybeMiddle = random.chance(0.25) ? `${random.pick(["n", "l", "r", "th", "v"] as const)}` : "";

  return `${prefix}${maybeMiddle}${suffix}`.replace(/\s+/g, " ").trim();
}

function generateSectorName(random: SeededRandom): string {
  return `${generateName(random)} ${random.pick(SECTOR_SUFFIXES)}`;
}

function generateSubsectorName(random: SeededRandom): string {
  return `${generateName(random)} ${random.pick(SUBSECTOR_SUFFIXES)}`;
}

function createSectorAbbreviation(sectorName: string): string {
  const letters = sectorName.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 4) || "GENR").padEnd(4, "X");
}

function generateUwp(random: SeededRandom): GeneratedUwpParts {
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
  const starport = starportRoll <= 2
    ? "X"
    : starportRoll <= 4
      ? "E"
      : starportRoll <= 6
        ? "D"
        : starportRoll <= 8
          ? "C"
          : starportRoll <= 10
            ? "B"
            : "A";

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

function formatUwp(uwp: GeneratedUwpParts): string {
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

function generateBases(random: SeededRandom, starport: string): string {
  const bases = new Set<string>();

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

function generatePbg(random: SeededRandom, population: number): string {
  const populationMultiplier = population === 0 ? 0 : random.int(1, 9);
  const belts = random.int(0, 4);
  const gasGiants = random.int(0, 4);

  return `${populationMultiplier}${toEHex(belts)}${toEHex(gasGiants)}`;
}

function generateTravelZone(random: SeededRandom, uwp: GeneratedUwpParts): string {
  if (uwp.population === 0) {
    return "";
  }

  if ((uwp.lawLevel >= 10 && uwp.government >= 10) || (uwp.atmosphere >= 12 && uwp.hydrographics >= 1)) {
    return random.chance(0.2) ? "R" : "A";
  }

  if (uwp.techLevel <= 3 && random.chance(0.15)) {
    return "A";
  }

  return "";
}

function generateAllegiance(random: SeededRandom): string {
  return random.chance(0.75) ? "Na" : "--";
}

function generateStellarData(random: SeededRandom): string {
  const spectralClass = random.pick(["M", "M", "M", "K", "K", "G", "F", "A"] as const);
  const spectralDecimal = random.int(0, 9);
  const luminosity = random.pick(["V", "V", "V", "V", "IV", "III", "D"] as const);
  const primary = `${spectralClass}${spectralDecimal} ${luminosity}`;

  if (!random.chance(0.28)) {
    return primary;
  }

  const companionClass = random.pick(["M", "M", "K", "G", "D"] as const);
  const companionDecimal = companionClass === "D" ? "" : String(random.int(0, 9));
  const companionLuminosity = companionClass === "D" ? "" : ` ${random.pick(["V", "VI", "D"] as const)}`;

  return `${primary} ${companionClass}${companionDecimal}${companionLuminosity}`.trim();
}

function generateWorldCount(random: SeededRandom): string {
  return String(random.int(1, 10));
}

function calculateImportance(uwp: GeneratedUwpParts, starport: string, remarks: string[]): string {
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

function calculateEconomics(random: SeededRandom, pbg: string, uwp: GeneratedUwpParts, importance: string): string {
  const resources = clamp((parseInt(pbg[1] ?? "0", 36) || 0) + (parseInt(pbg[2] ?? "0", 36) || 0), 0, 15);
  const labor = clamp(Math.max(0, uwp.population - 1), 0, 15);
  const infrastructure = clamp((uwp.population === 0 ? 0 : uwp.population) + random.int(-1, 2), 0, 15);
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;
  const efficiency = clamp(random.int(-3, 3) + importanceValue, -5, 5);

  const efficiencyPrefix = efficiency >= 0 ? `+${efficiency}` : String(efficiency);
  return `(${toEHex(resources)}${toEHex(labor)}${toEHex(infrastructure)}${efficiencyPrefix})`;
}

function calculateCulture(random: SeededRandom, uwp: GeneratedUwpParts): string {
  const heterogeneity = clamp(uwp.population + random.int(-2, 2), 0, 15);
  const acceptance = clamp(uwp.population + random.int(-3, 1), 0, 15);
  const strangeness = clamp(random.int(1, 10), 0, 15);
  const symbols = clamp(random.int(0, 15), 0, 15);

  return `[${toEHex(heterogeneity)}${toEHex(acceptance)}${toEHex(strangeness)}${toEHex(symbols)}]`;
}

function calculateNobility(importance: string): string {
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;

  if (importanceValue >= 4) {
    return "BcC";
  }

  if (importanceValue >= 2) {
    return "Bc";
  }

  return importanceValue >= 1 ? "B" : "";
}

function calculateResourceUnits(random: SeededRandom, importance: string): string {
  const importanceValue = Number.parseInt(importance.replace(/[^\-0-9]/g, ""), 10) || 0;
  return String(Math.max(0, random.int(1, 6) + importanceValue));
}

function buildTradeCodes(uwp: GeneratedUwpParts): string[] {
  const codes: string[] = [];

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

function buildPosterTabDelimitedData(): string {
  return `${TAB_DELIMITED_HEADERS.join("\t")}\n`;
}

function normalizeTabDelimitedField(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

function buildSystemTabDelimitedRow(system: TravellerSectorSystem): string {
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

  return fields
    .map((field) => normalizeTabDelimitedField(field ?? ""))
    .join("\t");
}

export function buildGeneratedSystemJumpMapData(system: TravellerSectorSystem): string {
  return `${TAB_DELIMITED_HEADERS.join("\t")}\n${buildSystemTabDelimitedRow(system)}\n`;
}

function buildMetadataXml(sectorName: string, subsectorName: string): string {
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

function createGeneratedContent(
  seed: string,
  metadata: TravellerSectorMetadata,
  system: TravellerSectorSystem
): GeneratedTravellerContent {
  return {
    seed,
    generatedAt: new Date().toISOString(),
    metadata,
    systems: [system],
    poster: {
      data: buildPosterTabDelimitedData(),
      metadata: buildMetadataXml(metadata.sectorName, system.subsectorName)
    }
  };
}

export class GeneratedTravellerService {
  generateRandomSystemSelection(
    options: TravellerGeneratedSystemOptions = {}
  ): TravellerSectorSelection {
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
    const system: TravellerSectorSystem = {
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

    const metadata: TravellerSectorMetadata = {
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
}

export const generatedTravellerService = new GeneratedTravellerService();
