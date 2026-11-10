#!/usr/bin/env node
// Regenera, desde el front matter de cada spec, las columnas "Depende de" y "Relacionada con"
// del índice y el grafo Mermaid de docs/specs/README.md. El front matter es la fuente de verdad.
// Uso: node scripts/sync-spec-index.mjs [--check]   (--check no escribe; falla si hay diferencias)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const specsDir = new URL('../docs/specs/', import.meta.url);
const indexPath = new URL('README.md', specsDir);

const specs = new Map();
for (const file of readdirSync(specsDir).filter((f) => /^\d{3}-.+\.md$/.test(f))) {
  const front =
    /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(fileURLToPath(specsDir), file), 'utf8'))?.[1] ??
    '';
  const read = (key) =>
    new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(front)?.[1].replace(/#.*$/, '').trim() ?? '';
  const list = (key) =>
    read(key)
      .replace(/[[\]]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  specs.set(file.replace(/\.md$/, ''), { depends: list('depends_on'), related: list('related') });
}

const short = (id) => id.slice(0, 3);
const cell = (ids) => (ids.length === 0 ? '—' : ids.map(short).join(', '));

const original = readFileSync(indexPath, 'utf8');
let text = original;

// Columnas del índice.
text = text
  .split('\n')
  .map((line) => {
    const match = /^\| \[(\d{3}-[^\]]+)\]/.exec(line);
    const spec = match && specs.get(match[1]);
    if (!spec) return line;
    const cells = line.split('|');
    cells[4] = ` ${cell(spec.depends)} `;
    cells[5] = ` ${cell(spec.related)} `;
    return cells.join('|');
  })
  .join('\n');

// Grafo.
const ids = [...specs.keys()].sort();
const edges = [];
const seenRelated = new Set();
for (const id of ids) {
  const { depends, related } = specs.get(id);
  for (const dep of depends) edges.push(`  S${short(id)} -->|depende de| S${short(dep)}`);
  for (const rel of related) {
    const pair = [id, rel].sort().join('~');
    const linked = specs.get(rel)?.depends.includes(id) || depends.includes(rel);
    if (seenRelated.has(pair) || linked) continue;
    seenRelated.add(pair);
    edges.push(`  S${short(id)} -.->|relacionada| S${short(rel)}`);
  }
}
const graph = [
  '```mermaid',
  'graph LR',
  ...ids.map((id) => `  S${short(id)}[${id}]`),
  ...edges,
  '```',
].join('\n');
text = text.replace(/```mermaid[\s\S]*?```/, graph);

// Prettier realinea las tablas: se compara sin tener en cuenta el relleno de las celdas.
const normalize = (t) =>
  t
    .split('\n')
    .map((l) =>
      l.startsWith('|')
        ? l
            .split('|')
            .map((c) => c.trim().replace(/^-+$/, '-'))
            .join('|')
        : l,
    )
    .join('\n');

if (process.argv.includes('--check')) {
  if (normalize(text) !== normalize(original)) {
    console.error(
      'docs/specs/README.md no coincide con el front matter. Ejecutar: node scripts/sync-spec-index.mjs',
    );
    process.exit(1);
  }
  console.log('Índice de specs OK.');
} else {
  writeFileSync(indexPath, text);
  console.log(text === original ? 'Índice sin cambios.' : 'Índice actualizado.');
}
