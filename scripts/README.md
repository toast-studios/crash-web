# Build Scripts

This directory contains Node.js scripts that run during the build process.

## `validate-assets.js`

Validates that compiled assets in `public/assets/` meet size requirements.

### Usage

```bash
# Manual validation (recommended during asset updates)
npm run validate:assets

# Auto-run during pre-commit (optional)
# Uncomment the validation section in .husky/pre-commit
```

### Size Limits

| Asset Type | Max Size (After Compression) |
|------------|------------------------------|
| Single sprite (PNG/JPG/WebP) | 200 KB |
| Background image | 500 KB |
| Lottie animation JSON | 100 KB |
| Sprite sheet metadata JSON | 100 KB |

### What It Checks

- Scans all files in `public/assets/`
- Compares file sizes against limits based on extension and filename patterns
- Reports violations with actual size, limit, and excess amount
- Exit code 0 = pass, 1 = fail (suitable for CI/CD)

### Output Example

```
✅ All assets are within size limits!
   Total files checked: 147
```

Or if violations are found:

```
❌ Asset size violations detected:

   ui-background.png
      Size: 723.45 KB (limit: 500 KB)
      Exceeds by: 223.45 KB (+44.7%)

💡 Recommendations:
   • Reduce image dimensions before adding to raw-assets/
   • Use WebP format for better compression
   • For backgrounds, use JPG instead of PNG
   • Run "npm run assets" to recompress with updated settings
```

### When to Run

- **Before committing asset changes**: Catch oversized assets early
- **During code review**: Verify PR doesn't add bloat
- **In CI/CD pipeline**: Enforce limits automatically
- **Not needed during normal code changes**: Skip to avoid slowing down development

### Customizing Limits

Edit size limits in `validate-assets.js`:

```js
const SIZE_LIMITS = {
  '.png': 200 * 1024,    // 200 KB
  '.webp': 150 * 1024,   // 150 KB (WebP compresses better)
  'background': 500 * 1024, // 500 KB for backgrounds
  // ... add more patterns
};
```

### Integration with Pre-commit Hook

The asset validation is **commented out** in `.husky/pre-commit` by default to avoid slowing down commits.

To enable automatic validation on every commit, edit `.husky/pre-commit` and uncomment:

```bash
echo "  → Validating asset sizes..."
npm run validate:assets || {
  echo "⚠️  Asset size validation failed."
  exit 1
}
```

**Pros of enabling**:
- Prevents oversized assets from being committed
- Catches issues early in the development cycle

**Cons of enabling**:
- Adds 1-2 seconds to every commit
- Requires `npm run assets` to be run before committing asset changes
- Can be annoying during rapid prototyping

**Recommended**: Keep it manual during active development, enable it in CI/CD for pull requests.
