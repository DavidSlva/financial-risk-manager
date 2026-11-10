#!/usr/bin/env node
// Verifica que pnpm-workspace.yaml conserve la política de cadena de suministro (spec 004).
// Sin dependencias: lee solo las claves de primer nivel.
import { readFileSync } from 'node:fs';

const MIN_AGE_MINUTES = 10080; // 7 días

const text = readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8');

/** Mapa clave -> valor crudo (sin comentarios) de las claves de primer nivel. */
const top = new Map();
for (const line of text.split(/\r?\n/)) {
  const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*(?:#.*)?$/.exec(line);
  if (m) top.set(m[1], m[2]);
}

const errors = [];

const age = Number(top.get('minimumReleaseAge'));
if (!Number.isFinite(age) || age < MIN_AGE_MINUTES) {
  errors.push(
    `minimumReleaseAge debe ser >= ${MIN_AGE_MINUTES} (7 días); actual: ${top.get('minimumReleaseAge') ?? 'no definido'}`,
  );
}
if (top.get('minimumReleaseAgeStrict') !== 'true') {
  errors.push('minimumReleaseAgeStrict debe ser true');
}
if (top.get('blockExoticSubdeps') !== 'true') {
  errors.push('blockExoticSubdeps debe ser true');
}
if (top.get('strictDepBuilds') === 'false') {
  errors.push('strictDepBuilds no puede ser false');
}
if (top.get('dangerouslyAllowAllBuilds') === 'true') {
  errors.push('dangerouslyAllowAllBuilds no puede ser true');
}
if (top.has('minimumReleaseAgeExclude')) {
  errors.push('minimumReleaseAgeExclude no está permitido sin una spec que lo justifique');
}

// allowBuilds debe estar vacío: `allowBuilds: {}` o sin entradas indentadas.
const allowValue = top.get('allowBuilds');
if (allowValue !== undefined && allowValue !== '{}' && allowValue !== '') {
  errors.push('allowBuilds debe estar vacío');
}
if (allowValue === '') {
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => /^allowBuilds:/.test(l));
  const next = lines.slice(i + 1).find((l) => l.trim() !== '' && !l.trim().startsWith('#'));
  if (next && /^\s+\S/.test(next))
    errors.push('allowBuilds debe estar vacío (sin paquetes aprobados)');
}

if (errors.length > 0) {
  console.error('Política de pnpm incumplida:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(
  'Política de pnpm OK (cuarentena 7 días estricta, fuentes ocultas bloqueadas, sin allowBuilds).',
);
