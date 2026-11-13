# Specification

## Requirement: Estado del job de Jenkins

As a usuario de Jenkins, I want consultar el estado y el resultado real del último build, so that pueda distinguir un build en curso de uno terminado o con datos ausentes.

#### Scenario: Datos de los builds resumidos

- GIVEN un job con builds registrados en Jenkins
- WHEN se consulta su estado
- THEN la respuesta solicita los campos del job utilizados, incluidos `color` y `nextBuildNumber`, la lista `builds` con `number` y `url`, y los campos `number`, `url`, `building`, `result`, `duration`, `estimatedDuration`, `timestamp` y `displayName` de cada uno de `lastBuild`, `lastCompletedBuild`, `lastFailedBuild`, `lastStableBuild`, `lastSuccessfulBuild`, `lastUnstableBuild` y `lastUnsuccessfulBuild`
- AND la duración y la fecha del último build se pueden mostrar cuando Jenkins proporciona esos datos

#### Scenario: Build en curso

- GIVEN un último build con `building: true`
- WHEN se muestra su resultado
- THEN se muestra «En progreso»

#### Scenario: Resultado disponible

- GIVEN un último build con resultado `SUCCESS` y `building: false`, o con resultado `FAILURE` y sin marca `building`
- WHEN se muestra su resultado
- THEN se muestra respectivamente `SUCCESS` o `FAILURE`

#### Scenario: Estado desconocido

- GIVEN un último build sin resultado ni marca `building`
- WHEN se muestra su resultado
- THEN se muestra «Desconocido»

#### Scenario: Build terminado sin resultado

- GIVEN un último build con `building: false` y resultado nulo
- WHEN se muestra su resultado
- THEN se muestra «Terminado (sin resultado)»
