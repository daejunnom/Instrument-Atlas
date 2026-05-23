import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const targetDirs = [
  'data',
  'locales'
];

const targetFiles = [
  'package.json'
];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

const changed = [];
const failed = [];

function toPosix(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function listJsonFilesRecursive(dir) {
  const absDir = path.join(rootDir, dir);
  const files = [];

  if (!fs.existsSync(absDir)) {
    return files;
  }

  function walk(currentDir) {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  walk(absDir);

  return files;
}

function readUtf8WithoutBom(filePath) {
  const buffer = fs.readFileSync(filePath);

  // UTF-8 BOM bytes: EF BB BF
  const hasUtf8Bom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;

  const cleanBuffer = hasUtf8Bom ? buffer.subarray(3) : buffer;

  return {
    text: cleanBuffer.toString('utf8'),
    hadBom: hasUtf8Bom
  };
}

function normalizeJsonFile(filePath) {
  const rel = toPosix(filePath);

  try {
    const { text, hadBom } = readUtf8WithoutBom(filePath);

    // Also remove Unicode BOM if it somehow reached the decoded string.
    const cleanText = text.replace(/^\uFEFF/, '');

    const parsed = JSON.parse(cleanText);
    const normalized = `${JSON.stringify(parsed, null, 2)}\n`;

    if (cleanText !== normalized || hadBom || text !== cleanText) {
      changed.push(rel);

      if (!checkOnly) {
        fs.writeFileSync(filePath, normalized, {
          encoding: 'utf8'
        });
      }
    }
  } catch (error) {
    failed.push({
      file: rel,
      message: error.message
    });
  }
}

function main() {
  const files = [];

  for (const dir of targetDirs) {
    files.push(...listJsonFilesRecursive(dir));
  }

  for (const file of targetFiles) {
    const absFile = path.join(rootDir, file);

    if (fs.existsSync(absFile)) {
      files.push(absFile);
    }
  }

  const uniqueFiles = Array.from(new Set(files)).sort((a, b) => a.localeCompare(b));

  for (const filePath of uniqueFiles) {
    normalizeJsonFile(filePath);
  }

  if (failed.length > 0) {
    console.error(`JSON normalization failed for ${failed.length} file(s):`);

    for (const item of failed) {
      console.error(`- ${item.file}: ${item.message}`);
    }

    process.exit(1);
  }

  if (checkOnly) {
    if (changed.length > 0) {
      console.error(`JSON normalization check failed. ${changed.length} file(s) need normalization:`);

      for (const file of changed) {
        console.error(`- ${file}`);
      }

      process.exit(1);
    }

    console.log('JSON normalization check OK');
    console.log(`Checked ${uniqueFiles.length} JSON files.`);
    return;
  }

  if (changed.length > 0) {
    console.log(`Normalized ${changed.length} JSON file(s):`);

    for (const file of changed) {
      console.log(`- ${file}`);
    }
  } else {
    console.log('All JSON files are already normalized.');
  }

  console.log(`Checked ${uniqueFiles.length} JSON files.`);
}

main();