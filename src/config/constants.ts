import type { TravellerPosterOptions } from "../types/traveller.js";

export const MODULE_ID = "traveller-scenes";
export const MODULE_TITLE = "Traveller Scenes";

export const TRAVELLER_MAP_API_BASE = "https://travellermap.com/api";

export const REGION_HEX_COLUMNS = 32;
export const REGION_HEX_ROWS = 40;

export const DEFAULT_GRID_DISTANCE = 1;
export const DEFAULT_GRID_UNITS = "pc";
export const DEFAULT_GRID_COLOR = "#4ac0ff";
export const POSTER_STORAGE_PATH = `assets/${MODULE_ID}/posters`;

export const REGION_SEARCH_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/region-search-app.hbs`;

export const DEFAULT_POSTER_OPTIONS: Readonly<TravellerPosterOptions> = Object.freeze({
  style: "poster",
  scale: 64,
  compositing: true,
  noGrid: true,
  routes: false
});
