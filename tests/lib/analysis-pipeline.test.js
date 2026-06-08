import { describe, it, expect } from 'vitest';

// Use a dynamic import or manual copy of the regex if needed, 
// but here we test the actual logic from repository-snapshot.js
// We might need to export isBlockedPath or test it indirectly via finalizedSnapshotEntries

import { createFolderUploadSnapshot } from '@/lib/repository-snapshot';

describe('Analysis Pipeline - Filtering', () => {
  it('blocks sensitive files and directories', async () => {
    const files = [
      { name: 'src/index.js', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: 'node_modules/lodash/index.js', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: '.git/config', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: '.env', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: '.env.production', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: '.env.example', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }, // Should NOT be blocked
      { name: 'dist/bundle.js', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      { name: '.ssh/id_rsa', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
    ];

    const snapshot = await createFolderUploadSnapshot(files, 'test-repo');
    
    const paths = snapshot.fileTree.map(f => f.path);
    
    expect(paths).toContain('src/index.js');
    expect(paths).toContain('.env.example');
    
    expect(paths).not.toContain('node_modules/lodash/index.js');
    expect(paths).not.toContain('.git/config');
    expect(paths).not.toContain('.env');
    expect(paths).not.toContain('.env.production');
    expect(paths).not.toContain('dist/bundle.js');
    expect(paths).not.toContain('.ssh/id_rsa');
  });

  it('blocks binary files', async () => {
    // Create a buffer that looks like a binary file (contains null byte)
    const binaryBuffer = new Uint8Array([0, 1, 2, 3]).buffer;
    const files = [
      { name: 'image.png', arrayBuffer: () => Promise.resolve(binaryBuffer) },
      { name: 'main.js', arrayBuffer: () => Promise.resolve(Buffer.from('console.log("hello")').buffer) }
    ];

    const snapshot = await createFolderUploadSnapshot(files, 'test-repo');
    
    // Binary files are excluded from textFiles but might still be in fileTree
    const textPaths = snapshot.textFiles.map(f => f.path);
    expect(textPaths).not.toContain('image.png');
    expect(textPaths).toContain('main.js');
  });
});
