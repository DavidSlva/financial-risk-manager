import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Devuelve el texto JSX literal (con letras) de un código fuente .tsx.
 * Usa el parser de TypeScript: no confunde genéricos, flechas ni comparaciones con JSX.
 * Las expresiones `{...}` y los atributos no cuentan como texto JSX.
 */
export function findLiteralJsxText(source: string): string[] {
  const file = ts.createSourceFile(
    'component.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) found.push(node.text.trim());
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function tsxFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const srcDir = join(import.meta.dirname, '..', '..', 'src');

describe('findLiteralJsxText (heurística)', () => {
  it('detecta texto literal en JSX', () => {
    expect(findLiteralJsxText('const A = () => <p>Hola mundo</p>;')).toEqual(['Hola mundo']);
    expect(findLiteralJsxText('const A = () => <button>Entrar <b>ya</b></button>;')).toEqual([
      'Entrar',
      'ya',
    ]);
  });

  it('no da falsos positivos con expresiones, genéricos, flechas ni comparaciones', () => {
    const source = `
      import { useState } from 'react';
      const A = ({ items }: { items: Array<string> }) => {
        const [v, setV] = useState<string>('x');
        const ok = items.length > 0 && v < 'z';
        return (
          <div className="a">
            {/* comentario */}
            {items.map((i) => <span key={i}>{i}</span>)}
            <p>{ok ? 'a' : 'b'}</p>
            <button onClick={() => setV('y')}>{t('k')}</button>
          </div>
        );
      };`;
    expect(findLiteralJsxText(source)).toEqual([]);
  });
});

describe('componentes sin texto literal', () => {
  const files = [...tsxFiles(join(srcDir, 'components')), ...tsxFiles(join(srcDir, 'pages'))];

  it('hay componentes que revisar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.slice(srcDir.length + 1)} no contiene texto JSX literal`, () => {
      expect(findLiteralJsxText(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }
});
