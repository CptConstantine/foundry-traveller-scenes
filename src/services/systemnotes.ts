import {
  JOURNAL_FOLDER_SORTING,
  MODULE_ID,
  SYSTEM_NOTE_FONT_SIZE,
  SYSTEM_NOTE_ICON,
  SYSTEM_NOTE_ICON_SIZE
} from "../config/constants.js";
import { getHexCenterPoint } from "./hexgridalignment.js";
import { travellerMapService } from "./travellermap.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  CalibratedGridConfig,
  TravellerPosterOptions,
  TravellerSectorMetadata,
  TravellerSectorSelection,
  TravellerSectorSystem,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

interface SystemJournalFlagData {
  kind: "subsector-journal";
  sectorName: string;
  subsectorIndex: string;
  milieu: string;
}

interface SystemPageFlagData {
  kind: "system-page";
  hex: string;
  sectorName: string;
  subsectorIndex: string;
  milieu: string;
}

export interface GeneratedSystemNotesSummary {
  createdNotes: number;
  touchedJournals: number;
}

const TRADE_CODE_TOKENS = new Set([
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

function getModuleFlag<T>(document: { flags: object | undefined }, key: string): T | undefined {
  const flags = document.flags as Record<string, Record<string, unknown>> | undefined;
  const scopeFlags = flags?.[MODULE_ID];

  if (!scopeFlags) {
    return undefined;
  }

  return scopeFlags[key] as T | undefined;
}

export async function generateSystemJournalsAndNotes(
  scene: Scene,
  sector: TravellerSectorSelection,
  grid: CalibratedGridConfig,
  posterOptions: TravellerPosterOptions,
  noteOptions: TravellerSystemNoteOptions
): Promise<GeneratedSystemNotesSummary> {
  if (!noteOptions.generateSystemNotes) {
    return {
      createdNotes: 0,
      touchedJournals: 0
    };
  }

  const metadata = await travellerMapService.getSectorMetadata(sector, posterOptions);
  const systems = await travellerMapService.getSectorSystems(sector, metadata, posterOptions);
  const relevantSystems = sector.kind === "subsector" && sector.subsectorIndex
    ? systems.filter((system) => system.subsectorIndex === sector.subsectorIndex)
    : systems;

  if (relevantSystems.length === 0) {
    return {
      createdNotes: 0,
      touchedJournals: 0
    };
  }

  const rootFolder = await ensureJournalFolder(localize("Journals.RootFolder"), null);
  const sectorFolder = await ensureJournalFolder(metadata.sectorName, rootFolder);
  const systemsBySubsector = groupSystemsBySubsector(relevantSystems);
  const pageLinks = new Map<string, { entryId: string; pageId: string }>();
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

  const existingGeneratedNotes = scene.notes.contents
    .filter((note) => Boolean(getModuleFlag(note, "generatedSystemNote")))
    .flatMap((note) => note.id ? [note.id] : []);

  if (existingGeneratedNotes.length > 0) {
    await scene.deleteEmbeddedDocuments("Note", existingGeneratedNotes);
  }

  if (sector.source === "generated") {
    return {
      createdNotes: 0,
      touchedJournals
    };
  }

  const noteData = relevantSystems
    .map((system) => buildSceneNoteData(system, sector, grid, pageLinks.get(system.hex)))
    .filter((note): note is NoteDocument.CreateData => note !== null);

  if (noteData.length > 0) {
    await scene.createEmbeddedDocuments("Note", noteData);
  }

  return {
    createdNotes: noteData.length,
    touchedJournals
  };
}

async function ensureJournalFolder(name: string, parent: Folder | null): Promise<Folder> {
  const existing = game.folders?.contents.find((folder) =>
    folder.type === "JournalEntry"
    && folder.name === name
    && (folder.folder?.id ?? null) === (parent?.id ?? null)
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

function groupSystemsBySubsector(
  systems: TravellerSectorSystem[]
): Map<string, TravellerSectorSystem[]> {
  const groups = new Map<string, TravellerSectorSystem[]>();

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

async function ensureSubsectorJournalEntry(
  folder: Folder,
  metadata: TravellerSectorMetadata,
  subsectorIndex: string,
  systems: TravellerSectorSystem[],
  posterOptions: TravellerPosterOptions
): Promise<JournalEntry> {
  const subsectorName = systems[0]?.subsectorName ?? subsectorIndex;
  const milieu = posterOptions.milieu ?? metadata.milieu ?? "M1105";
  const flagData: SystemJournalFlagData = {
    kind: "subsector-journal",
    sectorName: metadata.sectorName,
    subsectorIndex,
    milieu
  };

  const existing = game.journal?.contents.find((entry) => {
    const flag = getModuleFlag<Partial<SystemJournalFlagData>>(entry, "systemNoteJournal");
    return flag?.kind === flagData.kind
      && flag.sectorName === flagData.sectorName
      && flag.subsectorIndex === flagData.subsectorIndex
      && flag.milieu === flagData.milieu;
  });

  const entryName = formatJournalEntryName(subsectorName, metadata.sectorName, milieu);
  const entry = existing ?? await JournalEntry.create({
    name: entryName,
    folder: folder.id,
    flags: {
      [MODULE_ID]: {
        systemNoteJournal: flagData
      }
    } as never
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

  const updates: JournalEntryPage.UpdateData[] = [];
  const creations: JournalEntryPage.CreateData[] = [];

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

function findSystemPage(entry: JournalEntry, hex: string): JournalEntryPage | null {
  return entry.pages.contents.find((page) => {
    const flag = getModuleFlag<Partial<SystemPageFlagData>>(page, "systemPage");
    return flag?.kind === "system-page" && flag.hex === hex;
  }) ?? null;
}

function buildJournalPageData(
  system: TravellerSectorSystem,
  sectorName: string,
  milieu: string,
  sort: number
): JournalEntryPage.CreateData {
  const flagData: SystemPageFlagData = {
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
    } as never
  };
}

function renderBasicSystemPage(system: TravellerSectorSystem, sectorName: string): string {
  const escape = foundry.utils.escapeHTML;
  const overviewParagraphs = buildOverviewParagraphs(system, sectorName)
    .map((paragraph) => `<p>${escape(paragraph)}</p>`)
    .join("");

  const profileRows = buildProfileRows(system)
    .map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`)
    .join("");

  const tradeCodeItems = buildTradeCodeItems(system)
    .map((item) => `<li>${escape(item)}</li>`)
    .join("");

  const classificationItems = buildClassificationItems(system)
    .map((item) => `<li>${escape(item)}</li>`)
    .join("");

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

  const rawDetailRows = rawDetails
    .map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`)
    .join("");

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

function buildOverviewParagraphs(system: TravellerSectorSystem, sectorName: string): string[] {
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

function buildProfileRows(system: TravellerSectorSystem): Array<[string, string]> {
  const uwp = parseUwp(system.uwp);
  const rows: Array<[string, string]> = [];

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

function buildClassificationItems(system: TravellerSectorSystem): string[] {
  const items = getRemarkTokens(system.remarks)
    .filter((token) => !isTradeCodeToken(token))
    .map((token) => describeRemarkToken(token));

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

function buildTradeCodeItems(system: TravellerSectorSystem): string[] {
  return getRemarkTokens(system.remarks)
    .filter((token) => isTradeCodeToken(token))
    .map((token) => formatTradeCode(token));
}

function formatTradeCode(token: string): string {
  return `${token} (${describeRemarkToken(token)})`;
}

function parseUwp(uwp: string): {
  starport: string;
  size: string;
  atmosphere: string;
  hydrographics: string;
  population: string;
  government: string;
  lawLevel: string;
  techLevel: string;
} | null {
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

function decodeEHex(value: string): number | null {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const index = alphabet.indexOf(normalized);

  return index >= 0 ? index : null;
}

function describeStarport(code: string): string {
  const descriptions: Record<string, string> = {
    A: localize("Journals.Starport.A"),
    B: localize("Journals.Starport.B"),
    C: localize("Journals.Starport.C"),
    D: localize("Journals.Starport.D"),
    E: localize("Journals.Starport.E"),
    X: localize("Journals.Starport.X")
  };

  return descriptions[code.toUpperCase()] ?? formatLocalize("Journals.GenericCode", { code });
}

function describeSize(code: string): string {
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

function describeAtmosphere(code: string): string {
  const descriptions: Record<string, string> = {
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

function describeHydrographics(code: string): string {
  const value = decodeEHex(code);
  if (value === null) {
    return formatLocalize("Journals.GenericCode", { code });
  }

  const percentage = Math.min(value, 10) * 10;
  return formatLocalize("Journals.Hydrographics.Description", { code, percentage });
}

function describePopulation(code: string): string {
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

function describeGovernment(code: string): string {
  const descriptions: Record<string, string> = {
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

function describeLawLevel(code: string): string {
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

function describeTechLevel(code: string): string {
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

function describePbg(pbg: string): string | null {
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

function describeTravelZone(zone: string): string {
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

function describeRemarkTokens(remarks: string): string[] {
  return getRemarkTokens(remarks)
    .map((token) => describeRemarkToken(token));
}

function getRemarkTokens(remarks: string): string[] {
  return remarks
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isTradeCodeToken(token: string): boolean {
  return TRADE_CODE_TOKENS.has(token);
}

function describeRemarkToken(token: string): string {
  const descriptions: Record<string, string> = {
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

function buildSceneNoteData(
  system: TravellerSectorSystem,
  sector: TravellerSectorSelection,
  grid: CalibratedGridConfig,
  journalLink: { entryId: string; pageId: string } | undefined
): NoteDocument.CreateData | null {
  if (!journalLink) {
    return null;
  }

  const notePosition = sector.kind === "subsector"
    ? getHexCenterPoint(grid, system.localHexX, system.localHexY)
    : getHexCenterPoint(grid, system.hexX, system.hexY);

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
    } as never
  };
}

function formatJournalEntryName(subsectorName: string, _sectorName: string, milieu: string): string {
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