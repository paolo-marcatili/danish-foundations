Danish Foundations Phase B blank-page fix

Cause:
The lightweight YAML parser treated skill_weaknesses: [precision, defense]
as one string. gameConfig then called .map() on that string and React crashed.

Apply from the repository root:

  unzip -o ~/Downloads/danish-foundations-phase-b-blank-page-fix.zip -d .
  npm run check:danish
  npm run dev:danish

Then open:

  http://127.0.0.1:5174/

The update contains complete replacement files, not a Git patch.
