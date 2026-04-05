export interface TravellerMapSearchResponse {
  Results?: {
    Count?: number;
    Items?: TravellerMapSearchItem[];
  };
}

export interface TravellerMapSearchItem {
  Region?: TravellerMapRegionResult;
}

export interface TravellerMapRegionResult {
  Name: string;
  RegionX: number;
  RegionY: number;
  RegionTags?: string;
}

export interface TravellerRegionSelection {
  key: string;
  name: string;
  regionX: number;
  regionY: number;
  tags: string[];
}

export interface TravellerPosterOptions {
  style: string;
  scale: number;
  compositing: boolean;
  noGrid: boolean;
  routes: boolean;
  milieu?: string;
}

export interface PosterImageInfo {
  url: string;
  width: number;
  height: number;
}

export interface RegionDimensions {
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

export interface RegionSearchResultViewModel {
  key: string;
  name: string;
  coordinateText: string;
  tagText: string;
  isSelected: boolean;
}

export interface RegionSearchApplicationContext {
  query: string;
  results: RegionSearchResultViewModel[];
  hasResults: boolean;
  canCreate: boolean;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
}
