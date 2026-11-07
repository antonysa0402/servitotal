import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { construirAplicacion } from '../../src/aplicacion.js';
import * as conexion from '../../src/infraestructura/conexion.js';

afterEach(() => vi.restoreAllMocks());
describe('Disponibilidad con PostgreSQL', () => {
  it('comprueba la base antes de indicar disponibilidad', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{}] });
    vi.spyOn(conexion, 'obtenerPiscina').mockReturnValue({ query } as unknown as ReturnType<typeof conexion.obtenerPiscina>);
    const respuesta = await request(construirAplicacion()).get('/api/v1/listo').expect(200);
    expect(query).toHaveBeenCalledWith({ text: 'SELECT 1', query_timeout: 3000 });
    expect(respuesta.body.datos.estado).toBe('listo');
  });
  it('devuelve 503 sin divulgar detalles de conexion', async () => {
    const query = vi.fn().mockRejectedValue(new Error('password=secreto'));
    vi.spyOn(conexion, 'obtenerPiscina').mockReturnValue({ query } as unknown as ReturnType<typeof conexion.obtenerPiscina>);
    const respuesta = await request(construirAplicacion()).get('/api/listo').expect(503);
    expect(respuesta.body.datos.estado).toBe('no_disponible');
    expect(respuesta.text).not.toContain('secreto');
  });
});
