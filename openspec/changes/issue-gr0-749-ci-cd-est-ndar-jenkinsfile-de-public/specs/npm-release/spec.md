# Specification

## Requirement: Publicación npm desde Jenkins

As a maintainer, I want npm releases to be published by Jenkins, so that versioning and publication follow the repository standard.

#### Scenario: Configuración del pipeline

- GIVEN el repositorio @grec0/mcp-jenkins
- WHEN Jenkins carga el Jenkinsfile raíz
- THEN el fichero contiene exactamente `@Library('jenkins-voip-reporter@main') _` seguido de `publishNpmLibrary()`

#### Scenario: Patch automático

- GIVEN un push a `main`
- WHEN Jenkins procesa la publicación
- THEN incrementa el patch, crea el commit `chore(release): vX.Y.Z [ci skip]` y el tag `vX.Y.Z`, y publica en npm

#### Scenario: Minor o major manual

- GIVEN una persona mantenedora solicita una versión minor o major
- WHEN ejecuta `npm run release:minor` o `npm run release:major`
- THEN el script incrementa la versión sin crear un tag, hace el commit `chore(release): vX.Y.0` sin `[ci skip]` y ejecuta `git push`, sin publicar en npm
- AND Jenkins publica esa versión sin volver a incrementarla

#### Scenario: Verificación previa a la publicación

- GIVEN las dependencias necesarias instaladas
- WHEN se ejecuta `npm run check`
- THEN se ejecutan en orden `npm run pack:verify`, `npm test` y `npm run smoke:tarball`, y el comando falla si cualquiera falla

#### Scenario: Scripts y versión existentes

- GIVEN el package.json actualizado
- WHEN se inspeccionan sus scripts y su versión
- THEN no existen `postpublish` ni `release:patch`, ningún script ejecuta `npm publish`, y `version:patch`, `version:minor` y `version:major` permanecen sin cambios
- AND el campo `version` conserva su valor anterior al cambio

#### Scenario: Documentación de publicación

- GIVEN una persona consulta la sección Releasing del README
- WHEN lee el procedimiento
- THEN encuentra en cuatro líneas el patch automático en CI, los comandos minor y major, y que solo CI publica en npm, sin detalles internos del pipeline
