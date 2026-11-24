# Garden Atlas implementation — iteration 1

Owner selected C; previous baseline `71d19d3d46133e78cf649a2c3137fc43a497fff1`. Retained real calculator behavior and domain. Actual repository changes: visual-first zone editor; horizontal zone rail; inspector; full-width BOM; locally sourced WebP material textures; geometry and layer order preserved. The image concept is not a live map or a promise of unsupported 3D controls. The four textures are cropped from the generated concept artwork in the conversation, not external licensed photographs. See DESIGN.md for current source-of-truth.

Exact HEAD CI, browser geometry and asset decode tests, screenshot capture required. Visual approval is separate. No production release, main merge, unsupported material or scope expansion.

## Iteration 0.2 — dynamic volume view

Real SVG projection of the validated rectangular zone using equal-length axis vectors. Scene geometry and surface type update immediately from the draft; top-down mode remains exact and accessible via a real keyboard-operable view switch. Both views are covered by browser geometry tests and capture. The added context image is a 192x54 WebP crop of the approved generated garden reference (flowers/wood only, no UI or measurements); source concept is the owner-selected Garden Atlas screenshot in the conversation. Material cutaway uses face-projected local textures and independent lighting. It remains a schematic visualization rather than photorealistic CAD. Source provenance includes the added asset. No formula, share or material capability changes.

## Iteration 0.3 — material detail and environment

Replaced low-resolution repeated material tiles in the rendered scene, cutaway and swatches with original seeded SVG texture artwork. Added source-owned ornamental vegetation at scene margins, lower projection angle, separate edge lighting and a readable central area label. Cutaway face size increased; relative layer heights remain dimension-derived, testable. All decorative environment elements are explicitly conditional/illustrative and are not included in the BOM. Added asset decode and proportional-height regressions; screenshot provenance includes all five SVG assets. This remains a stylized architectural rendering, not a real 3D reconstruction. Final visual verification depends on the exact-HEAD browser capture.
