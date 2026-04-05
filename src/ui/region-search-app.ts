import { MODULE_ID, REGION_SEARCH_TEMPLATE_PATH } from "../config/constants.js";
import { createRegionScene } from "../services/scenecreation.js";
import { travellerMapService } from "../services/travellermap.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  RegionSearchApplicationContext,
  RegionSearchResultViewModel,
  TravellerRegionSelection
} from "../types/traveller.js";

const RegionSearchApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);

export class RegionSearchApplication extends RegionSearchApplicationBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
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
  ) as never;

  static override PARTS = {
    content: {
      template: REGION_SEARCH_TEMPLATE_PATH
    }
  } as never;

  #query = "";
  #results: TravellerRegionSelection[] = [];
  #selectedKey: string | null = null;
  #isLoading = false;
  #isCreating = false;
  #error: string | null = null;

  protected override async _prepareContext(options: never): Promise<any> {
    await super._prepareContext(options as never);

    const context: RegionSearchApplicationContext = {
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

    htmlElement.querySelectorAll<HTMLInputElement>('input[name="region"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.#selectedKey = input.value;
      });
    });

    const createButton = htmlElement.querySelector<HTMLButtonElement>('[data-action="create-region-scene"]');
    createButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#createRegionScene();
    });
  }

  get #selectedRegion(): TravellerRegionSelection | null {
    return this.#results.find((result) => result.key === this.#selectedKey) ?? null;
  }

  #toResultViewModel(result: TravellerRegionSelection): RegionSearchResultViewModel {
    return {
      key: result.key,
      name: result.name,
      coordinateText: formatLocalize("Search.Coordinates", { x: result.regionX, y: result.regionY }),
      tagText: result.tags.length > 0 ? result.tags.join(" · ") : localize("Search.NoTags"),
      isSelected: result.key === this.#selectedKey
    };
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

  async #createRegionScene(): Promise<void> {
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
}
