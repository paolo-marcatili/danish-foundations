# Eastern Armenian through Italian

This is the default modular language pack for the MVP.

- `pack.yaml`: language metadata and file map
- `interface.yaml`: Italian interface/menu text
- `tags.yaml`: controlled `stage:*`, `tier:*`, topic, grammar, and function tags
- `tasks.yaml`: training tasks, stone types, and session settings
- `levels.yaml`: Level 0–8 learning goals, grammar guidance, stat caps, and fight rules
- `enemies.yaml`: monsters, preferred training skills, topic tags, and rewards
- `story.yaml`: staged story missions that reinforce each level's grammar concept
- `labyrinths.yaml`: maze question budget, events, hearts, and rewards
- `dictionary/*.jsonl`: words, letters, and sentence exercises
- `audio/human`: community recordings
- `audio/auto`: legacy generated preview audio
- `audio/auto-neural`: reviewed neural-audio candidates generated with the repository tool

Normal training uses only `tier:core` content introduced through `stage:0` to
`stage:8`. The larger `tier:extension` dictionary remains available for review
and editing but is excluded from ordinary question selection.

Human audio is preferred. Automatic audio is opt-in in gameplay. Neural audio
should be reviewed by an Eastern Armenian speaker before its status is promoted
from `draft`.
