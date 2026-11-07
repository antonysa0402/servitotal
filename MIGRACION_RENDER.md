# Traslado del servicio existente a antonysa0402/servitotal

Esta integración conserva el código funcional de `servitotal` y adapta la entrega
al servicio Git de Render existente. No crea otra aplicación ni otra base.

## Cambios

- Node 24 bookworm-slim en CI y Docker, igual que la entrega anterior en Render.
- Se conserva `montarPanelEstatico`, su caché, las mejoras de campo y las pruebas del repositorio destino.
- `/api/v1/listo` y `/api/listo` comprueban PostgreSQL; healthcheck y smoke test los utilizan.
- Creación opcional del primer administrador, solamente si no existen usuarios.
- CI publica la imagen comprobada en GHCR; CD solicita el commit exacto por hook,
  espera su estado en la API y comprueba el sitio.
- Publicación y CD solo desde `main`. CD exige `RENDER_CD_ENABLED=true`.
- Compose utiliza la misma contraseña configurable para aplicación y base.

## Compatibilidad observada

Comparación con la entrega `f1bb133`: las migraciones, `package.json` de los
workspaces y el archivo de bloqueo no presentan cambios. El repositorio destino
tiene historial independiente y mejoras funcionales: no se debe reemplazar por
el fork ni forzar el historial. Se prueba esta integración antes de activarla.

## Activación pendiente

1. Obtener acceso de escritura y revisión del repositorio destino.
2. Ejecutar CI en la propuesta de integración y revisar resultados.
3. Configurar secretos `RENDER_DEPLOY_HOOK_URL` y `RENDER_API_KEY` en el destino.
   Los secretos de GitHub no pueden leerse para copiarlos del fork.
4. Configurar `RENDER_SERVICE_ID=srv-dbmjtbbm8hqs73am4dgg` y
   `RENDER_PUBLIC_URL=https://servitotal-demo.onrender.com`.
5. Mantener CD deshabilitado en el destino durante la preparación.
6. Desactivar `RENDER_CD_ENABLED` en el fork para evitar dos automatizaciones.
7. En el servicio EXISTENTE de Render, conectar `antonysa0402/servitotal`, rama
   `main`, conservando las variables de aplicación, base, región y plan.
   Mantener Auto-Deploy Off. Revisar permisos de la instalación GitHub de Render.
8. Integrar el cambio aprobado, activar CD en el destino y ejecutar el workflow.
9. Verificar commit publicado, readiness, sesión administrativa y datos previos.

No ejecutar semillas ni eliminar volúmenes o bases. El filesystem temporal del
servicio gratuito no garantiza conservar archivos de evidencia al redesplegar.
Los usuarios y clientes PostgreSQL se conservan manteniendo la conexión actual.

## Reversión

Si la nueva entrega falla, mantener/restaurar en el mismo servicio la fuente
GMMoises/PROYECTO_SERVITOTAL, rama DOCKERCICD, y el commit previo comprobado.
Coordinar una sola automatización activa. Esta integración no cambia el esquema
SQL; no requiere una migración inversa de base.
