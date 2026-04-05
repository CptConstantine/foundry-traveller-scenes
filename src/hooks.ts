import { MODULE_ID } from "./config/constants.js";
import { RegionSearchApplication } from "./ui/region-search-app.js";
import { localize } from "./utils/localization.js";

let regionSearchApplication: RegionSearchApplication | null = null;

const SIDEBAR_LAUNCHER_ATTRIBUTE = `data-${MODULE_ID}-sidebar-launcher`;

function openRegionSearchApplication(): void {
  regionSearchApplication ??= new RegionSearchApplication();
  void regionSearchApplication.render({ force: true });
}

function injectSidebarLauncher(element: HTMLElement): void {
  if (element.querySelector(`[${SIDEBAR_LAUNCHER_ATTRIBUTE}]`)) {
    return;
  }

  const actionContainer = element.querySelector<HTMLElement>(".header-actions, .action-buttons, .directory-header");
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

export function registerHooks(): void {
  Hooks.on("renderSceneDirectory", (_application: unknown, element: HTMLElement) => {
    if (!game.user?.isGM) {
      return;
    }

    injectSidebarLauncher(element);
  });
}
