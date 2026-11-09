// Genera una clave simétrica de 64 bytes para JWT_SECRET (128 caracteres hexadecimales).
// Solo imprime: no guarda la clave en ningún archivo.
import { randomBytes } from 'node:crypto';

console.log(randomBytes(64).toString('hex'));
