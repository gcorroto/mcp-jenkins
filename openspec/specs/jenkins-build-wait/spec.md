# jenkins-build-wait Specification

## Purpose

Permitir que los clientes observen builds de Jenkins mediante esperas acotadas y reanudables, incluyendo pausas manuales.

## Requirements

### Requirement: Espera acotada y reanudable
La herramienta `jenkins_wait_for_build` SHALL aceptar `waitSeconds` opcional, por defecto 50, entre 0 y 300 segundos. `timeoutSeconds` SHALL permanecer como alias obsoleto cuando no se indique `waitSeconds`, limitado a 300. El intervalo de consulta SHALL tener mínimo efectivo 2 y máximo 60 segundos.

#### Scenario: Build aún en curso
- **WHEN** se agota la espera y el build sigue en marcha
- **THEN** la respuesta no es un error e incluye `completed: false`, `timedOut: false`, `stillRunning: true`, `nextPollSeconds` con el intervalo efectivo y `nextStep` en inglés indicando que se vuelva a llamar con el mismo `fullName` y `buildNumber`.

#### Scenario: Alias obsoleto
- **WHEN** se proporciona `timeoutSeconds` sin `waitSeconds`
- **THEN** se usa como duración de espera, limitada a 300 segundos.

#### Scenario: Build completado
- **WHEN** el build termina durante la espera
- **THEN** la respuesta incluye `completed: true`, `stillRunning: false` y los stages si se solicitó `includeStages` y están disponibles.

### Requirement: Input manual pendiente
La espera SHALL devolver inmediatamente el input manual pendiente con la información necesaria para aprobarlo o abortarlo.

#### Scenario: Pausa manual
- **WHEN** Jenkins informa de un input pendiente
- **THEN** la respuesta incluye `waitingForInput`, `pendingInput` y `nextStep` con las indicaciones para usar `proceedUrl` y `abortUrl`.

### Requirement: Progreso de espera
La herramienta SHALL emitir una notificación de progreso por cada consulta cuando la petición incluya un token de progreso, con un contador estrictamente creciente y un mensaje de estado y tiempo transcurrido.

#### Scenario: Progreso disponible
- **WHEN** se consulta Jenkins con un token de progreso
- **THEN** se notifica el número de consulta y el mensaje incluye el stage en curso cuando se pueda obtener a bajo coste.

#### Scenario: Notificación fallida o sin token
- **WHEN** falla el envío de una notificación o no hay token
- **THEN** la espera continúa y sin token no se envía ninguna notificación.

### Requirement: Cancelación de espera
La espera SHALL responder a la cancelación interrumpiendo inmediatamente la pausa entre consultas y sin iniciar consultas adicionales.

#### Scenario: Cancelación durante la pausa
- **WHEN** el cliente cancela mientras transcurre el intervalo entre consultas
- **THEN** la espera termina sin consultar Jenkins de nuevo.
