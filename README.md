# Hero Language Camp

An open-source gamified learning prototype for low-resource, minority, heritage, and community languages.

The current MVP teaches **Eastern Armenian through Italian** with a mobile-friendly 2D pixel side-scroller. The project is intentionally structured so a community language can work with reviewed text and human audio even when commercial TTS, ASR, or pronunciation scoring is unavailable.

## What is in the v0.14 chapter, audio, and offline build

The v0.14 build keeps the staged Level 0–8 curriculum and adds a full-screen chapter reader, an audited Italian course layer, resumable offline installation, direct word and letter audio controls, an install-app guide, and pack-defined reusable monster visuals. Existing mastery, coins, inventory, sessions, stones, and labyrinth progress are preserved.

The stable contextual layout remains: the side-scroller stays visible beside training and fight questions, while labyrinth questions temporarily prioritize the encounter animation and question panel.

- Default pack: `hy-eastern-it` = Eastern Armenian target language, Italian base/interface language.
- The base language is no longer a separate gameplay setting; it belongs to the selected pack.
- Modular content-pack files:
  - `pack.yaml` for pack metadata and file map.
  - `interface.yaml` for all UI/menu text.
  - `tags.yaml` for controlled semantic tags.
  - `tasks.yaml` for training mappings and session settings.
  - `levels.yaml` for staged learning goals, chapter references, stat caps, soft fight timing, and fight-entry requirements.
  - `enemies.yaml` for monsters, levels, tags, rewards, and preferred skills.
  - `story.yaml` for structured fictional chapters, grammar lectures, examples, mistakes, and missions.
  - `labyrinths.yaml` for maze size, question budget, hearts, tags, and rewards.
  - `dictionary/*.jsonl` for words, letters, and sentence-order practice.
- Training/stat mappings are now:
  - Vocabulary -> Strength / Forza.
  - Comprehension -> Defense / Difesa.
  - Grammar -> Precision / Precisione.
  - Pronunciation -> Stamina / Resistenza.
  - Armenian letters are low-difficulty vocabulary practice.
- Each normal training session always runs for 10 questions. Finishing it awards the matching colored/shaped labyrinth stone; strong performance also awards the attribute point.
- A fight can only start when the pack-defined minimum requirements are met.
- Monsters now refuse fights when the child needs more full training sessions, coins, or stats.
- Fight math uses linear stat caps and a sigmoid precision-vs-defense formula: strength is max damage, precision determines how close hits get to max, defense reduces incoming damage, and stamina is hero energy. Fights still cannot end before 10 answered questions.
- Monster question selection prioritizes the monster's semantic tags, such as `food`, `greeting`, `family`, or `school`.
- Multiple child profiles are saved locally. Each child keeps separate level, coins, stats, inventory, mastery, defeated enemies, and path progress.
- Clicking the hero name opens a quick hero/profile switcher.
- Settings include profile management, hero appearance, graphics pack, audio mode, debug mode, reset progress, and dictionary editing.
- Human-only lesson audio is the default. Automatic mode prefers human recordings, then Armenian neural files, then a genuine installed Armenian voice; it never deliberately falls back to an English/default voice.
- Answers are highlighted directly. After a mistake, the rich Armenian/transliteration/Italian explanation remains until the learner presses Continue.
- Fight feedback shows damage dealt, damage taken, and damage absorbed in a kid-friendly combat card.
- The app remembers per-item practice history: last asked, last wrong, counts, mastery, streak, and next review time. Mistakes and due/old items are prioritized.
- Low-level vocabulary supports an optional `emoji` field for children who cannot read yet.
- Pronunciation training uses fast sound-form exercises such as transliteration and syllable matching, without recording or speech recognition.
- Ordinary menu clicks no longer make a sound; sounds are reserved for feedback, battle, rewards, and level-up events.
- A Phaser 2D side-scroller replaces the previous CSS/SVG path: sprite-sheet hero, parallax layers, fixed ground path, anchored objects, encounters on the path, and funny scenery.
- The hero now uses seven independent 25-frame, 5 x 5 spritesheets for walking, two attacks, falling, energy, parry, and victory. Standing reuses walking frame 0; training loops use swing/parry/simple attack/energy.
- The dragon companion now uses independent 25-frame walking and victory sheets. It loops while travelling and celebrates fight or labyrinth victories.
- A mixed-skill reward activity, **Labirinto**, opens a procedurally generated isometric enchanted-forest-ruins map with fog of war, connected painted paths, ruined walls, four learning runes, monster and trap encounters, hidden coin caches, healing fountains, reveal obelisks, five hearts, autosave, and a final treasure guardian. A new run consumes a persistent random recipe of two or three different training stones. It contains 35–40 questions in total; success gives +1 to every non-capped stat, counts as one session, and may award coins or an unlocked item.
- The labyrinth camera now follows the hero, showing roughly 5×5 rooms on desktop and 3×3 on mobile instead of shrinking the entire 7×7 maze. A collapsible minimap records explored rooms.
- Maze walls are generated as stable canonical edges and depth-sorted between rear and front room contents. Four low single-edge wall images compose every possible wall combination, with a procedural dark edge beneath them for readability.
- Labyrinth movement supports tapping rooms, an on-screen direction pad, arrow keys, and WASD. During questions, the map stays visible while the answer panel scrolls independently.
- The labyrinth renderer now uses a complete semi-realistic hand-painted enchanted-forest-ruins asset set derived from an image-model atlas. Every file retains the fixed dimensions and transparency expected by the game, and the source atlas plus deterministic extraction script are included for future regeneration.
- Debug information such as distance, renderer, stat cap, fight math, and path diagnostics is hidden unless Debug mode is enabled. Debug bypass can unlock gates for testing.
- The in-app dictionary/admin panel can record new words/sentences, click existing entries to append audio, save recordings into the browser copy, import JSON contributions, and export a mergeable pack/contribution file.
- Active training and fights use a fixed responsive session layout: the side-scroller stays visible while questions scroll in a dedicated side panel on desktop or bottom panel on phones.
- The labyrinth keeps its camera visible during encounters and now has a persistent translated adventure log, clearer event cards, and no dragon token inside the maze.
- Settings include a developer viewport simulator for iPhone, Android, small-phone, tablet, landscape, and forced desktop layouts.
- The compact Story/Task panel opens a distraction-free chapter reader containing the fictional scene, grammar lecture, examples, mission, and all previously unlocked chapters.
- Offline installation is resumable: application files and audio are checked separately, failed downloads can be retried, and a previous complete cache remains available during updates.
- Vocabulary questions expose available Armenian audio directly. Letter practice supports the spoken letter name and an optional separately reviewed phoneme recording.
- The install button opens the native browser prompt where supported and clear Add-to-Home-Screen instructions on iPhone.
- Enemy artwork is addressed by pack-defined asset keys, rows, variants, scale, and tint. Later levels can reuse a monster with stronger stats and a different visual treatment.
- Content import tools preserve user lesson sources, provenance, alternative meanings/transliterations, and a native-review report.

The expanded draft pack contains 629 vocabulary/phrase entries, 281 sentence exercises, and all 39 modern Armenian letters. Normal training uses a compact staged core; the broader imported dictionary remains visible as extension material until reviewed. Existing human/automated preview files were preserved, but the importer does not synthesize new gameplay audio. The Armenian content is demo content and still needs fluent/native-speaker review.

## Requirements

- Node.js 20.19+ or 22.12+.
- npm 10 or newer.
- Git.
- Optional: an Azure Speech resource if you want to generate the Armenian neural-audio candidate set described in `docs/ARMENIAN_AUDIO_GENERATION.md`.
- The active renderer is Phaser 2D in `apps/web/src/components/PhaserWorld.tsx`.

## Most useful guides

- `docs/git-first-setup.md` — first commit and private GitHub repository
- `docs/local-mobile-testing.md` — LAN, Xcode/iPhone, and Android local installs
- `docs/content-import.md` — regenerate and review Armenian content
- `docs/language-pack-schema.md` — pack files and provenance
- `docs/privacy-child-safety.md` — family-testing checklist
- `docs/troubleshooting.md` — common setup and runtime problems

## First local run

```bash
npm install
npm run validate:content
npm run dev
```

Then open the local URL printed by Vite, usually:

```bash
http://localhost:5173
```

Browsers usually require a click/tap before audio can play. Tap the screen or the sound button if sound does not start immediately.

## Project structure

```text
apps/
  web/                         Browser app
    public/content-packs/       Runtime audio served by Vite
    public/assets/pixel/        Synced runtime spritesheets and backgrounds
    src/
      App.tsx                   Game state machine and overlays
      App.css                   Mobile UI, panels, bottom sheets, responsive layout
      audio.ts                  Web Audio effects and Armenian-safe lesson-audio selection
      gameConfig.ts             Pack-backed training, enemies, fight gates, shop data
      storage.ts                Local profiles, settings, and labyrinth persistence
      labyrinth.ts              Procedural maze, fog, encounters, and session state
      i18n.ts                   Pack UI-text bridge plus fallback copy
      contentMerge.ts           Browser-side contribution merge
      components/
        AdminPanel.tsx          Browser recording and contribution export/import
        FitText.tsx             Shrinks long text to fit prompts/options
        PhaserWorld.tsx         Phaser 2D side-scroller, sprite hero, parallax, encounters
        LabyrinthPanel.tsx       Isometric maze map, fog, hearts, and question stage
        SettingsPanel.tsx       Profiles, appearance, pack/audio/debug settings
        HeroStatsPanel.tsx      Hero status and capped attributes
        QuestionCard.tsx        Training/fight question UI
        ShopPanel.tsx           Level-unlocked item backlog
        StoryPanel.tsx          Compact chapter card and full-screen reader
packages/
  content-schema/              Shared pack types, YAML/JSONL loader, validation
  learning-engine/             Scoring, mastery, coins, caps, distractors, questions
content-packs/
  hy-eastern-it/               Modular Eastern Armenian through Italian pack
    pack.yaml
    interface.yaml
    tags.yaml
    tasks.yaml
    levels.yaml
    enemies.yaml
    story.yaml
    labyrinths.yaml
    dictionary/
      words.jsonl
      letters.jsonl
      sentences.jsonl
    audio/
      auto/
      human/
asset-packs/
  starter-camp/                Placeholder for future external art/audio asset packs
docs/
  architecture.md
  audio-and-contributions.md
  mobile-build.md
  v0.7-modular-pack-and-pixel-world.md
  v0.8-phaser-side-scroller.md
  mvp-iterations.md
  roadmap.md
tools/
  validate-content.mjs         Validate modular language packs
  generate-automated-audio.mjs Generate Azure Armenian neural MP3 candidates
  merge-contribution.mjs       Merge admin-panel contribution JSON into JSONL files
  pack-utils.mjs               Node-side modular pack loader/writer helpers
```

## Git setup

Install Git LFS before the first `git add`; see `docs/git-first-setup.md` for the exact private-repository workflow for `paolo-marcatili`. From inside this folder:

```bash
git init -b main
git add .
git commit -m "Hero Language Camp v0.14.0"
```

Create an empty GitHub repository named `hero-language-camp`, then connect and push:

```bash
git remote add origin git@github.com:paolo-marcatili/hero-language-camp.git
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/paolo-marcatili/hero-language-camp.git
git push -u origin main
```

## Development scripts

```bash
npm run dev                # Start the web app
npm run build              # Build the web app
npm run preview            # Preview the production build
npm run validate:content   # Validate the default language pack
npm run typecheck          # Run TypeScript checks
npm run check              # Validate content and typecheck
npm run content:restructure # Rebuild controlled curriculum tags and core sequencing
npm run content:auto-audio # Generate core Armenian neural audio (requires Azure credentials)
npm run content:merge -- ./contribution.json # Merge admin-panel content/audio
npm run assets:import-companion -- /path/to/dragon-sheets.zip # Normalize 25-frame dragon sheets
npm run assets:generate-labyrinth-walls # Restore low single-edge labyrinth wall guides
```

## Editing the language pack

Most pack rules are meant to be edited without touching app code.

To add or change semantic tags:

```text
content-packs/hy-eastern-it/tags.yaml
```

To change training sessions:

```text
content-packs/hy-eastern-it/tasks.yaml
```

To change learning stages, grammar guidance, stat caps, fight requirements, or soft-timer defaults:

```text
content-packs/hy-eastern-it/levels.yaml
```

To add or edit monsters and their preferred topics:

```text
content-packs/hy-eastern-it/enemies.yaml
```

To tune labyrinth size, hearts, question budget, tags, and treasure rewards:

```text
content-packs/hy-eastern-it/labyrinths.yaml
```

To add words, letters, or sentence-order exercises:

```text
content-packs/hy-eastern-it/dictionary/words.jsonl
content-packs/hy-eastern-it/dictionary/letters.jsonl
content-packs/hy-eastern-it/dictionary/sentences.jsonl
```

For a different base language, create a separate pack such as `hy-eastern-en` instead of switching the base language inside the app.

## Adding human audio and sentences

The easiest path is the in-app admin page:

1. Run `npm run dev`.
2. Open Settings and press **Edit dictionary**.
3. Choose Word or Sentence, or click an existing vocabulary row to load it.
4. Add Armenian text, Italian meaning, transliteration, introduction stage, and controlled tags.
5. Record audio and press **Stop**.
6. With **Auto-save after Stop** enabled, the recording is merged immediately into the browser copy of the pack.
7. Press **Export pack** or **Download contribution** to create a JSON file for Git/community review.

For a repository merge, run:

```bash
npm run content:merge -- ./my-contribution.json
npm run validate:content
```

If the word or sentence already exists, both the browser merge and terminal merge append audio to the existing entry and do not overwrite previous recordings.

See `docs/audio-and-contributions.md` for details.

## Mobile version

The MVP remains web-first. A mobile app can be created later with Capacitor after the web version is stable. See:

```text
docs/mobile-build.md
```

## Content quality note

The Armenian starter pack is demo content. It should be reviewed by fluent/native speakers before being treated as educational content for children. The schema includes `review_status` fields so the app can later hide unreviewed community submissions.

Automated audio is marked as `source_type: "automated"` or `source_type: "browser_tts"` and `review_status: "draft"`. It is useful for prototyping, but human recordings are the intended default for real learning packs.

## License

MIT for the code. Each content pack and asset pack should declare its own license because language data, recordings, images, and game assets may have different rights.

## Asset editing quick note

The source asset pack is `asset-packs/cc0-pixel-v10/`. After editing or replacing
sprites there, run:

```bash
npm run assets:sync
```

`npm run assets:generate` is now a safe alias for sync. To intentionally recreate
the procedural placeholder art, use `npm run assets:generate-placeholders`.
See `docs/assets-workflow.md` for details.


### Importing the 25-frame hero animations

The original seven source files are kept under:

```text
asset-packs/cc0-pixel-v10/sources/hero-animation-sheets/
```

Rebuild and sync the bundled hero sheets with:

```bash
npm run assets:import-hero-and-sync
```

Import another compatible directory or ZIP with:

```bash
npm run assets:import-hero -- /absolute/path/to/spritesheet.zip
npm run assets:sync
```

Each source image must be a transparent 5 x 5 grid containing 25 square
frames. See `docs/v0.11.0-multi-sheet-hero-animations.md`.

### Realistic-style scenery assets

The default scenery/object art can be regenerated with:

```bash
npm run assets:generate-realistic
```

For hand-edited art, edit files under `asset-packs/cc0-pixel-v10/` and then run `npm run assets:sync` only.

## Danish Foundations — Phases C and D

This monorepo includes a separate Danish early-literacy and mathematics application:

```text
apps/danish-foundations/
packages/foundations-engine/
content-packs/da-foundations/
```

The current Danish course contains 14 chapters, 25 introductory graphemes, 127 words, 75 reading tasks, and 196 mathematics tasks through numbers and operations to 20. It also includes narrated pre-reader instructions, three labyrinth bands, scalable enemies, offline support, and a parent progress summary.

Run it locally with:

```bash
npm install
npm run check:danish
npm run dev:danish
```

Open `http://127.0.0.1:5174/`. Build the GitHub Pages version with:

```bash
GITHUB_PAGES=true GITHUB_PAGES_BASE=/danish-foundations/ npm run build:danish
```

See `docs/DANISH_FOUNDATIONS_PHASE_CD.md` and `docs/DANISH_AUDIO_GENERATION.md`.
