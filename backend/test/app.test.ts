import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('app', () => {
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('GET /api/health responde 200 con el estado', async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('una ruta inexistente responde 404 en JSON', async () => {
    const res = await fetch(`${baseUrl}/api/nope`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('POST /api/auth/refresh está registrado y rechaza una cookie inválida con 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: 'refresh_token=basura' },
    });

    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login está registrado y valida el contrato (400)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('un JSON malformado responde 400 genérico (no 500)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ roto',
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Bad Request' });
  });

  it('GET /api/score/:rut está registrado y exige autenticación (401)', async () => {
    const res = await fetch(`${baseUrl}/api/score/11111111-1`);

    expect(res.status).toBe(401);
  });

  it('no expone la cabecera x-powered-by', async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
