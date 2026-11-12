# Ayan: interface refinement

Direction: calm, friendly learning cards on white with a leaf-green accent. The existing Ayan character and garden supply the distinctive visuals.

Audit: tiny low-contrast labels; heavy headings; uppercase tracked captions; repeated pastel icon panels; decorative orbit rings and floating tiles; raised button shadows and moving cards on hover.

Passes applied in order:
1. Spacing: consistent 16/24/32/48 spacing, aligned controls, readable mobile list.
2. Color: neutral surfaces, darkened secondary text, one green accent.
3. Icons: removed duplicate decorative icons; activity previews show examples instead.
4. Copy: contextual teacher title and sentence-case captions; removed guessed activity durations.
5. Type: larger captions and descriptions, 500–600 emphasis, restrained tracking.
6. Layout: preserved section order and role navigation; single-column mobile activity cards.
7. Details: 8px controls, 16px cards, quieter borders and button depth.
8. Visuals: retained real 3D Ayan; previews use actual activity content and the existing puzzle artwork. No generated imagery needed.
9. Motion: removed card hover displacement and repeated card entrances; retained a single main entrance and user-requested expressive mascot animations, including flight and reduced-motion fallback.

Validation: 29 existing tests; browser check of teacher preparation, child view, completed pairs, planted garden, 390px mobile layout, WebGL canvas, and browser errors. This pass changes presentation, not curriculum depth or storage architecture.

Implementation: unslop.css is a scoped presentation layer over the existing prototype styles. Consolidating the legacy styles remains separate technical debt.

Methodology: [Unslop by Damir Sokolovsky (@heydamir)](https://github.com/heydamir/unslop), CC BY 4.0. No skill source files were copied into the application.
