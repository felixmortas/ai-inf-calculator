import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { marked, Renderer } from 'marked';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const methodologyModule = 'virtual:methodology-content';

function methodologyContent() {
  return {
    name: 'methodology-content',
    resolveId(source: string) {
      return source === methodologyModule ? `\0${methodologyModule}` : undefined;
    },
    load(this: { addWatchFile(file: string): void }, id: string) {
      if (id !== `\0${methodologyModule}`) return undefined;
      const directory = resolve(process.cwd(), 'docs/methodology');
      if (!readdirSync(directory).includes('fr.md')) throw new Error('docs/methodology/fr.md est requis (langue de repli).');
      readdirSync(directory).forEach((name) => this.addWatchFile(resolve(directory, name)));
      const renderer = new Renderer();
      renderer.html = ({ text }) => text.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[character]!);
      const html = Object.fromEntries(readdirSync(directory).filter((name) => name.endsWith('.md')).sort().map((name) => {
        const markdown = readFileSync(resolve(directory, name), 'utf8');
        return [name.slice(0, -3), marked.parse(markdown.replace(/^\uFEFF?\s*# .*(\r?\n+|$)/, ''), { async: false, renderer })
          .replace(/<(\/?)h([1-6])>/g, (_tag, closing: string, depth: string) => `<${closing}h${Math.min(Number(depth) + 2, 6)}>`)];
      }));
      return `export default ${JSON.stringify(html)};`;
    },
  };
}

export default defineConfig({
  base: '/ai-inf-calculator/',
  plugins: [methodologyContent(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
  },
});
