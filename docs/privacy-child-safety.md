# Family prototype privacy and child-safety checklist

This release is intended for local family testing. It has no advertising,
public profiles, chat, or global leaderboards.

## Current data model

- Child profiles and progress stay in local app/browser storage.
- Dictionary edits and recordings stay on the device unless an adult exports
  them.
- Human-only audio is the default.
- There is no cloud account or cross-device synchronization.

## Before sharing outside the family

- Review every Armenian spelling, translation, sentence, and recording license.
- Replace identifying names/details with generic examples.
- Publish a privacy notice that explains local storage and microphone use.
- Require adult-controlled contribution accounts.
- Store submitted recordings in a review queue rather than publishing them
  immediately.
- Avoid open chat, public friend search, or public child usernames.
- Decide retention and deletion rules for voice recordings.
- Complete the relevant child-directed-app declarations before any public store
  release.

## Microphone

The microphone is used only after an explicit recording action in the adult
content editor. The normal learning game does not require recording. A native
iOS build needs an `NSMicrophoneUsageDescription` entry in `Info.plist`.
