# Project Guidelines

## Project

`Traveller Scenes` is a Foundry VTT v14 module written in TypeScript.

The project generates Traveller scenes from TravellerMap data. The current MVP searches for a region, creates a new Foundry scene using the TravellerMap poster as the background image, and aligns a Foundry hex grid to that poster.

## Relevant APIs

Use only Foundry VTT v14 API.

- TravellerMap API docs — search, poster rendering, coordinates, metadata, and region data: https://travellermap.com/doc/api
- Foundry VTT API index — main API reference for module development: https://foundryvtt.com/api/index.html
- Foundry hook events — relevant for `getSceneControlButtons` and other module hooks: https://foundryvtt.com/api/modules/hookEvents.html
- Foundry `HexagonalGrid` API — grid behavior and hex math reference: https://foundryvtt.com/api/classes/foundry.grid.HexagonalGrid.html
- Foundry `CONST.GRID_TYPES` API — grid type constants used for hex scene configuration: https://foundryvtt.com/api/variables/CONST.GRID_TYPES.html
- Foundry Scenes article — scene configuration overview: https://foundryvtt.com/article/scenes/
