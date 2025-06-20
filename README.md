# @grec0/mcp-jenkins

MCP server para integración con Jenkins CI/CD. Este servidor permite interactuar con Jenkins desde cualquier cliente MCP compatible (como Claude Desktop) para gestionar jobs, builds, reportes de cobertura y más.

## Características

- ✅ **Gestión de Jobs**: Obtener estado, iniciar y detener jobs
- 📋 **Monitoreo de Builds**: Ver steps, nodos y estados de ejecución  
- 🔄 **Acciones de Input**: Manejar aprobaciones y acciones pendientes
- 📊 **Reportes de Cobertura**: Analizar cobertura de código detallada
- 🌿 **Integración Git**: Listar ramas disponibles para builds
- 🔒 **Autenticación Segura**: Soporte para HTTPS con certificados auto-firmados

## Instalación

### Opción 1: Usar con npx (Recomendado)
```bash
# No requiere instalación global
npx @grec0/mcp-jenkins
```

### Opción 2: Instalación global
```bash
npm install -g @grec0/mcp-jenkins
```

## Requisitos Previos

### Plugins de Jenkins Requeridos

⚠️ **IMPORTANTE**: Para funcionalidad completa, necesitas estos plugins instalados en Jenkins:

**Obligatorios:**
- `pipeline-rest-api` - Para API de pipelines
- `git-parameter` - Para listado de ramas Git

**Opcionales (para cobertura):**
- `jacoco` - Para reportes de cobertura Java
- Plugin de cobertura frontend (Istanbul, etc.)

📖 **Ver [JENKINS_REQUIREMENTS.md](./JENKINS_REQUIREMENTS.md) para instrucciones detalladas de instalación**

## Configuración

### Variables de Entorno

```bash
export JENKINS_URL="https://tu-jenkins.com"
export JENKINS_USERNAME="tu-usuario"
export JENKINS_PASSWORD="tu-token-o-password"
```

### Configuración en Claude Desktop

Agregar al archivo de configuración de Claude Desktop:

#### Opción 1: Con npx (Recomendado)
```json
{
  "mcpServers": {
    "jenkins": {
      "command": "npx",
      "args": ["@grec0/mcp-jenkins"],
      "env": {
        "JENKINS_URL": "https://tu-jenkins.com",
        "JENKINS_USERNAME": "tu-usuario", 
        "JENKINS_PASSWORD": "tu-token"
      }
    }
  }
}
```

#### Opción 2: Con instalación global
```json
{
  "mcpServers": {
    "jenkins": {
      "command": "mcp-jenkins",
      "env": {
        "JENKINS_URL": "https://tu-jenkins.com",
        "JENKINS_USERNAME": "tu-usuario", 
        "JENKINS_PASSWORD": "tu-token"
      }
    }
  }
}
```

## Herramientas Disponibles

### Gestión de Jobs

- `jenkins_get_job_status` - Obtener estado de un job
- `jenkins_start_job` - Iniciar un job con rama específica
- `jenkins_stop_job` - Detener un job en ejecución
- `jenkins_get_git_branches` - Listar ramas de Git disponibles

### Monitoreo de Builds

- `jenkins_get_build_steps` - Ver steps de un build
- `jenkins_get_node_status` - Estado de un nodo específico
- `jenkins_get_pending_actions` - Acciones pendientes de input

### Acciones de Input

- `jenkins_submit_input_action` - Enviar aprobación/rechazo

### Reportes de Cobertura

- `jenkins_get_coverage_report` - Reporte de cobertura general
- `jenkins_get_coverage_lines` - Cobertura de archivo específico
- `jenkins_get_coverage_paths` - Listar archivos con cobertura

## Uso

### Obtener estado de un job
```
¿Cuál es el estado del job "mi-app"?
```

### Iniciar un build
```
Inicia el job "mi-app" con la rama "feature/nueva-funcionalidad"
```

### Ver cobertura de código
```
Muéstrame el reporte de cobertura del build #123 de "mi-app"
```

### Aprobar un deployment
```
Obtén las acciones pendientes del build #456 de "mi-app" y luego aprueba el deployment
```

## Simplificaciones respecto al código Java original

- **Eliminación del parámetro `area`**: Solo se usa `app` para simplificar
- **Estructura de jobs simplificada**: `/job/app-{app}-pipeline` en lugar de `/job/{area}/job/app{area}-{app}-pipeline`
- **Configuración por variables de entorno**: Más simple que la configuración de Spring Boot

## Ejecución Manual

### Con npx:
```bash
# Configurar variables de entorno
export JENKINS_URL="https://tu-jenkins.com"
export JENKINS_USERNAME="tu-usuario"
export JENKINS_PASSWORD="tu-token"

# Ejecutar
npx @grec0/mcp-jenkins
```

### Con instalación global:
```bash
# Instalar globalmente
npm install -g @grec0/mcp-jenkins

# Configurar variables de entorno
export JENKINS_URL="https://tu-jenkins.com"
export JENKINS_USERNAME="tu-usuario"
export JENKINS_PASSWORD="tu-token"

# Ejecutar
mcp-jenkins
```

## Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/gcorroto/mcp-jenkins.git
cd mcp-jenkins

# Instalar dependencias
npm install

# Compilar
npm run build

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test
```

## Licencia

MIT

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -am 'Agregar nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

## Soporte

Si encuentras algún problema, por favor abre un [issue](https://github.com/gcorroto/mcp-jenkins/issues) en GitHub. 