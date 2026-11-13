# Tasks

## 1. Estado del job

- [ ] 1.1 En `tools/jenkins-service.ts`, definir `BUILD_FIELDS` con `number,url,building,result,duration,estimatedDuration,timestamp,displayName` y exportar `JOB_STATUS_TREE` con `name`, `url`, `buildable`, `color`, `displayName`, `nextBuildNumber`, `builds[number,url]` y los siete builds resumidos con esos campos (Scenario: Datos de los builds resumidos).
- [ ] 1.2 Usar `?tree=${JOB_STATUS_TREE}` en la URL de `getJobStatus` y explicar en un comentario que Jenkins omite los detalles de builds anidados sin `tree` (Scenario: Datos de los builds resumidos).
- [ ] 1.3 Añadir en `common/utils.ts` `describeBuildResult` con prioridad para `building === true`, seguido del resultado disponible y los textos de terminado sin resultado o desconocido según la marca `building` (Scenarios: Build en curso, Resultado disponible, Estado desconocido, Build terminado sin resultado).
- [ ] 1.4 Importar `describeBuildResult` en `index.ts` y usarlo para mostrar el resultado de `lastBuild` (Scenarios: Build en curso, Resultado disponible, Estado desconocido, Build terminado sin resultado).

## 2. Pruebas y verificación

- [ ] 2.1 En `tests/utils.test.ts`, con importación dinámica de `../common/utils.js`, comprobar los cinco ejemplos de resultado indicados: build en curso, `SUCCESS`, `FAILURE`, datos ausentes y build terminado con resultado nulo (Scenarios: Build en curso, Resultado disponible, Estado desconocido, Build terminado sin resultado).
- [ ] 2.2 En `tests/utils.test.ts`, importar `JOB_STATUS_TREE` de `../tools/jenkins-service.js` y comprobar que contiene `lastBuild[number,url,building,result,duration,estimatedDuration,timestamp,displayName]`, `color` y `nextBuildNumber` (Scenario: Datos de los builds resumidos).
- [ ] 2.3 Ejecutar `npm run build` y `npm test`; confirmar que pasan sin cambiar otros comportamientos, la versión ni `package.json` (Requirement: Estado del job de Jenkins).
