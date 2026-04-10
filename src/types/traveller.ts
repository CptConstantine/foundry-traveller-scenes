export interface TravellerMapSearchResponse {
  Results?: {
    Count?: number;
    Items?: TravellerMapSearchItem[];
  };
}

export interface TravellerMapSearchItem {
  Sector?: TravellerMapSectorResult;
  Subsector?: TravellerMapSubsectorResult;
}

export interface TravellerMapSectorResult {
  Name: string;
  SectorX: number;
  SectorY: number;
  SectorTags?: string;
}

export interface TravellerMapSubsectorResult {
  Sector: string;
  Index: string;
  SectorX: number;
  SectorY: number;
  Name: string;
  SectorTags?: string;
}

export type TravellerContentSource = "travellermap" | "generated";

export interface GeneratedTravellerPosterPayload {
  data: string;
  metadata: string;
}

export interface GeneratedTravellerContent {
  seed: string;
  generatedAt: string;
  metadata: TravellerSectorMetadata;
  systems: TravellerSectorSystem[];
  poster: GeneratedTravellerPosterPayload;
}

export interface TravellerSectorSelection {
  key: string;
  name: string;
  sectorX: number;
  sectorY: number;
  tags: string[];
  source: TravellerContentSource;
  kind: "sector" | "subsector";
  sectorName: string;
  subsectorIndex?: string;
  dimensions: SectorDimensions;
  generatedContent?: GeneratedTravellerContent;
}

export interface TravellerSystemNoteOptions {
  generateSystemNotes: boolean;
  detailLevel: TravellerSystemNoteDetailLevel;
}

export type TravellerSystemNoteDetailLevel = "basic";

export interface TravellerGeneratedSystemOptions {
  seed?: string;
  name?: string;
  milieu?: string;
}

export interface TravellerPosterOptions {
  style: string;
  scale: number;
  compositing: boolean;
  noGrid: boolean;
  routes: boolean;
  showBorders: boolean;
  showSectorSubsectorNames: boolean;
  showLabels: boolean;
  milieu?: string;
}

export interface PosterOptionChoice {
  value: string;
  label: string;
}

export interface PosterOptionChoiceViewModel extends PosterOptionChoice {
  selected: boolean;
}

export interface PosterImageInfo {
  url: string;
  width: number;
  height: number;
  posterOptions: TravellerPosterOptions;
}

export interface TravellerMapMetadataResponse {
  Abbreviation?: string;
  Names?: TravellerMapMetadataName[];
  Subsectors?: TravellerMapMetadataSubsector[];
  DataFile?: TravellerMapMetadataDataFile;
}

export interface TravellerMapMetadataName {
  Text?: string;
  Lang?: string;
}

export interface TravellerMapMetadataDataFile {
  Milieu?: string;
  Subsectors?: TravellerMapMetadataSubsector[];
}

export interface TravellerMapMetadataSubsector {
  Name?: string;
  Index?: string;
  IndexNumber?: number;
}

export interface TravellerSectorMetadata {
  sectorName: string;
  abbreviation?: string;
  milieu?: string;
  subsectorNames: Record<string, string>;
}

export interface TravellerSectorSystem {
  sector: string;
  subsectorIndex: string;
  subsectorName: string;
  hex: string;
  hexX: number;
  hexY: number;
  localHexX: number;
  localHexY: number;
  name: string;
  displayName: string;
  uwp: string;
  bases: string;
  remarks: string;
  zone: string;
  pbg: string;
  allegiance: string;
  stars: string;
  importance: string;
  economics: string;
  culture: string;
  nobility: string;
  worlds: string;
  resourceUnits: string;
}

export interface SectorDimensions {
  columns: number;
  rows: number;
}

export interface CalibratedGridConfig {
  gridType: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  sceneWidth: number;
  sceneHeight: number;
  backgroundOffsetX: number;
  backgroundOffsetY: number;
  columns: number;
  rows: number;
}

export interface SectorSearchResultViewModel {
  key: string;
  name: string;
  coordinateText: string;
  tagText: string;
  isSelected: boolean;
}

export interface SectorSearchPosterOptionsViewModel {
  styleOptions: PosterOptionChoiceViewModel[];
  milieuOptions: PosterOptionChoiceViewModel[];
  routes: boolean;
  showGrid: boolean;
  showBorders: boolean;
  showSectorSubsectorNames: boolean;
  showLabels: boolean;
  isExpanded: boolean;
}

export interface SectorSearchSystemNotesViewModel {
  generateSystemNotes: boolean;
}

export interface SectorSearchApplicationContext {
  query: string;
  results: SectorSearchResultViewModel[];
  hasResults: boolean;
  canCreate: boolean;
  isLoading: boolean;
  isCreating: boolean;
  isCreatingSelection: boolean;
  error: string | null;
  posterOptions: SectorSearchPosterOptionsViewModel;
  systemNotes: SectorSearchSystemNotesViewModel;
}

export interface GeneratedSystemApplicationContext {
  seed: string;
  systemName: string;
  currentSceneName: string | null;
  hasCurrentScene: boolean;
  isGenerating: boolean;
  error: string | null;
  milieuOptions: PosterOptionChoiceViewModel[];
  systemNotes: SectorSearchSystemNotesViewModel;
}
