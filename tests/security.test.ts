import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function collectClientFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'server') {
        continue;
      }
      files.push(...collectClientFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test('Client-side source contains no API keys, server SDK imports, or unsafe DOM sinks', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const clientFiles = collectClientFiles(srcDir);
  assert.ok(clientFiles.length > 0, 'Expected client source files to exist');

  const forbiddenPatterns = [
    'GEMINI_API_KEY',
    '@google/genai',
    'dangerouslySetInnerHTML',
    'innerHTML',
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
