import { MODULE_ID } from "./config/constants.js";
import { GeneratedSystemApplication } from "./ui/generated-system-app.js";
import { SectorSearchApplication } from "./ui/sector-search-app.js";
import { localize } from "./utils/localization.js";

let sectorSearchApplication: SectorSearchApplication | null = null;
let generatedSystemApplication: GeneratedSystemApplication | null = null;

const SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-scene-sidebar-launcher`;
const SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-generator-sidebar-launcher`;

function openSectorSearchApplication(): void {
  sectorSearchApplication ??= new SectorSearchApplication();
  void sectorSearchApplication.render({ force: true });
}

function openGeneratedSystemApplication(): void {
  generatedSystemApplication ??= new GeneratedSystemApplication();
  void generatedSystemApplication.render({ force: true });
}

function injectSidebarLauncher(element: HTMLElement): void {
  if (
    element.querySelector(`[${SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE}]`)
    || element.querySelector(`[${SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE}]`)
  ) {
    return;
  }

  const actionContainer = element.querySelector<HTMLElement>(".header-actions, .action-buttons, .directory-header");
  if (!actionContainer) {
    return;
  }

  const createSceneButton = document.createElement("button");
  createSceneButton.type = "button";
  createSceneButton.className = "traveller-scenes__sidebar-launcher";
  createSceneButton.setAttribute(SIDEBAR_SCENE_LAUNCHER_ATTRIBUTE, "true");
  createSceneButton.innerHTML = '<i class="fa-solid fa-earth-americas" aria-hidden="true"></i>';
  const createSceneLabel = document.createElement("span");
  createSceneLabel.textContent = localize("Sidebar.CreateScene");
  createSceneButton.append(createSceneLabel);
  createSceneButton.addEventListener("click", () => {
    openSectorSearchApplication();
  });

  const generateSystemButton = document.createElement("button");
  generateSystemButton.type = "button";
  generateSystemButton.className = "traveller-scenes__sidebar-launcher";
  generateSystemButton.setAttribute(SIDEBAR_GENERATOR_LAUNCHER_ATTRIBUTE, "true");
  generateSystemButton.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
  const generateSystemLabel = document.createElement("span");
  generateSystemLabel.textContent = localize("Sidebar.GenerateSystem");
  generateSystemButton.append(generateSystemLabel);
  generateSystemButton.addEventListener("click", () => {
    openGeneratedSystemApplication();
  });

  actionContainer.prepend(generateSystemButton);
  actionContainer.prepend(createSceneButton);
}

export function registerHooks(): void {
  Hooks.on("renderSceneDirectory", (_application: unknown, element: HTMLElement) => {
    if (!game.user?.isGM) {
      return;
    }

    injectSidebarLauncher(element);
  });
}
