import type {
  PosterOptionChoice,
  TravellerPosterOptions,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

export const MODULE_ID = "traveller-scenes";
export const MODULE_TITLE = "Traveller Scenes";

export const TRAVELLER_MAP_API_BASE = "https://travellermap.com/api";

export const SECTOR_HEX_COLUMNS = 32;
export const SECTOR_HEX_ROWS = 40;
export const SUBSECTOR_HEX_COLUMNS = 8;
export const SUBSECTOR_HEX_ROWS = 10;

export const DEFAULT_GRID_DISTANCE = 1;
export const DEFAULT_GRID_UNITS = "pc";
export const DEFAULT_GRID_COLOR = "#4ac0ff";
export const POSTER_STORAGE_PATH = `assets/${MODULE_ID}/posters`;

export const SECTOR_SEARCH_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/sector-search-app.hbs`;

export const DEFAULT_POSTER_OPTIONS: Readonly<TravellerPosterOptions> = Object.freeze({
  style: "poster",
  scale: 128,
  compositing: true,
  noGrid: true,
  routes: false,
  showBorders: true,
  showSectorSubsectorNames: true,
  showLabels: true
});

export const DEFAULT_SYSTEM_NOTE_OPTIONS: Readonly<TravellerSystemNoteOptions> = Object.freeze({
  generateSystemNotes: true,
  detailLevel: "basic"
});

export const SYSTEM_NOTE_ICON = "icons/svg/book.svg";
export const SYSTEM_NOTE_ICON_SIZE = 40;
export const SYSTEM_NOTE_FONT_SIZE = 24;
export const JOURNAL_FOLDER_SORTING = "a";

export const DEFAULT_POSTER_RENDER_OPTIONS = 9207;
export const POSTER_RENDER_OPTION_MASKS = Object.freeze({
  borders: 0x0030,
  sectorSubsectorNames: 0x0004,
  labels: 0x00c0
});

export const POSTER_STYLE_OPTIONS: ReadonlyArray<PosterOptionChoice> = Object.freeze([
  { value: "poster", label: "Poster" },
  { value: "print", label: "Print" },
  { value: "atlas", label: "Atlas" },
  { value: "candy", label: "Candy" },
  { value: "draft", label: "Draft" },
  { value: "fasa", label: "FASA" },
  { value: "terminal", label: "Terminal" },
  { value: "mongoose", label: "Mongoose" }
]);

export const POSTER_MILIEU_OPTIONS: ReadonlyArray<string> = Object.freeze([
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
