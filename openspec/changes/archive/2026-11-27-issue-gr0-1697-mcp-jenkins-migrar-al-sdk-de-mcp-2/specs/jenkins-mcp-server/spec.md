# Spec Delta

## Purpose

Mantener el contrato público del servidor Jenkins disponible para clientes MCP mediante transporte stdio compatible.

## ADDED Requirements

### Requirement: Contrato de herramientas
El servidor SHALL exponer las 15 herramientas existentes con los mismos nombres, parámetros, descripciones y formatos de respuesta, salvo los cambios explícitos de `jenkins_wait_for_build`.

#### Scenario: Listado de herramientas
- **WHEN** un cliente MCP lista las herramientas por stdio
- **THEN** recibe los 15 nombres existentes y los esquemas conservan las descripciones de sus campos, incluidas las de `fullName` y `buildNumber` en `jenkins_wait_for_build`.

### Requirement: Compatibilidad de ejecución
El paquete SHALL exigir Node 20 o superior y servir clientes con las versiones de protocolo MCP de 2025 y 2026 por stdio.

#### Scenario: Inicio y cierre
- **WHEN** un cliente compatible inicia el servidor por stdio y posteriormente cierra stdin
- **THEN** puede listar las herramientas y el servidor termina al cerrarse stdin.
