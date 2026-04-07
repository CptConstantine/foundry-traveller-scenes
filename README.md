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

Prepare release assets locally:

- `npm run release:prepare`

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

## Releasing

The repository now includes a GitHub Actions workflow at `.github/workflows/release.yml`.

Release flow is now:

1. Update the version in both `package.json` and `module.json`
2. Commit and push your changes
3. Create and publish a GitHub release with the tag `v<version>`

If you want to preview the exact assets before publishing, you can still run `npm run release:prepare` locally.

The generated release manifest is configured for Foundry's recommended GitHub release flow:

- Stable manifest URL: `https://github.com/CptConstantine/foundry-traveller-scenes/releases/latest/download/module.json`
- Versioned download URL: `https://github.com/CptConstantine/foundry-traveller-scenes/releases/download/v<version>/traveller-scenes.zip`

After the first release is uploaded, you can paste the stable manifest URL into Foundry's module installer or use it when submitting the module to Foundry's package directory.
