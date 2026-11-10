# Plan — 008-validador-rut

Spec: [../../specs/008-validador-rut.md](../../specs/008-validador-rut.md)

## Enfoque

Una función pura `isValidRut` (formato por expresión regular y DV por módulo 11), usada en tres puntos: la integridad de datos, el contrato de login y el parámetro de score.

## Diseño

```ts
// services/rut.service.ts
const FORMAT = /^[1-9]\d{6,7}-[\dK]$/;

export function isValidRut(value: unknown): value is string {
  if (typeof value !== 'string' || !FORMAT.test(value)) return false;
  const [body, dv] = value.split('-') as [string, string];
  return computeCheckDigit(body) === dv;
}
```

`data-integrity.service`: IR-13 sobre `users.rut` y `scores.rut`, solo para las filas que ya pasaron IR-2/IR-3 (para no duplicar violaciones por tipo).

## Decisiones técnicas

| Decisión                                          | Alternativas                 | Motivo                                                                            |
| ------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| Validar, no normalizar                            | Aceptar puntos/`k` y limpiar | Pedido: el frontend envía el formato canónico; una sola representación            |
| DV por módulo 11 implementado a mano              | Librería de RUT              | Veinte líneas; evita una dependencia nueva bajo la cuarentena                     |
| Expresión regular + cálculo del DV                | Solo regex                   | La regex no detecta un DV equivocado                                              |
| `isValidRut` como _type guard_ sobre `unknown`    | Recibir `string`             | Se usa directamente sobre cuerpos de petición sin confiar en su tipo              |
| IR-13 en la integridad de datos                   | Validar solo en la API       | Un RUT mal escrito en `users.json` nunca podría iniciar sesión; falla al arrancar |
| Validar `:rut` de score tras `authorize`          | Validar antes de autenticar  | No cambiar el orden de seguridad: sin permiso, 403 sin importar el formato        |
| Cuerpo de 7 a 8 dígitos, sin ceros a la izquierda | Aceptar cualquier largo      | Rango real de RUT; una sola representación por persona                            |

## Riesgos

- Un RUT real fuera de 1.000.000–99.999.999 se rechaza (punto abierto).
- IR-13 hace que un RUT mal escrito en los datos impida arrancar: es lo buscado.

## Verificación (TDD)

Tabla de casos de la spec como pruebas (válidos e inválidos), cálculo del DV con `0` y `K`, entradas que no son string, IR-13 sobre ambos archivos sin cascada, y el `400` del parámetro de score con el orden 401 → 403 → 400 → 404.
