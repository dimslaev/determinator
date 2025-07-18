# Publishing Spaider to NPM

This guide walks through publishing the Spaider package to NPM.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **NPM CLI**: Ensure you have npm installed and are logged in:
   ```bash
   npm login
   ```
3. **Package Name**: Verify `spaider` is available on NPM (it should be, as it's currently a unique name)

## Pre-Publishing Checklist

- [ ] Updated version in `package.json` (currently 1.0.0)
- [ ] All tests pass: `npm run test-a`, `npm run test-b`, `npm run test-c`
- [ ] Code builds successfully: `npm run build`
- [ ] CLI works: `npm run cli -- --help`
- [ ] Package contents verified: `npm pack --dry-run`
- [ ] README.md is up to date with usage instructions
- [ ] LICENSE file exists

## Publishing Steps

### 1. Final Verification

```bash
# Clean build
rm -rf dist/
npm run build

# Test locally
npm run cli -- --version
./dist/cli.js --help

# Verify package contents
npm pack --dry-run
```

### 2. Publish to NPM

```bash
# Publish (this will run prepublishOnly script automatically)
npm publish

# For scoped packages (if needed):
# npm publish --access public
```

### 3. Verify Publication

```bash
# Test global installation
npm install -g spaider
spaider --version

# Test npx usage
npx spaider --help
```

## Post-Publishing

1. **GitHub Release**: Create a release tag on GitHub
2. **Update Documentation**: Ensure README.md reflects the published package
3. **Test Installation**: Test on a fresh machine/container

## Troubleshooting

### Package Name Conflicts

If `spaider` is taken, update the name in `package.json`:

```json
{
  "name": "@your-username/spaider",
  "bin": {
    "spaider": "dist/cli.js"
  }
}
```

### Version Issues

Update version for republishing:

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Testing NPX Before Publishing

You can test the package locally using the generated tarball:

```bash
# Install from local tarball
npm install -g ./spaider-1.0.0.tgz

# Test the CLI
spaider --version

# Uninstall
npm uninstall -g spaider
```

## Environment Variables

**For Development/Testing:**
Create a `.env` file in the project root:

```
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini  # or your preferred model
```

**For End Users:**
Spaider automatically looks for `.env` files in the user's project directory. Users will create their own `.env` file:

```bash
# In their project root
echo "OPENAI_API_KEY=their_api_key" > .env
echo "OPENAI_MODEL=gpt-4o-mini" >> .env
```

The CLI will:

1. Look for `.env` in the user's project root (`--root` option)
2. Fall back to current working directory
3. Show helpful error messages if OPENAI_API_KEY is missing

## Success!

Once published, users can use Spaider with:

```bash
# Install globally
npm install -g spaider
spaider "your prompt" -f file.ts

# Or use directly with npx
npx spaider "your prompt" -f file.ts
```
