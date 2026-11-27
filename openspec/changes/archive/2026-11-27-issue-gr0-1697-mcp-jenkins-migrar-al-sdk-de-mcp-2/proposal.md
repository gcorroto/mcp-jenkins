# Proposal

## Why

Las esperas de hasta 30 minutos pierden su resultado cuando un cliente o proxy MCP agota su timeout. Migrar primero al SDK 2.x permite pilotar el cambio de plataforma y añadir esperas cortas con progreso y cancelación.

## What Changes

- **BREAKING**: exigir Node 20 y actualizar el servidor stdio a MCP SDK 2.x y zod 4.2 o superior; publicar la versión 0.3.0.
- Conservar los nombres, parámetros, descripciones y formatos de las 15 herramientas, salvo los cambios explícitos de `jenkins_wait_for_build`.
- Sustituir las esperas largas por llamadas breves que devuelven instrucciones para volver a consultar, manteniendo la detección de input manual y añadiendo progreso y cancelación.
- Actualizar documentación y pruebas, incluida una prueba real de listado de herramientas mediante stdio y el cliente SDK 2.x.

## Capabilities

### New Capabilities

- `jenkins-build-wait`: espera acotada de builds, progreso, cancelación y detección de input manual.
- `jenkins-mcp-server`: contrato de herramientas y compatibilidad del servidor MCP por stdio.

### Modified Capabilities

Ninguna; no hay especificaciones principales existentes.

## Impact

Afecta a `index.ts`, el servicio Jenkins y sus tipos, dependencias y lockfile, pruebas, README y QUICKSTART. No se añade transporte HTTP ni se modifica Jenkinsfile o el flujo de publicación.
