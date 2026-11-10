// Genera el hash de una contraseña para pegarlo en `users.json` (columna `password_hash`).
//
// Uso:
//   pnpm --filter @financial-risk-manager/backend run hash-password
//   (pide la contraseña sin mostrarla) o bien: printf '%s' 'la-clave' | pnpm ... run hash-password
//
// La contraseña se lee de la entrada estándar, nunca de un argumento (los argumentos quedan en el
// historial del shell). Solo imprime el hash; jamás repite la contraseña.
// Los parámetros y el formato deben coincidir con `src/services/password.service.ts`.
import { randomBytes, scrypt } from 'node:crypto';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const PARAMS = { N: 32768, r: 8, p: 3 };
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const MAX_MEMORY = 128 * 1024 * 1024;

function readAll() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

/** Lee la contraseña sin mostrarla cuando la entrada es una terminal. */
function readHidden() {
  return new Promise((resolve) => {
    process.stderr.write('Contraseña: ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (char) => {
      for (const c of char) {
        if (c === '\r' || c === '\n' || c === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stderr.write('\n');
          resolve(value);
          return;
        }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f' || c === '\b') value = Array.from(value).slice(0, -1).join('');
        else value += c;
      }
    };
    process.stdin.on('data', onData);
  });
}

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_BYTES,
      { ...PARAMS, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

const raw = process.stdin.isTTY ? await readHidden() : await readAll();
// Se descarta un único salto de línea final; los demás espacios son parte de la contraseña.
const password = raw.replace(/\r?\n$/, '');
const length = Array.from(password).length;

if (length < MIN_LENGTH || length > MAX_LENGTH) {
  console.error(`La contraseña debe tener entre ${MIN_LENGTH} y ${MAX_LENGTH} caracteres.`);
  process.exit(1);
}

const salt = randomBytes(SALT_BYTES);
const key = await deriveKey(password, salt);
console.log(
  `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`,
);
