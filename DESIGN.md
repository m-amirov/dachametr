# Дачаметр — Garden Atlas

**Status: owner selected direction C (2026-11-24); implemented candidate, rendered acceptance pending.** Previous fieldbook visual direction is rejected. Reference: owner-selected generated Garden Atlas concept from 2026-11-24. Do not claim pixel fidelity or a real GIS/CAD/photoreal 3D renderer.

## Visual system
- The selected zone is the dominant work surface. Two columns inside editor: large visual plan and material cutaway on left, one parameters/layers inspector on right. Zone navigation is a horizontal strip above. BOM occupies full-width area below. Small screens keep the three functional tabs and single-column editor.
- Default volume view projects the actual rectangular zone with two equal-scale isometric axes; a functional Plan toggle exposes the exact top-down aspect ratio. The view selection survives input rerenders and is not shared calculation data. No zone placement or assumed paving. Texture outside the zone is illustrative context, not plot geometry. Material faces use locally stored WebP texture crops from generated concept artwork. The visible top material is taken from the last actual layer. Without layers the scene displays only a translucent dashed boundary. The context strip is a low-resolution crop of flowers/wood from the owner-selected concept, used as an intentionally soft illustrative background, not a site photo. Side and top textures of the cutaway are sheared to their corresponding faces, with face-specific shading. The same material artwork is reused for layer swatches and cutaway. No external requests or unsupported construction features.
- UI uses one Cyrillic-safe system sans, warm cream and deep garden green; no decorative fake controls or hero.
- The existing fail-closed calculator, focus restoration, comma input, exact calculations, share, CSV, result panels and state semantics remain unchanged.

### Canonical CSS tokens
- `--paper: #f8f5ee`
- `--canvas: #ede9df`
- `--panel: #fffdf8`
- `--ink: #172a1d`
- `--teal: #234b2b`
- `--orange: #a36c2e`
- `--danger: #a53b31`

## Scope & evidence
Baseline: PR #18 `71d19d3d46133e78cf649a2c3137fc43a497fff1`. Local prototype only. No main merge, deployment, analytics, SEO publishing, new domain capabilities or external dependencies. Texture asset origins: ChatGPT generated concept C (2026-11-24) and landscape cutaway reference from the same conversation; material-only crops, resized to 64/80 px WebP. Not photographs of the actual user site, not density/engineering evidence.

## Gates
Exact HEAD: npm test, npm run build, npm run test:browser, capture-ui-evidence with source hash including all artwork. Mobile 320/390, tablet 768/1024, desktop 1440, invalid/valid/editor/BOM. Visual review is separate from automated PASS; physical devices, screen reader, true 200% zoom not presumed. Market Gate 1 remains BLOCKED.

## Garden Atlas 0.3 — material and landscape artwork

Original deterministic SVG specimens (256 px artboards), detailed gravel facets, granular soil/sand and individual grass blades; scene-edge botanical illustration using clustered leaves and flowers, no external assets. These are illustrative graphics, not actual photographs or calibrated representations of grain size. Source-owned artwork under public/atlas/*-detail.svg and garden-border.svg, rendered locally. Projection still uses equal-length unit axes; visible edge elevation is purely illustrative and absent when no material is selected. The cross-section enlarges the visible faces and retains real relative entered thicknesses. The approved concept is a quality target, not proof of achieved photorealism. Exact HEAD browser visual review and owner acceptance remain required.
