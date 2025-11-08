/* eslint-env node */
import { copyFileSync } from 'fs';

// Make the output executable
try {
  copyFileSync('dist/index.js', 'dist/index.mjs');
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error);
  // eslint-disable-next-line no-undef
  process.exit(1);
}
