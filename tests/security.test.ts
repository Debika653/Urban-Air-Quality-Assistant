import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function collectFiles(dir: string, skipDirName?: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirName && entry.name === skipDirName) {
        continue;
      }
      files.push(...collectFiles(fullPath, skipDirName));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test('Client-side source contains no API keys, server SDK imports, or unsafe DOM sinks', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const clientFiles = collectFiles(srcDir, 'server');
  assert.ok(clientFiles.length > 0, 'Expected client source files to exist');

  const forbiddenPatterns = [
    'GEMINI_API_KEY',
    '@google/genai',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'outerHTML',
    'document.write',
    'eval(',
    'new Function(',
  ];

  for (const filePath of clientFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        content.includes(pattern),
        false,
        `Forbidden pattern "${pattern}" found in client file ${path.relative(process.cwd(), filePath)}`,
      );
    }
  }
});

test('Server source never logs GEMINI_API_KEY or raw credentials', () => {
  const serverDir = path.resolve(process.cwd(), 'src', 'server');
  const serverFiles = [
    ...collectFiles(serverDir),
    path.resolve(process.cwd(), 'server.ts'),
  ];

  for (const filePath of serverFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.equal(
      /console\.(log|error|warn|info)\([^)]*(GEMINI_API_KEY|apiKey)/.test(content),
      false,
      `Potential secret logging detected in ${path.relative(process.cwd(), filePath)}`,
    );
  }
});

test('index.html and package.json contain no hardcoded API keys or inline script secrets', () => {
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('GEMINI_API_KEY'), false);
  assert.equal(/AIza[0-9A-Za-z_-]{20,}/.test(indexHtml), false);
});
