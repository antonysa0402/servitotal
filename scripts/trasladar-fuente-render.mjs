// Operacion manual: cambia solamente la fuente Git del servicio existente.
import assert from 'node:assert/strict';
const { RENDER_API_KEY: key, RENDER_SERVICE_ID: service } = process.env;
assert.ok(key && service, 'Falta configurar la API key o el servicio.');
assert.equal(service, 'srv-dbmjtbbm8hqs73am4dgg', 'Servicio inesperado; no se modifica.');
const destino = 'https://github.com/antonysa0402/servitotal';
const origen = 'https://github.com/GMMoises/PROYECTO_SERVITOTAL';
const base = `https://api.render.com/v1/services/${service}`;
async function api(url, options = {}) {
  const r = await fetch(url, { ...options, headers: {
    Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
  }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Render respondio HTTP ${r.status}; revisar permisos y vinculacion Git.`);
  return r.json();
}
const normalizar = r => r.replace(/\.git$/, '').toLowerCase();
async function entorno() {
  const variables = [];
  let cursor;
  do {
    const url = new URL(`${base}/env-vars`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const pagina = await api(url);
    for (const entrada of pagina) variables.push(entrada.envVar);
    cursor = pagina.length === 100 ? pagina.at(-1).cursor : undefined;
  } while (cursor);
  return variables.sort((a, b) => a.key.localeCompare(b.key));
}
const antes = await api(base);
assert.equal(antes.name, 'servitotal-demo', 'Nombre de servicio inesperado.');
assert.ok([normalizar(origen), normalizar(destino)].includes(normalizar(antes.repo || '')), 'Origen inesperado; no se modifica.');
const variablesAntes = await entorno();
assert.ok(variablesAntes.some(v => v.key === 'DATABASE_HOST'), 'No se encontro la configuracion PostgreSQL existente.');
await api(base, { method: 'PATCH', body: JSON.stringify({
  repo: destino, branch: 'main', autoDeployTrigger: 'off',
}) });
const despues = await api(base);
assert.equal(normalizar(despues.repo), normalizar(destino));
assert.equal(despues.branch, 'main');
assert.ok(despues.autoDeployTrigger === 'off' || despues.autoDeploy === 'no');
// No usar assert.deepEqual: un fallo imprimiria valores secretos.
if (JSON.stringify(variablesAntes) !== JSON.stringify(await entorno())) {
  throw new Error('La configuracion de entorno no coincide. Detener CD y revisar sin publicar secretos.');
}
assert.equal(despues.serviceDetails?.url, antes.serviceDetails?.url);
console.log('Mismo servicio, URL y variables de entorno. Fuente actualizada a antonysa0402/servitotal, main; Auto-Deploy Off.');
