// src/config/constants.ts
var MODULE_ID = "traveller-scenes";
var MODULE_TITLE = "Traveller Scenes";
var TRAVELLER_MAP_API_BASE = "https://travellermap.com/api";
var REGION_HEX_COLUMNS = 32;
var REGION_HEX_ROWS = 40;
var DEFAULT_GRID_DISTANCE = 1;
var DEFAULT_GRID_UNITS = "pc";
var DEFAULT_GRID_COLOR = "#4ac0ff";
var POSTER_STORAGE_PATH = `assets/${MODULE_ID}/posters`;
var REGION_SEARCH_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/region-search-app.hbs`;
var DEFAULT_POSTER_OPTIONS = Object.freeze({
  style: "poster",
  scale: 64,
  compositing: true,
  noGrid: true,
  routes: false
});

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
  columns: REGION_HEX_COLUMNS,
  rows: REGION_HEX_ROWS
};
function calibrateRegionGrid(image, dimensions = DEFAULT_DIMENSIONS) {
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
  async searchRegions(query) {
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
    const regions = items.map((item) => item.Region).filter((region) => Boolean(region));
    const deduped = /* @__PURE__ */ new Map();
    for (const region of regions) {
      const key = this.createRegionKey(region.Name, region.RegionX, region.RegionY);
      deduped.set(key, {
        key,
        name: region.Name,
        regionX: region.RegionX,
        regionY: region.RegionY,
        tags: (region.RegionTags ?? "").split(/\s+/).map((tag) => tag.trim()).filter(Boolean)
      });
    }
    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
  }
  buildPosterUrl(region, options = {}) {
    const resolvedOptions = { ...DEFAULT_POSTER_OPTIONS, ...options };
    const url = new URL(`${TRAVELLER_MAP_API_BASE}/poster`);
    url.searchParams.set("Region", region.name);
    url.searchParams.set("style", resolvedOptions.style);
    url.searchParams.set("scale", String(resolvedOptions.scale));
    if (resolvedOptions.compositing) {
      url.searchParams.set("compositing", "1");
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
  async getPosterImageInfo(region, options = {}) {
    const resolvedOptions = { ...DEFAULT_POSTER_OPTIONS, ...options };
    const remoteUrl = this.buildPosterUrl(region, resolvedOptions);
    const posterBlob = await this.fetchPosterBlob(remoteUrl);
    const dimensions = await this.loadImageDimensionsFromBlob(posterBlob);
    const cachedPath = await this.cachePosterBlob(region, resolvedOptions, posterBlob);
    return {
      url: cachedPath,
      ...dimensions
    };
  }
  createRegionKey(name, regionX, regionY) {
    return `${name}::${regionX},${regionY}`;
  }
  async fetchPosterBlob(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(formatLocalize("Errors.PosterStatus", { status: response.status }));
    }
    return await response.blob();
  }
  async cachePosterBlob(region, options, posterBlob) {
    const filePicker = foundry.applications.apps.FilePicker.implementation;
    const extension = this.getPosterFileExtension(posterBlob.type);
    const fileName = `${this.slugify(region.name)}-${region.regionX}-${region.regionY}-${options.scale}-${Date.now()}.${extension}`;
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

// src/services/scenecreation.ts
function createLevelBackgroundData(src) {
  return {
    src,
    tint: "#ffffff",
    alphaThreshold: 0,
    color: 0
  };
}
async function configureSceneLevel(scene, region, posterUrl) {
  const sceneWithLevels = scene;
  const background = createLevelBackgroundData(posterUrl);
  const existingLevel = sceneWithLevels.initialLevel ?? sceneWithLevels.firstLevel;
  if (existingLevel) {
    await existingLevel.update({
      name: formatLocalize("Scene.Name", { name: region.name }),
      background
    });
    return existingLevel;
  }
  const [createdLevel] = await sceneWithLevels.createEmbeddedDocuments("Level", [
    {
      name: formatLocalize("Scene.Name", { name: region.name }),
      sort: 0,
      background
    }
  ]);
  if (!createdLevel) {
    throw new Error(localize("Errors.SceneLevelMissing"));
  }
  return createdLevel;
}
async function createRegionScene(region) {
  if (!game.user?.isGM) {
    throw new Error(localize("Errors.OnlyGM"));
  }
  const poster = await travellerMapService.getPosterImageInfo(region);
  const grid = calibrateRegionGrid(poster);
  const sceneData = {
    name: formatLocalize("Scene.Name", { name: region.name }),
    navName: region.name,
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
        region,
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
    region,
    poster.url
  );
  const levelData = level.toObject();
  await scene.update({
    [`flags.${MODULE_ID}.backgroundState`]: {
      requested: poster.url,
      levelId: level.id ?? null,
      levelBackgroundSrc: levelData.background?.src ?? null,
      levelTextures: levelData.textures ?? null,
      sceneBackgroundColor: scene.toObject().backgroundColor ?? null
    }
  });
  await scene.activate();
  return scene;
}

// src/ui/region-search-app.ts
var RegionSearchApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);
var RegionSearchApplication = class extends RegionSearchApplicationBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: `${MODULE_ID}-region-search`,
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
      template: REGION_SEARCH_TEMPLATE_PATH
    }
  };
  #query = "";
  #results = [];
  #selectedKey = null;
  #isLoading = false;
  #isCreating = false;
  #error = null;
  async _prepareContext(options) {
    await super._prepareContext(options);
    const context = {
      query: this.#query,
      results: this.#results.map((result) => this.#toResultViewModel(result)),
      hasResults: this.#results.length > 0,
      canCreate: Boolean(this.#selectedRegion) && !this.#isCreating,
      isLoading: this.#isLoading,
      isCreating: this.#isCreating,
      error: this.#error
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
    htmlElement.querySelectorAll('input[name="region"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.#selectedKey = input.value;
      });
    });
    const createButton = htmlElement.querySelector('[data-action="create-region-scene"]');
    createButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#createRegionScene();
    });
  }
  get #selectedRegion() {
    return this.#results.find((result) => result.key === this.#selectedKey) ?? null;
  }
  #toResultViewModel(result) {
    return {
      key: result.key,
      name: result.name,
      coordinateText: formatLocalize("Search.Coordinates", { x: result.regionX, y: result.regionY }),
      tagText: result.tags.length > 0 ? result.tags.join(" \xB7 ") : localize("Search.NoTags"),
      isSelected: result.key === this.#selectedKey
    };
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
      const results = await travellerMapService.searchRegions(trimmedQuery);
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
  async #createRegionScene() {
    const selectedRegion = this.#selectedRegion;
    if (!selectedRegion) {
      this.#error = localize("Search.Errors.ChooseRegion");
      await this.render({ force: true });
      return;
    }
    this.#isCreating = true;
    this.#error = null;
    await this.render({ force: true });
    try {
      const scene = await createRegionScene(selectedRegion);
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
var regionSearchApplication = null;
var SIDEBAR_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-sidebar-launcher`;
function openRegionSearchApplication() {
  regionSearchApplication ??= new RegionSearchApplication();
  void regionSearchApplication.render({ force: true });
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
    openRegionSearchApplication();
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
