import {
  DEFAULT_SYSTEM_NOTE_OPTIONS,
  GENERATED_SYSTEM_TEMPLATE_PATH,
  MODULE_ID,
  POSTER_MILIEU_OPTIONS
} from "../config/constants.js";
import { generatedTravellerService } from "../services/generatedtraveller.js";
import { placeGeneratedSystemOnCurrentScene } from "../services/generatedsystemplacement.js";
import { formatLocalize, localize } from "../utils/localization.js";
import type {
  GeneratedSystemApplicationContext,
  PosterOptionChoiceViewModel,
  SectorSearchSystemNotesViewModel,
  TravellerSystemNoteOptions
} from "../types/traveller.js";

const GeneratedSystemApplicationBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);

export class GeneratedSystemApplication extends GeneratedSystemApplicationBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: `${MODULE_ID}-generated-system`,
      classes: [MODULE_ID],
      tag: "section",
      window: {
        title: localize("Generator.WindowTitle"),
        icon: "fa-solid fa-star"
      },
      position: {
        width: 460
      }
    },
    { inplace: false }
  ) as never;

  static override PARTS = {
    content: {
      template: GENERATED_SYSTEM_TEMPLATE_PATH
    }
  } as never;

  #seed = "";
  #systemName = "";
  #milieu = "M1105";
  #isGenerating = false;
  #error: string | null = null;
  #systemNoteOptions: TravellerSystemNoteOptions = { ...DEFAULT_SYSTEM_NOTE_OPTIONS };

  protected override async _prepareContext(options: never): Promise<any> {
    await super._prepareContext(options as never);

    const currentCanvas = typeof canvas === "undefined" ? null : canvas;
    const currentSceneName = currentCanvas?.scene?.name ?? null;
    const context: GeneratedSystemApplicationContext = {
      seed: this.#seed,
      systemName: this.#systemName,
      currentSceneName,
      hasCurrentScene: Boolean(currentSceneName),
      isGenerating: this.#isGenerating,
      error: this.#error,
      milieuOptions: this.#toMilieuOptions(),
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

    const seedInput = htmlElement.querySelector<HTMLInputElement>('input[name="generation-seed"]');
    seedInput?.addEventListener("input", (event) => {
      this.#seed = (event.currentTarget as HTMLInputElement).value;
    });

    const systemNameInput = htmlElement.querySelector<HTMLInputElement>('input[name="system-name"]');
    systemNameInput?.addEventListener("input", (event) => {
      this.#systemName = (event.currentTarget as HTMLInputElement).value;
    });

    const milieuSelect = htmlElement.querySelector<HTMLSelectElement>('select[name="generation-milieu"]');
    milieuSelect?.addEventListener("change", (event) => {
      this.#milieu = (event.currentTarget as HTMLSelectElement).value;
    });

    const systemNotesInput = htmlElement.querySelector<HTMLInputElement>('input[name="generate-system-notes"]');
    systemNotesInput?.addEventListener("change", (event) => {
      this.#systemNoteOptions.generateSystemNotes = (event.currentTarget as HTMLInputElement).checked;
    });

    const placeButton = htmlElement.querySelector<HTMLButtonElement>('[data-action="place-generated-system"]');
    placeButton?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.#placeGeneratedSystem();
    });
  }

  #toMilieuOptions(): PosterOptionChoiceViewModel[] {
    return POSTER_MILIEU_OPTIONS.map((milieu) => ({
      value: milieu,
      label: milieu,
      selected: milieu === this.#milieu
    }));
  }

  #toSystemNotesViewModel(): SectorSearchSystemNotesViewModel {
    return {
      generateSystemNotes: this.#systemNoteOptions.generateSystemNotes
    };
  }

  async #placeGeneratedSystem(): Promise<void> {
    const currentCanvas = typeof canvas === "undefined" ? null : canvas;

    if (!currentCanvas?.scene) {
      this.#error = localize("Errors.CurrentSceneMissing");
      await this.render({ force: true });
      return;
    }

    this.#isGenerating = true;
    this.#error = null;
    await this.render({ force: true });

    try {
      const generatedSelection = generatedTravellerService.generateRandomSystemSelection({
        seed: this.#seed,
        name: this.#systemName,
        milieu: this.#milieu
      });
      this.#seed = generatedSelection.generatedContent?.seed ?? this.#seed;

      const summary = await placeGeneratedSystemOnCurrentScene(
        generatedSelection,
        this.#systemNoteOptions
      );

      ui.notifications?.info(formatLocalize("Notifications.GeneratedSystemPlaced", {
        scene: summary.scene.name
      }));
      ui.notifications?.info(formatLocalize("Notifications.GeneratedSystemTile", { name: generatedSelection.name }));
      await this.close();
    } catch (error) {
      console.error(`${MODULE_ID} | Generated system placement failed`, error);
      this.#error = error instanceof Error ? error.message : localize("Errors.GeneratedSystemPlacementFailed");
      ui.notifications?.error(this.#error);
    } finally {
      this.#isGenerating = false;
      if (this.rendered) {
        await this.render({ force: true });
      }
    }
  }
}
