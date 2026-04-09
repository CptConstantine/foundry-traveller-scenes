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
  const details = [
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

  const detailRows = details
    .map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`)
    .join("");

  return [
    `<section class="traveller-scenes__journal-page">`,
    `<p>${escape(formatLocalize("Journals.Description", {
      name: system.displayName,
      hex: system.hex,
      subsector: system.subsectorName,
      sector: sectorName
    }))}</p>`,
    `<dl>${detailRows}</dl>`,
    `</section>`
  ].join("");
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

function formatJournalEntryName(subsectorName: string, sectorName: string, milieu: string): string {
  const defaultMilieu = milieu === "M1105";
  const baseName = formatLocalize("Journals.EntryName", {
    subsector: subsectorName,
    sector: sectorName
  });

  if (defaultMilieu) {
    return baseName;
  }

  return formatLocalize("Journals.EntryNameWithMilieu", {
    name: baseName,
    milieu
  });
}