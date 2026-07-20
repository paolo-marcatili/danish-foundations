# First Git and GitHub setup

These instructions assume the project was downloaded as a ZIP and has never
been committed. The examples use the GitHub account `paolo-marcatili` and keep
the repository private while content and licenses are reviewed.

## 1. Install Git LFS before adding files

On macOS with Homebrew:

```bash
brew install git-lfs
git lfs install
```

The repository already contains `.gitattributes` rules for PNG/JPEG/WebP,
audio, ZIP, and DOCX files. Installing LFS **before** the first `git add` means
those binaries enter Git as LFS pointers instead of bloating ordinary history.

Verify:

```bash
git lfs env
git lfs track
```

## 2. Initialize the local repository

From the project root:

```bash
git init -b main
git config user.name "Paolo Marcatili"
git config user.email "YOUR_GITHUB_EMAIL"

git add .
git status
git commit -m "Initial Hero Language Camp v0.12.0"
```

Check that binary files are using LFS:

```bash
git lfs ls-files | head
```

## 3. Create a private GitHub repository

### Browser method

1. Sign in to GitHub as `paolo-marcatili`.
2. Choose **New repository**.
3. Name it `hero-language-camp`.
4. Select **Private**.
5. Do not add a README, `.gitignore`, or license because the local project
   already contains them.
6. Create the repository.

Then connect and push:

```bash
git remote add origin git@github.com:paolo-marcatili/hero-language-camp.git
git push -u origin main
```

For HTTPS instead of SSH:

```bash
git remote add origin https://github.com/paolo-marcatili/hero-language-camp.git
git push -u origin main
```

### GitHub CLI method

```bash
gh auth login
gh repo create paolo-marcatili/hero-language-camp \
  --private \
  --source=. \
  --remote=origin \
  --push
```

## 4. Everyday workflow

Before working:

```bash
git pull --ff-only
```

After a coherent change:

```bash
npm run check
git status
git add PATHS_YOU_CHANGED
git commit -m "Describe the change"
git push
```

For artwork updates, edit `asset-packs/cc0-pixel-v10/`, then run:

```bash
npm run assets:sync
git add asset-packs apps/web/public/assets
git commit -m "Update game artwork"
git push
```

For community content updates:

```bash
npm run content:expand
npm run validate:content
git add content-packs tools/content-import
git commit -m "Expand Armenian learning content"
git push
```

## 5. Recovering from a mistake

Inspect before committing:

```bash
git diff
git diff --staged
```

Unstage without deleting edits:

```bash
git restore --staged PATH
```

Discard a local edit only when you are certain:

```bash
git restore PATH
```
