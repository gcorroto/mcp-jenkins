# Tasks

## 1. Configuración y scripts

- [x] 1.1 Crear `Jenkinsfile` en la raíz con exactamente las dos líneas indicadas en la incidencia. (Scenario: Configuración del pipeline)
- [x] 1.2 En `package.json`, eliminar `postpublish` y `release:patch`; añadir `check` con `npm run pack:verify && npm test && npm run smoke:tarball` y eliminar `prerelease` o hacer que invoque `check`. (Scenario: Verificación previa a la publicación; Scenario: Scripts y versión existentes)
- [x] 1.3 Sustituir `release:minor` y `release:major` por los comandos exactos de la incidencia, conservando los scripts `version:patch|minor|major` y el campo `version` sin cambios. (Scenario: Minor o major manual; Scenario: Scripts y versión existentes)
- [x] 1.4 Actualizar la sección Releasing del README en cuatro líneas con el estándar solicitado, sin describir el pipeline por dentro. (Scenario: Documentación de publicación)

## 2. Verificación local

- [x] 2.1 Instalar las dependencias según el lockfile y ejecutar `npm run check`; documentar cualquier comprobación que no pueda ejecutarse en el entorno. (Scenario: Verificación previa a la publicación)
- [x] 2.2 Revisar el contenido exacto del Jenkinsfile, los scripts de release y check, la ausencia de `npm publish`, la conservación de los scripts de versión y del campo `version`, y las cuatro líneas del README. (Scenario: Configuración del pipeline; Scenario: Minor o major manual; Scenario: Scripts y versión existentes; Scenario: Documentación de publicación)

## Verificación tras el despliegue

- [ ] Confirmar en Jenkins que un push a `main` genera el patch, el commit con `[ci skip]`, el tag y la publicación npm, y que una versión minor o major ya incrementada se publica sin otro incremento. (Scenario: Patch automático; Scenario: Minor o major manual)
