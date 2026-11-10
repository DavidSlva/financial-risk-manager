import type { Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

/** Levanta una app Express en un puerto efímero para probarla con `fetch`. */
export async function startServer(app: Express): Promise<TestServer> {
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export interface ParsedSetCookie {
  name: string;
  value: string;
  /** Atributos en minúsculas; los que no llevan valor (HttpOnly, Secure) valen `true`. */
  attributes: Record<string, string | true>;
}

/** Cookies que el servidor puso en una respuesta (`Set-Cookie`), ya separadas y parseadas. */
export function setCookiesOf(res: Response): ParsedSetCookie[] {
  return res.headers.getSetCookie().map((header) => {
    const [pair = '', ...rest] = header.split(';').map((part) => part.trim());
    const separator = pair.indexOf('=');
    const attributes: Record<string, string | true> = {};
    for (const attribute of rest) {
      const eq = attribute.indexOf('=');
      if (eq === -1) attributes[attribute.toLowerCase()] = true;
      else attributes[attribute.slice(0, eq).toLowerCase()] = attribute.slice(eq + 1);
    }
    return { name: pair.slice(0, separator), value: pair.slice(separator + 1), attributes };
  });
}

export function cookieNamed(res: Response, name: string): ParsedSetCookie | undefined {
  return setCookiesOf(res).find((cookie) => cookie.name === name);
}
