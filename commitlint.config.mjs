/**
 * Conventional Commits + una única regla propia: el scope es el id numérico de la spec.
 * Ejemplo: feat(003): agregar tooling de calidad
 */
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'scope-spec-id': (parsed) => {
          const ok = /^\d{3}$/.test(parsed.scope ?? '');
          return [
            ok,
            'el scope debe ser el id numérico (3 dígitos) de la spec, ej. feat(003): ...',
          ];
        },
      },
    },
  ],
  rules: {
    'scope-spec-id': [2, 'always'],
  },
};
