# @grec0/mcp-jenkins

MCP server para operar Jenkins desde clientes compatibles con Model Context Protocol, como VS Code, Claude Desktop u otros agentes. Permite consultar jobs, lanzar builds, esperar a que terminen, revisar logs, inspeccionar stages de pipelines, gestionar approvals, consultar artifacts/cobertura y administrar jobs sin entrar en la UI de Jenkins.

## Que Puedes Hacer

- Listar jobs, multibranch projects y ramas.
- Consultar estado, configuracion y ultimo build de un job.
- Lanzar builds con o sin parametros.
- Esperar de forma bloqueante hasta que un build termine.
- Ver historial de builds, logs, stages, nodos y acciones pendientes.
- Detener builds con confirmacion explicita.
- Hacer rebuild/replay si Jenkins tiene los endpoints/plugins necesarios.
- Crear, actualizar, habilitar, deshabilitar o borrar jobs usando confirmaciones de seguridad.
- Consultar reportes de cobertura cuando el job los publique.

## Quick Start

### Requisitos

- Node.js 18 o superior.
- URL de Jenkins accesible desde la maquina donde corre el cliente MCP.
- Usuario de Jenkins con permisos suficientes.
- API token o password de Jenkins.

Usa API tokens cuando sea posible. No guardes credenciales reales en repositorios ni compartas configuraciones con secretos.

### Configuracion Recomendada Con npx

```json
{
  "servers": {
    "jenkins": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package", "@grec0/mcp-jenkins@latest", "mcp-jenkins"],
      "env": {
        "JENKINS_URL": "https://tu-jenkins.com/jenkins",
        "JENKINS_USERNAME": "tu-usuario",
        "JENKINS_PASSWORD": "tu-api-token"
      }
    }
  }
}
```

Para fijar una version concreta, cambia `@latest` por una version publicada:

```json
"args": ["-y", "--package", "@grec0/mcp-jenkins@0.2.2", "mcp-jenkins"]
```

### Instalacion Global Opcional

```bash
npm install -g @grec0/mcp-jenkins
```

Configuracion usando el binario global:

```json
{
  "servers": {
    "jenkins": {
      "type": "stdio",
      "command": "mcp-jenkins",
      "env": {
        "JENKINS_URL": "https://tu-jenkins.com/jenkins",
        "JENKINS_USERNAME": "tu-usuario",
        "JENKINS_PASSWORD": "tu-api-token"
      }
    }
  }
}
```

## Conceptos Basicos

### `fullName`

La mayoria de herramientas nuevas usan `fullName`, que es la ruta logica del job en Jenkins.

Ejemplos:

```text
Grec0AI_backend_sb
Grec0AI_backend_sb/main
folder/backend/main
```

En un multibranch project, normalmente el primer nivel es el proyecto y el segundo nivel es la rama. Por ejemplo, si Jenkins muestra:

```text
Grec0AI_backend_sb / main
```

el `fullName` suele ser:

```text
Grec0AI_backend_sb/main
```

### `app` y `branch`

Las tools antiguas usan `app` y `branch`. Siguen disponibles por compatibilidad, pero para uso nuevo se recomienda usar los managers basados en `fullName`.

### Managers vs Tools Simples

- Usa `jenkins_job_manager` para jobs y pipelines.
- Usa `jenkins_build_manager` para ejecuciones/builds.
- Usa `jenkins_wait_for_build` cuando un agente deba esperar a Jenkins antes de continuar.
- Usa `jenkins_pipeline_monitor` para stages, nodos e inputs pendientes.
- Usa las tools `jenkins_get_*`, `jenkins_start_job` y `jenkins_stop_job` si ya tienes prompts antiguos basados en `app` y `branch`.

## Flujos Recomendados

### Descubrir Jobs

```json
{
  "action": "list",
  "limit": 20
}
```

Tool: `jenkins_job_manager`

### Listar Ramas De Un Multibranch Project

```json
{
  "action": "list",
  "folder": "Grec0AI_backend_sb",
  "limit": 20
}
```

Tool: `jenkins_job_manager`

### Lanzar Un Build Y Esperar A Que Termine

1. Inicia el build.

```json
{
  "action": "start",
  "fullName": "Grec0AI_backend_sb/main"
}
```

Tool: `jenkins_build_manager`

2. Lista builds para identificar el numero iniciado.

```json
{
  "action": "list",
  "fullName": "Grec0AI_backend_sb/main",
  "limit": 5
}
```

Tool: `jenkins_build_manager`

3. Espera hasta que Jenkins termine.

```json
{
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "pollIntervalSeconds": 10,
  "timeoutSeconds": 1800,
  "includeStages": true
}
```

Tool: `jenkins_wait_for_build`

4. Solo despues de recibir `completed: true`, revisa logs, stages o ejecuta validaciones dependientes del build.

### Revisar Un Fallo

```json
{
  "action": "console",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "limit": 8000
}
```

Tool: `jenkins_build_manager`

```json
{
  "action": "steps",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298
}
```

Tool: `jenkins_pipeline_monitor`

### Aprobar O Rechazar Un Input Pendiente

1. Consulta inputs pendientes.

```json
{
  "action": "pending_inputs",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298
}
```

Tool: `jenkins_pipeline_monitor`

2. Envia la decision usando la `proceedUrl` o `abortUrl` devuelta por Jenkins.

```json
{
  "action": "submit_input",
  "decisionUrl": "https://tu-jenkins.com/jenkins/job/.../proceedEmpty"
}
```

Tool: `jenkins_pipeline_monitor`

## Tools

### `jenkins_job_manager`

Gestiona jobs y pipelines usando rutas `fullName`.

Acciones:

| Accion | Descripcion |
| --- | --- |
| `list` | Lista jobs del root o de un folder/multibranch project. |
| `get` | Obtiene detalle de un job. |
| `get_config` | Devuelve el `config.xml` de un job. |
| `create_pipeline` | Crea un job/pipeline desde XML. |
| `update_config` | Actualiza `config.xml`; requiere `confirmName`. |
| `delete` | Borra un job; requiere `confirmName`. |
| `enable` | Habilita un job; requiere `confirmName`. |
| `disable` | Deshabilita un job; requiere `confirmName`. |
| `get_branches` | Lista ramas usando el flujo legacy basado en `app`. |

Parametros:

| Parametro | Uso |
| --- | --- |
| `action` | Accion a ejecutar. |
| `fullName` | Ruta del job, por ejemplo `folder/job/main`. |
| `folder` | Folder o multibranch project desde el que listar. |
| `query` | Filtro por texto para `list`. |
| `limit` | Maximo de resultados para `list`. |
| `configXml` | XML completo para crear o actualizar jobs. |
| `confirmName` | Confirmacion exacta para acciones protegidas. |
| `app` | Nombre de aplicacion para `get_branches`. |

Ejemplos:

```json
{
  "action": "list",
  "query": "backend",
  "limit": 20
}
```

```json
{
  "action": "get",
  "fullName": "Grec0AI_backend_sb/main"
}
```

```json
{
  "action": "get_config",
  "fullName": "Grec0AI_backend_sb/main"
}
```

```json
{
  "action": "update_config",
  "fullName": "sandbox/test-pipeline",
  "configXml": "<flow-definition>...</flow-definition>",
  "confirmName": "sandbox/test-pipeline"
}
```

```json
{
  "action": "delete",
  "fullName": "sandbox/test-pipeline",
  "confirmName": "sandbox/test-pipeline"
}
```

### `jenkins_build_manager`

Gestiona ejecuciones de Jenkins.

Acciones:

| Accion | Descripcion |
| --- | --- |
| `list` | Lista builds recientes de un job. |
| `get` | Obtiene detalle de un build. |
| `start` | Inicia un build, opcionalmente con parametros. |
| `wait` | Espera hasta que un build termine o alcance timeout. |
| `stop` | Detiene un build; requiere `confirmBuild`. |
| `rebuild` | Solicita reconstruccion si Jenkins expone el endpoint. |
| `replay` | Solicita replay si Jenkins expone el endpoint. |
| `console` | Devuelve logs de consola. |
| `artifacts` | Lista artifacts archivados con URLs. |

Parametros:

| Parametro | Uso |
| --- | --- |
| `action` | Accion a ejecutar. |
| `fullName` | Ruta del job. |
| `buildNumber` | Numero de build para acciones sobre una ejecucion. |
| `parameters` | Parametros para `buildWithParameters`. |
| `pollIntervalSeconds` | Intervalo entre consultas para `wait`. |
| `timeoutSeconds` | Tiempo maximo de espera para `wait`. |
| `includeStages` | Incluye stages al terminar el build. |
| `limit` | Cantidad de builds o caracteres de log. |
| `start` | Offset para logs progresivos. |
| `confirmBuild` | Confirmacion exacta para `stop`. |

Ejemplos:

```json
{
  "action": "list",
  "fullName": "Grec0AI_backend_sb/main",
  "limit": 10
}
```

```json
{
  "action": "start",
  "fullName": "Grec0AI_backend_sb/main",
  "parameters": {
    "DEPLOY_ENV": "dev"
  }
}
```

```json
{
  "action": "wait",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "pollIntervalSeconds": 10,
  "timeoutSeconds": 1800,
  "includeStages": true
}
```

```json
{
  "action": "console",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "limit": 12000
}
```

```json
{
  "action": "stop",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "confirmBuild": 298
}
```

### `jenkins_wait_for_build`

Tool dedicada para agentes que necesitan bloquear el flujo hasta que Jenkins termine un build. La llamada responde cuando el build finaliza, cuando se alcanza el timeout o cuando Jenkins entra en una pausa manual (`input`) que requiere aprobación.

Parametros:

| Parametro | Default | Descripcion |
| --- | --- | --- |
| `fullName` | Requerido | Ruta del job. |
| `buildNumber` | Requerido | Numero de build a esperar. |
| `pollIntervalSeconds` | `10` | Segundos entre consultas. Minimo efectivo: 2. Maximo efectivo: 120. |
| `timeoutSeconds` | `1800` | Timeout total. Maximo efectivo: 86400. |
| `includeStages` | `true` | Incluye stages al terminar si el job expone Pipeline REST API. |

Ejemplo:

```json
{
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "pollIntervalSeconds": 10,
  "timeoutSeconds": 1800,
  "includeStages": true
}
```

Respuesta esperada:

```json
{
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298,
  "completed": true,
  "timedOut": false,
  "waitedSeconds": 120,
  "pollCount": 13,
  "result": "SUCCESS",
  "build": { "number": 298 },
  "stages": []
}
```

Si Jenkins queda pausado esperando aprobación manual, la tool devuelve `waitingForInput: true`, el objeto `pendingInput` con `proceedUrl`/`abortUrl` y un `nextStep` con la llamada exacta a `jenkins_submit_input_action`.

Si `timedOut` es `true`, el build seguía corriendo cuando se alcanzó el timeout.

### `jenkins_pipeline_monitor`

Inspecciona detalles especificos de pipelines.

Acciones:

| Accion | Descripcion |
| --- | --- |
| `steps` | Devuelve stages del build. |
| `node` | Devuelve detalle de un nodo/stage por `nodeId`. |
| `pending_inputs` | Devuelve input actions pendientes. |
| `submit_input` | Envia una decision usando `decisionUrl`. |

Ejemplos:

```json
{
  "action": "steps",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 296
}
```

```json
{
  "action": "node",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 296,
  "nodeId": "20"
}
```

```json
{
  "action": "pending_inputs",
  "fullName": "Grec0AI_backend_sb/main",
  "buildNumber": 298
}
```

```json
{
  "action": "submit_input",
  "decisionUrl": "https://tu-jenkins.com/jenkins/job/.../proceedEmpty"
}
```

## Tools Simples Y Compatibilidad

Estas tools siguen disponibles para prompts antiguos o flujos simples basados en `app` y `branch`.

| Tool | Uso |
| --- | --- |
| `jenkins_get_job_status` | Estado de un job por `app` y `branch`. |
| `jenkins_start_job` | Inicia un job con una rama. |
| `jenkins_stop_job` | Detiene un build por `app`, `branch` y `buildNumber`. |
| `jenkins_get_build_steps` | Stages de un build. |
| `jenkins_get_node_status` | Estado de un nodo de pipeline. |
| `jenkins_get_pending_actions` | Input actions pendientes. |
| `jenkins_submit_input_action` | Envia approval/reject usando una URL de Jenkins. |
| `jenkins_get_coverage_report` | Resumen de cobertura. |
| `jenkins_get_coverage_lines` | Cobertura de un archivo. |
| `jenkins_get_coverage_paths` | Paths con cobertura disponible. |
| `jenkins_get_git_branches` | Ramas Git disponibles para un job legacy. |

Ejemplo legacy:

```json
{
  "app": "mi-app",
  "branch": "main"
}
```

## Operaciones Protegidas

Algunas acciones pueden cambiar o destruir configuracion en Jenkins. El MCP exige confirmacion explicita.

| Accion | Confirmacion |
| --- | --- |
| `jenkins_job_manager.update_config` | `confirmName` debe ser igual a `fullName`. |
| `jenkins_job_manager.delete` | `confirmName` debe ser igual a `fullName`. |
| `jenkins_job_manager.enable` | `confirmName` debe ser igual a `fullName`. |
| `jenkins_job_manager.disable` | `confirmName` debe ser igual a `fullName`. |
| `jenkins_build_manager.stop` | `confirmBuild` debe ser igual a `buildNumber`. |

Recomendacion: prueba primero `create_pipeline`, `update_config` y `delete` en un job temporal.

## Requisitos De Jenkins

Funcionalidad disponible con Jenkins core:

- Listar jobs.
- Consultar job/build.
- Iniciar builds.
- Detener builds.
- Leer logs.
- Leer y actualizar `config.xml` si el usuario tiene permisos.
- Listar artifacts archivados.

Plugins recomendados para funcionalidad completa:

| Plugin | Para Que Sirve |
| --- | --- |
| `pipeline-rest-api` | Stages, nodos e input actions de pipelines. |
| `git-parameter` | Listado de ramas en tools legacy. |
| `jacoco` | Cobertura backend Java. |
| Cobertura frontend/Istanbul | Cobertura frontend si el job publica el ZIP esperado. |

Consulta [JENKINS_REQUIREMENTS.md](./JENKINS_REQUIREMENTS.md) para detalle de plugins, endpoints y errores comunes.

## Respuestas Y Limites

- Las tools devuelven JSON serializado como contenido de texto MCP.
- `console` puede limitar logs con `limit` para evitar respuestas enormes.
- `artifacts` devuelve metadata y URLs; no descarga binarios por defecto.
- `coverage` depende mucho de como el job publique sus reportes.
- `jenkins_wait_for_build` mantiene la llamada abierta hasta fin de build, timeout o pausa manual con input pendiente; ajusta `timeoutSeconds` para builds largos.

## Troubleshooting

### `ERR_MODULE_NOT_FOUND` con `zod-to-json-schema`

Si ves un error parecido a:

```text
Cannot find module '.../zod-to-json-schema/dist/esm/parsers/record.js'
```

usa una version reciente del paquete y preferiblemente arranca con `--package`:

```json
"args": ["-y", "--package", "@grec0/mcp-jenkins@latest", "mcp-jenkins"]
```

Si `npx` quedo con una instalacion temporal contaminada, borra la carpeta `_npx` que aparece en el stacktrace o limpia el cache de npm.

### `401` O `403`

Revisa `JENKINS_USERNAME`, `JENKINS_PASSWORD`, API token y permisos del usuario en Jenkins.

### `404` En `/wfapi/describe`

El job puede no ser Pipeline o puede faltar el plugin `pipeline-rest-api`.

### No Encuentro El `fullName`

Primero lista jobs desde el root:

```json
{
  "action": "list",
  "limit": 50
}
```

Despues lista dentro del multibranch project:

```json
{
  "action": "list",
  "folder": "nombre-del-proyecto",
  "limit": 50
}
```

### `jenkins_wait_for_build` Agota Timeout

El build seguía corriendo. Sube `timeoutSeconds`, revisa logs con `console` o consulta el build con `jenkins_build_manager get`. Si la respuesta incluye `waitingForInput: true`, aprueba o aborta con `jenkins_submit_input_action` usando la `decisionUrl` devuelta.

## Desarrollo Local

Esta seccion es solo para quienes quieran modificar el paquete.

```bash
npm install
npm run build
npm test
npm run prerelease
```

No publiques una version nueva sin ejecutar `npm run prerelease`.

## Licencia

MIT
