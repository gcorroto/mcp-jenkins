# Inicio Rápido - Jenkins MCP

Requiere Node.js 20 o superior.

Para esperar un build, llama a `jenkins_wait_for_build` con `fullName` y `buildNumber`. Cada llamada espera hasta `waitSeconds` (50 segundos por defecto, máximo 300). Mientras devuelva `stillRunning: true`, repite la llamada con los mismos valores; si devuelve `waitingForInput: true`, usa las URLs indicadas para aprobar o abortar.

## 🚀 Ejecutar con npx (Sin instalación)

### 1. Configurar variables de entorno

**En Windows (CMD):**
```cmd
set JENKINS_URL=https://tu-jenkins.com
set JENKINS_USERNAME=tu-usuario
set JENKINS_PASSWORD=tu-token
```

**En Windows (PowerShell):**
```powershell
$env:JENKINS_URL="https://tu-jenkins.com"
$env:JENKINS_USERNAME="tu-usuario"
$env:JENKINS_PASSWORD="tu-token"
```

**En Linux/macOS:**
```bash
export JENKINS_URL="https://tu-jenkins.com"
export JENKINS_USERNAME="tu-usuario"
export JENKINS_PASSWORD="tu-token"
```

### 2. Ejecutar con npx

```bash
npx @grec0/mcp-jenkins
```

### 3. Configuración en Claude Desktop

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

## ✅ Verificar que funciona

Una vez configurado en Claude Desktop, puedes probar:

```
¿Cuál es el estado del job "mi-aplicacion"?
```

```
Muéstrame las ramas de Git disponibles para "mi-aplicacion"
```

```
Inicia el job "mi-aplicacion" con la rama "main"
```

## 🔧 Plugins de Jenkins Requeridos

⚠️ **No olvides instalar los plugins necesarios en Jenkins:**

- `pipeline-rest-api` (obligatorio)
- `git-parameter` (obligatorio)
- `jacoco` (opcional, para cobertura)

Ver [JENKINS_REQUIREMENTS.md](./JENKINS_REQUIREMENTS.md) para más detalles.

## 🆘 Solución de Problemas

### Error: "Jenkins configuration missing"
**Solución**: Verifica que las variables de entorno estén configuradas correctamente.

### Error: "404 Not Found" 
**Solución**: Instala los plugins requeridos de Jenkins (ver JENKINS_REQUIREMENTS.md).

### Error: "Job not found"
**Solución**: Verifica que el job existe y sigue el patrón `/job/app-{nombre-app}-pipeline`. 