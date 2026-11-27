# Design

## Context

El servidor ESM usa 15 registros `server.tool`, SDK 1.6.1 y stdio. El servicio de espera también es consumido por `jenkins_build_manager`; su esquema público debe mantenerse. `common/version.ts` contiene actualmente 0.1.6, distinto de package.json. La verificación de paquete exige explícitamente dependencias antiguas y debe migrarse también.

## Goals / Non-Goals

**Goals:** preservar el contrato MCP, facilitar futuras migraciones y acotar la espera con cancelación y progreso independientes del SDK en el servicio.

**Non-Goals:** transporte HTTP, MCP Events y cambios de Jenkinsfile o publicación.

## Decisions

- Ejecutar primero el codemod oficial y revisar manualmente todas sus marcas y cambios. Usar `@modelcontextprotocol/server` ^2.4.0, zod ^4.2.0 y Node >=20; reemplazar raw shapes por `z.object`, y registrar las herramientas en `buildServer()` con `registerTool`. Usar `serveStdio` desde el subpath stdio; si falla, documentar el motivo y usar `StdioServerTransport` y `connect`. La alternativa de dejar el registro obsoleto no cumple el contrato de migración.
- El servicio recibe `signal` y `onProgress` opcionales, sin importar el SDK. El handler adapta `ctx.mcpReq` y captura fallos de notificación; el contador crece por consulta. Se informa del stage solo si está disponible a bajo coste, evitando una dependencia de wfapi en cada consulta.
- Resolver duración como `waitSeconds ?? timeoutSeconds ?? 50`, limitada a 0–300; limitar intervalo a 2–60 y dormir solo hasta el plazo restante. Consultar al menos una vez incluso con duración cero; comprobar la señal antes de nuevas consultas y hacer abortable la pausa. Conservar el resultado de input manual y stages opcionales. `jenkins_build_manager` conserva su esquema y pasa sus argumentos existentes al servicio compartido; por tanto su acción wait también queda acotada, sin modificar su contrato de entrada.
- El test de humo compila y ejecuta el servidor real con el cliente SDK 2.x y credenciales falsas, verificando nombres y descripciones del esquema. Adaptar `scripts/verify-package.mjs` para comprobar las nuevas dependencias e imports del tarball, en lugar de mantener verificaciones obsoletas.

## Risks / Trade-offs

- [Zod 3 o 4.0–4.1 puede compilar pero perder compatibilidad o descripciones] → fijar mínimo 4.2 y comprobar `tools/list` real.
- [El codemod puede dejar errores o alterar contratos] → revisar diff, marcas, esquemas y pruebas de las 15 herramientas.
- [Las peticiones Jenkins en curso pueden tardar más que el plazo] → limitar las pausas y evitar consultas nuevas tras cancelación; el límite de espera no garantiza cortar una petición de red ya iniciada.
- [El consumidor compartido cambia duración efectiva] → conservar su entrada y documentar el límite en el informe de migración.
- [ts-jest ESM y SDK dividido pueden requerir ajustes] → validar compilación, Jest y tarball y registrar las soluciones reales en el resumen final.

## Migration Plan

Aplicar codemod y dependencias, adaptar servidor y verificación de paquete; después implementar espera, pruebas y documentación. Actualizar versión a 0.3.0 también en `common/version.ts`. Ejecutar build, tests y check; revertir el cambio completo para volver a la versión anterior si se detecta una regresión. No cambiar el flujo de despliegue.
