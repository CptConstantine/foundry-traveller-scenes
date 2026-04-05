# Traveller Scenes

Foundry VTT v14 module that creates Traveller region scenes from TravellerMap poster data, then overlays a correctly aligned Traveller hex grid.

## MVP features

- Search TravellerMap for a region
- Create a new Foundry scene from the selected poster
- Align a hex grid to the poster image
- Launch creation from the Scenes sidebar

## Development

Install dependencies:

- `npm install`

Build the module:

- `npm run build`

Type-check the project:

- `npm run typecheck`

Watch for source changes:

- `npm run dev`

## Project structure

- `module.json` — Foundry manifest
- `scripts/` — built runtime module output
- `src/` — TypeScript source
- `templates/` — Handlebars templates
- `styles/` — CSS assets
- `lang/` — localization files
- `packs/` — reserved for future compendium content

## Repository

- Source: <https://github.com/CptConstantine/foundry-traveller-scenes>
- Issues: <https://github.com/CptConstantine/foundry-traveller-scenes/issues>

## Notes

Before publishing public releases, add your preferred license file and release manifest/download URLs to `module.json`.
