import {
  DEFAULT_POSTER_OPTIONS,
  DEFAULT_SYSTEM_NOTE_OPTIONS,
  MODULE_ID,
  POSTER_MILIEU_OPTIONS,
  POSTER_STYLE_OPTIONS,
  SECTOR_SEARCH_TEMPLATE_PATH
} from "../config/constants.js";
import { createSectorScene } from "../services/scenecreation.js";
import { travellerMapService } from "../services/travellermap.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  PosterOptionChoice,
  PosterOptionChoiceViewModel,
  SectorSearchApplicationContext,
  SectorSearchPosterOptionsViewModel,
  SectorSearchResultViewModel,
  SectorSearchSystemNotesViewModel,
  TravellerPosterOptions,
  TravellerSectorSelection,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

const SectorSearchApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);

export class SectorSearchApplication extends SectorSearchApplicationBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
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
  ) as never;

  static override PARTS = {
    content: {
      template: SECTOR_SEARCH_TEMPLATE_PATH
    }
  } as never;

  #query = "";
  #results: TravellerSectorSelection[] = [];
  #selectedKey: string | null = null;
  #isLoading = false;
  #isCreating = false;
  #error: string | null = null;
  #posterOptions: TravellerPosterOptions = { ...DEFAULT_POSTER_OPTIONS };
  #systemNoteOptions: TravellerSystemNoteOptions = { ...DEFAULT_SYSTEM_NOTE_OPTIONS };
  #posterOptionsExpanded = false;

  protected override async _prepareContext(options: never): Promise<any> {
    await super._prepareContext(options as never);

    const context: SectorSearchApplicationContext = {
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

  protected override _attachPartListeners(
    partId: string,
    htmlElement: HTMLElement,
    options: Record<string, unknown>
  ): void {
    super._attachPartListeners(partId, htmlElement, options as never);

    const searchInput = htmlElement.querySelector<HTMLInputElement>('input[name="query"]');
    searchInput?.addEventListener("input", (event) => {
      this.#query = (event.currentTarget as HTMLInputElement).value;
    });
    searchInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.#executeSearch();
      }
    });

    const searchButton = htmlElement.querySelector<HTMLButtonElement>('[data-action="search"]');
    searchButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#executeSearch();
    });

    htmlElement.querySelectorAll<HTMLInputElement>('input[name="sector"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.#selectedKey = input.value;
      });
    });

    const posterOptionsDetails = htmlElement.querySelector<HTMLDetailsElement>('[data-role="poster-options"]');
    posterOptionsDetails?.addEventListener("toggle", () => {
      this.#posterOptionsExpanded = posterOptionsDetails.open;
    });

    const styleSelect = htmlElement.querySelector<HTMLSelectElement>('select[name="poster-style"]');
    styleSelect?.addEventListener("change", (event) => {
      this.#posterOptions.style = (event.currentTarget as HTMLSelectElement).value;
    });

    const milieuSelect = htmlElement.querySelector<HTMLSelectElement>('select[name="poster-milieu"]');
    milieuSelect?.addEventListener("change", (event) => {
      const selectedMilieu = (event.currentTarget as HTMLSelectElement).value.trim();
      this.#posterOptions.milieu = selectedMilieu || undefined;
    });

    const routesInput = htmlElement.querySelector<HTMLInputElement>('input[name="poster-routes"]');
    routesInput?.addEventListener("change", (event) => {
      this.#posterOptions.routes = (event.currentTarget as HTMLInputElement).checked;
    });

    const gridInput = htmlElement.querySelector<HTMLInputElement>('input[name="poster-show-grid"]');
    gridInput?.addEventListener("change", (event) => {
      this.#posterOptions.noGrid = !(event.currentTarget as HTMLInputElement).checked;
    });

    const bordersInput = htmlElement.querySelector<HTMLInputElement>('input[name="poster-show-borders"]');
    bordersInput?.addEventListener("change", (event) => {
      this.#posterOptions.showBorders = (event.currentTarget as HTMLInputElement).checked;
    });

    const sectorSubsectorNamesInput = htmlElement.querySelector<HTMLInputElement>('input[name="poster-show-sector-subsector-names"]');
    sectorSubsectorNamesInput?.addEventListener("change", (event) => {
      this.#posterOptions.showSectorSubsectorNames = (event.currentTarget as HTMLInputElement).checked;
    });

    const labelsInput = htmlElement.querySelector<HTMLInputElement>('input[name="poster-show-labels"]');
    labelsInput?.addEventListener("change", (event) => {
      this.#posterOptions.showLabels = (event.currentTarget as HTMLInputElement).checked;
    });

    const systemNotesInput = htmlElement.querySelector<HTMLInputElement>('input[name="generate-system-notes"]');
    systemNotesInput?.addEventListener("change", (event) => {
      this.#systemNoteOptions.generateSystemNotes = (event.currentTarget as HTMLInputElement).checked;
    });

    const createButton = htmlElement.querySelector<HTMLButtonElement>('[data-action="create-sector-scene"]');
    createButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#createSectorScene();
    });
  }

  get #selectedSector(): TravellerSectorSelection | null {
    return this.#results.find((result) => result.key === this.#selectedKey) ?? null;
  }

  #toResultViewModel(result: TravellerSectorSelection): SectorSearchResultViewModel {
    return {
      key: result.key,
      name: result.name,
      coordinateText: formatLocalize("Search.Coordinates", { x: result.sectorX, y: result.sectorY }),
      tagText: result.tags.length > 0 ? result.tags.join(" · ") : localize("Search.NoTags"),
      isSelected: result.key === this.#selectedKey
    };
  }

  #toPosterOptionsViewModel(): SectorSearchPosterOptionsViewModel {
    const defaultMilieuOption: PosterOptionChoice = {
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

  #toSystemNotesViewModel(): SectorSearchSystemNotesViewModel {
    return {
      generateSystemNotes: this.#systemNoteOptions.generateSystemNotes
    };
  }

  #toChoiceViewModels(
    options: ReadonlyArray<PosterOptionChoice>,
    selectedValue: string
  ): PosterOptionChoiceViewModel[] {
    return options.map((option) => ({
      ...option,
      selected: option.value === selectedValue
    }));
  }

  async #executeSearch(): Promise<void> {
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

  async #createSectorScene(): Promise<void> {
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
}
