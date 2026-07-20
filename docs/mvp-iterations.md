# MVP iterations

## Iteration 1: Unified mobile landing and path loop

Status in this version: implemented as a prototype.

- Show a mobile-friendly single-screen interface.
- Show hero status, stats, coins, story, shop, and current path progress.
- Default hero behavior is walking along a randomly generated 2D pixel-art path.
- Generate path scenery from a seed and path distance: trees, pines, mountains, caves, rocks, mushrooms, and flowers.
- Let the player open Train, Fight, and Shop as overlays instead of moving through separate pages.
- Preserve hero memory locally with `localStorage`.

## Iteration 2: Attribute-based training

Status in this version: implemented as a prototype.

- Vocabulary recognition improves Power.
- Listening comprehension improves Shield.
- Pronunciation / repeat-after-me improves Accuracy.
- Grammar / sentence order improves Strategy.
- Letter recognition is included as an extra Armenian-specific MVP activity.
- Training has 10 quick questions.
- Correct answers move the hero forward or trigger a funny success action.
- Wrong answers trigger stumble, fall, or self-punch animations.
- Distractors are randomized every question and include at least one hard distractor when content allows it.

## Iteration 3: First battle mode

Status in this version: implemented as a prototype.

- Add enemy energy.
- Add hero energy.
- Add 10-second visual timer.
- Correct answer: hero hits enemy, with funny variants such as super punch and fart attack.
- Wrong answer or timeout: enemy hits hero.
- Defeating an enemy grants coins and is the only way to unlock the next level.

## Iteration 4: Items, caps, and progression

Status in this version: implemented as a prototype.

- Add coins from training and fights.
- Add a level-based shop backlog.
- Show owned items and upcoming unlocks.
- Cap hero attributes at each level to prevent endless grinding.
- Raise the cap only when the child defeats the current level monster.

## Iteration 5: Armenian content depth

Next recommended step.

- Review all Armenian words and sentences with fluent/native speakers.
- Review Eastern/Western Armenian assumptions.
- Replace browser TTS with human recordings for key words and phrases.
- Add more beginner words and short phrases.
- Add images for image matching.
- Add separate Eastern and Western Armenian packs if needed.

## Iteration 6: Better pixel art and animation assets

Next recommended step after the loop is fun.

- Replace CSS pixel sprites with sprite sheets or canvas-rendered pixel sprites.
- Add more walk, jump, attack, fail, celebration, and item animations.
- Keep animations mapped to generic action names so the learning engine remains separate from rendering.
- Add asset-pack manifests for skins, camps, enemies, items, and sound packs.

## Iteration 7: Parent controls and optional backend storage

- Keep local persistence for the single-device MVP.
- Then add optional backend storage for families or classrooms.
- Keep child data minimal.
- Keep social features private and parent-approved.
- Avoid open chat and public leaderboards in early versions.

## Iteration 8: Community content workflow

- Add a content editor or spreadsheet importer.
- Add contributor and reviewer roles.
- Add provenance fields for words, sentences, recordings, and images.
- Add CI validation for all content packs.
