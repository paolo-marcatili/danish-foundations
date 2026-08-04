Danish Foundations workspace resolution fix

The Phase C+D archive accidentally set packages/foundations-engine to version 0.18.0,
while apps/danish-foundations depends on version 0.2.0. npm therefore attempted to
fetch a private package from npmjs.org.

Apply from the repository root:

  unzip -o ~/Downloads/danish-foundations-phase-cd-workspace-fix.zip -d .
  npm install
  npm run check:danish

The corrected local package version is 0.2.0, matching the workspace dependency.
