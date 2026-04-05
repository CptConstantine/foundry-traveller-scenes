import { MODULE_ID, MODULE_TITLE } from "./config/constants.js";
import { registerHooks } from "./hooks.js";

Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing ${MODULE_TITLE}`);
  registerHooks();
});

Hooks.once("ready", () => {
  console.info(`${MODULE_ID} | Ready`);
});
