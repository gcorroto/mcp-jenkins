# Requisitos de Jenkins para @grec0/mcp-jenkins

## Plugins Requeridos

Para que el MCP de Jenkins funcione completamente, necesitas tener instalados los siguientes plugins en tu instancia de Jenkins:

### 1. **Pipeline: REST API Plugin** (OBLIGATORIO)
- **Nombre del plugin**: `pipeline-rest-api`
- **Funcionalidad**: Proporciona API REST para pipelines
- **URLs que utiliza**:
  - `/wfapi/describe` - Para obtener steps de builds
  - `/execution/node/{nodeId}/wfapi/describe` - Para estado de nodos
  - `/wfapi/nextPendingInputAction` - Para acciones pendientes

**Herramientas MCP afectadas**:
- `jenkins_get_build_steps`
- `jenkins_get_node_status` 
- `jenkins_get_pending_actions`

### 2. **Git Parameter Plugin** (OBLIGATORIO)
- **Nombre del plugin**: `git-parameter`
- **Funcionalidad**: Permite parametrizar builds con ramas de Git
- **URL que utiliza**:
  - `/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems`

**Herramientas MCP afectadas**:
- `jenkins_get_git_branches`

### 3. **JaCoCo Plugin** (OPCIONAL - Para cobertura backend)
- **Nombre del plugin**: `jacoco`
- **Funcionalidad**: Reportes de cobertura de código Java
- **URL que utiliza**:
  - `/jacoco/jacoco.exec` - Archivo de cobertura JaCoCo

**Herramientas MCP afectadas**:
- `jenkins_get_coverage_report` (modo backend)

### 4. **Plugin de Cobertura Frontend** (OPCIONAL)
- **Funcionalidad**: Genera reportes de cobertura para JavaScript/TypeScript
- **URL que utiliza**:
  - `/Coverage_20Unit_20Test_20Report/*zip*/Coverage_20Unit_20Test_20Report.zip`

**Herramientas MCP afectadas**:
- `jenkins_get_coverage_report` (modo frontend)
- `jenkins_get_coverage_lines`
- `jenkins_get_coverage_paths`

## Instalación de Plugins

### Vía Jenkins Web UI:
1. Ve a **Manage Jenkins** → **Manage Plugins**
2. En la pestaña **Available**, busca cada plugin por nombre
3. Selecciona los plugins y haz clic en **Install without restart**

### Vía Jenkins CLI:
```bash
# Pipeline REST API
java -jar jenkins-cli.jar -s http://your-jenkins-url install-plugin pipeline-rest-api

# Git Parameter
java -jar jenkins-cli.jar -s http://your-jenkins-url install-plugin git-parameter

# JaCoCo (opcional)
java -jar jenkins-cli.jar -s http://your-jenkins-url install-plugin jacoco
```

## Verificación de Plugins Instalados

Puedes verificar que los plugins están instalados:

1. **Via Web UI**: **Manage Jenkins** → **Manage Plugins** → **Installed**
2. **Via API**: `GET {jenkins-url}/pluginManager/api/json?depth=1`

## Funcionalidades por Plugin

### Sin plugins adicionales (Jenkins core):
✅ `jenkins_get_job_status` - API básica de Jenkins
✅ `jenkins_start_job` - API básica de Jenkins  
✅ `jenkins_stop_job` - API básica de Jenkins

### Con Pipeline REST API Plugin:
✅ `jenkins_get_build_steps`
✅ `jenkins_get_node_status`
✅ `jenkins_get_pending_actions`
✅ `jenkins_submit_input_action`

### Con Git Parameter Plugin:
✅ `jenkins_get_git_branches`

### Con plugins de cobertura:
✅ `jenkins_get_coverage_report`
✅ `jenkins_get_coverage_lines`
✅ `jenkins_get_coverage_paths`

## Configuración de Jobs

### Para que funcionen las ramas de Git:
Tu job debe estar configurado con el **Git Parameter Plugin**:

```groovy
// En tu Jenkinsfile
parameters {
    gitParameter branchFilter: 'origin/(.*)', 
                 defaultValue: 'main', 
                 name: 'BRANCH_TO_BUILD', 
                 type: 'PT_BRANCH'
}
```

### Para reportes de cobertura:
- **Backend (Java)**: Configura JaCoCo en tu build
- **Frontend (JS/TS)**: Configura tu herramienta de cobertura para generar el ZIP

## Solución de Problemas

### Error: "404 Not Found" en `/wfapi/describe`
**Problema**: Pipeline REST API Plugin no instalado
**Solución**: Instalar `pipeline-rest-api` plugin

### Error: "404 Not Found" en `/descriptorByName/...`
**Problema**: Git Parameter Plugin no instalado  
**Solución**: Instalar `git-parameter` plugin

### Error: "404 Not Found" en `/jacoco/jacoco.exec`
**Problema**: JaCoCo plugin no instalado O no configurado en el job
**Solución**: 
1. Instalar `jacoco` plugin
2. Configurar JaCoCo en tu build/pipeline

### Herramientas que fallan sin plugins:
- Sin **Pipeline REST API**: `jenkins_get_build_steps`, `jenkins_get_node_status`, `jenkins_get_pending_actions`
- Sin **Git Parameter**: `jenkins_get_git_branches`
- Sin **plugins de cobertura**: `jenkins_get_coverage_*`

## Plugins Mínimos Recomendados

Para funcionalidad básica completa:
```
pipeline-rest-api
git-parameter
```

Para funcionalidad completa con cobertura:
```
pipeline-rest-api
git-parameter
jacoco
``` 