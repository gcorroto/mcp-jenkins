# Tasks

## 1. Migración MCP 2.x

- [x] 1.1 Ejecutar `npx @modelcontextprotocol/codemod@latest v1-to-v2 .`, revisar su diff y resolver todas las marcas; verificar con búsqueda que no queda ninguna marca ni referencia al SDK anterior en código o package.json.
- [x] 1.2 Sustituir dependencias por `@modelcontextprotocol/server` ^2.4.0 y zod ^4.2.0, añadir `@modelcontextprotocol/client` de desarrollo, quitar `zod-to-json-schema` y comprobar imports antes de retirar express, @types/express y node-fetch; actualizar lockfile y verificar instalación con `npm ci`.
- [x] 1.3 Migrar las 15 herramientas a `registerTool` con `z.object`, conservar contratos y extraer `buildServer()` con `serveStdio`; revisar diff y verificar `npm run build`.
- [x] 1.4 Actualizar Node >=20 y versión 0.3.0 en package.json y common/version.ts; actualizar README y QUICKSTART para Node 20 y comprobar los valores documentados.
- [x] 1.5 Adaptar `scripts/verify-package.mjs` a las nuevas dependencias y añadir prueba real con cliente stdio 2.x y credenciales Jenkins falsas; verificar 15 nombres y descripciones de `fullName` y `buildNumber` mediante `tools/list`.

## 2. Espera de builds

- [x] 2.1 Añadir opciones y resultados de espera corta, alias obsoleto, límites, respuesta de build en curso y finalización; adaptar pruebas para valores por defecto, límites, alias y stages.
- [x] 2.2 Conservar la detección inmediata de input pendiente y URLs de decisión; comprobarla con la prueba existente adaptada.
- [x] 2.3 Añadir progreso por consulta y sleep abortable en el servicio, conectando token, notificación y señal de MCP en el handler; probar contador creciente, fallo de notificación y cancelación sin consultas posteriores.
- [x] 2.4 Actualizar descripción y parámetros de `jenkins_wait_for_build` y documentar en README y QUICKSTART el bucle mientras `stillRunning` sea true; comprobar esquemas y ejemplos.

## 3. Integración

- [x] 3.1 Ejecutar `npm run build`, `npm test` y `npm run check` (incluye `pack:verify` y `smoke:tarball`); resolver fallos y comprobar ausencia de marcas del codemod.
- [x] 3.2 Preparar el resumen final con cada problema de migración y su solución, incluidos codemod, ajustes manuales, zod y ts-jest cuando proceda; comprobar que refleja los resultados reales.
