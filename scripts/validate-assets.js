#!/usr/bin/env node

/**
 * Asset Validation Script
 * 
 * Checks compiled assets in public/assets/ for files exceeding size limits.
 * Run via: npm run validate:assets
 * 
 * Exit codes:
 *   0 - All assets within limits
 *   1 - One or more assets exceed limits
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Size limits (in bytes)
const SIZE_LIMITS = {
  // Individual sprite images
  '.png': 200 * 1024,  // 200 KB
  '.jpg': 200 * 1024,  // 200 KB
  '.jpeg': 200 * 1024, // 200 KB
  '.webp': 200 * 1024, // 200 KB
  
  // Texture atlas combined files (allow larger since they contain multiple sprites)
  '.json': 100 * 1024, // 100 KB (sprite sheet metadata)
  
  // Backgrounds and large images (identified by filename patterns)
  'background': 500 * 1024, // 500 KB
  'bg-': 500 * 1024,        // 500 KB
  
  // Lottie animations
  'lottie': 100 * 1024,     // 100 KB
};

// Files/directories to skip
const SKIP_PATTERNS = [
  'assets-manifest.json', // Manifest file can be large
  '.DS_Store',
  'Thumbs.db',
];

const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Assets directory not found: ${dir}`);
    console.warn('   Run "npm run assets" to compile assets first.');
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (SKIP_PATTERNS.some(pattern => file.includes(pattern))) {
      return;
    }

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Get size limit for a file based on its extension and name
 */
function getSizeLimit(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  // Check for special filename patterns first
  if (basename.includes('background') || basename.startsWith('bg-')) {
    return SIZE_LIMITS['background'];
  }

  if (basename.includes('lottie')) {
    return SIZE_LIMITS['lottie'];
  }

  // Default to extension-based limit
  return SIZE_LIMITS[ext] || Infinity;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate all assets
 */
function validateAssets() {
  console.log('🔍 Validating asset sizes...\n');

  const files = getAllFiles(ASSETS_DIR);
  const violations = [];

  files.forEach(filePath => {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const limit = getSizeLimit(filePath);
    const relativePath = path.relative(ASSETS_DIR, filePath);

    if (fileSize > limit) {
      violations.push({
        path: relativePath,
        size: fileSize,
        limit: limit,
        excess: fileSize - limit,
      });
    }
  });

  // Report results
  if (violations.length === 0) {
    console.log('✅ All assets are within size limits!\n');
    console.log(`   Total files checked: ${files.length}`);
    return true;
  }

  console.error('❌ Asset size violations detected:\n');
  
  violations.forEach(v => {
    const excessPercent = ((v.excess / v.limit) * 100).toFixed(1);
    console.error(`   ${v.path}`);
    console.error(`      Size: ${formatBytes(v.size)} (limit: ${formatBytes(v.limit)})`);
    console.error(`      Exceeds by: ${formatBytes(v.excess)} (+${excessPercent}%)\n`);
  });

  console.error('💡 Recommendations:');
  console.error('   • Reduce image dimensions before adding to raw-assets/');
  console.error('   • Use WebP format for better compression');
  console.error('   • For backgrounds, use JPG instead of PNG');
  console.error('   • Run "npm run assets" to recompress with updated settings');
  console.error('   • Check .assetpack.js compression quality settings\n');

  return false;
}

// Run validation
const isValid = validateAssets();
process.exit(isValid ? 0 : 1);
