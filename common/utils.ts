import https from 'https';
import { JenkinsConfig, JenkinsError } from './types.js';

/**
 * Crear configuración de Jenkins desde variables de entorno
 */
export function createJenkinsConfig(): JenkinsConfig {
  const url = process.env.JENKINS_URL;
  const username = process.env.JENKINS_USERNAME;
  const password = process.env.JENKINS_PASSWORD;

  if (!url || !username || !password) {
    throw new Error(
      'Jenkins configuration missing. Please set JENKINS_URL, JENKINS_USERNAME, and JENKINS_PASSWORD environment variables.'
    );
  }

  return { url, username, password };
}

/**
 * Crear headers de autenticación para Jenkins
 */
export function createAuthHeaders(config: JenkinsConfig): Record<string, string> {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Crear headers para form data
 */
export function createFormHeaders(config: JenkinsConfig): Record<string, string> {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

export function createXmlHeaders(config: JenkinsConfig): Record<string, string> {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/xml',
    'Accept': 'application/json',
  };
}

/**
 * Crear agente HTTPS que ignora certificados auto-firmados (similar al código Java)
 */
export function createHttpsAgent() {
  return new https.Agent({
    rejectUnauthorized: false
  });
}

/**
 * Construir URL del job con branch específico
 * Formato: /job/{app}/job/{branch}
 */
export function buildJobUrl(baseUrl: string, app: string, branch: string = 'main'): string {
  // Si no hay baseUrl, solo devolver la ruta relativa
  if (!baseUrl) {
    return `/job/${app}/job/${branch}`;
  }
  // Si hay baseUrl, construir URL completa
  return `${baseUrl}/job/${app}/job/${branch}`;
}

/**
 * Construir URL del job con número de build
 */
export function buildJobBuildUrl(baseUrl: string, app: string, buildNumber: number, branch: string = 'main'): string {
  return `${buildJobUrl(baseUrl, app, branch)}/${buildNumber}`;
}

export function buildFullNameJobPath(fullName: string): string {
  const cleanFullName = fullName
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean);

  if (cleanFullName.length === 0) {
    throw new Error('Jenkins job fullName is required.');
  }

  return cleanFullName
    .map(segment => `/job/${encodeURIComponent(segment)}`)
    .join('');
}

export function buildJobFullNameUrl(baseUrl: string, fullName: string): string {
  const path = buildFullNameJobPath(fullName);
  return baseUrl ? `${baseUrl}${path}` : path;
}

export function buildJobFullNameBuildUrl(baseUrl: string, fullName: string, buildNumber: number): string {
  return `${buildJobFullNameUrl(baseUrl, fullName)}/${buildNumber}`;
}

export function validateJobFullName(fullName: string): boolean {
  return fullName.trim().length > 0 && !/[<>'"&]/.test(fullName);
}

export function requireExactConfirmation(target: string, confirmation: string | undefined, action: string): void {
  if (confirmation !== target) {
    throw new Error(`${action} requires explicit confirmation. Set confirmation to exactly: ${target}`);
  }
}

/**
 * Manejar errores de respuesta HTTP
 */
export function handleHttpError(error: any, context: string): JenkinsError {
  const jenkinsError = new JenkinsError(`${context}: ${error.message}`);

  if (error.response) {
    jenkinsError.status = error.response.status;
    jenkinsError.response = error.response.data;
  }

  return jenkinsError;
}

/**
 * Formatear duración en milisegundos a formato legible
 */
export function formatDuration(milliseconds: number): string {
  if (!milliseconds) return 'N/A';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formatear timestamp a fecha legible
 */
export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
}

/**
 * Validar nombre de aplicación
 */
export function validateAppName(app: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(app);
}

/**
 * Limpiar y validar parámetros de entrada
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>'"&]/g, '');
} 