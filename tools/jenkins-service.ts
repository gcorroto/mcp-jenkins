import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  JenkinsConfig, 
  JobStatus, 
  BuildSteps, 
  NodeStatus, 
  PendingInputAction, 
  CoverageReport,
  CoverageReportFront,
  CoverageSummary,
  FileCoverage,
  GitBranch,
  JenkinsError
} from '../common/types.js';
import { 
  createJenkinsConfig, 
  createAuthHeaders, 
  createFormHeaders,
  createHttpsAgent,
  buildJobUrl,
  buildJobBuildUrl,
  handleHttpError,
  validateAppName,
  sanitizeInput
} from '../common/utils.js';

export class JenkinsService {
  private config: JenkinsConfig;
  private client: AxiosInstance;

  constructor() {
    this.config = createJenkinsConfig();
    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 30000,
      httpsAgent: createHttpsAgent(),
      headers: createAuthHeaders(this.config)
    });
  }

  /**
   * Obtener el estado de un job específico
   * Migrado de: JenkinsService.getJobStatus(String area, String app)
   */
  async getJobStatus(app: string, branch: string = 'main'): Promise<JobStatus> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name. Only alphanumeric characters, hyphens and underscores are allowed.');
    }

    const jobUrl = `${buildJobUrl('', app, branch)}/api/json`;
    
    try {
      const response: AxiosResponse<JobStatus> = await this.client.get(jobUrl);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new JenkinsError(`Job not found for app: ${app}, branch: ${branch} and url: ${jobUrl}`);
      }
      throw handleHttpError(error, `Failed to get job status for app: ${app}, branch: ${branch} and url: ${jobUrl}`);
    }
  }

  /**
   * Iniciar un job con el parámetro BRANCH_TO_BUILD
   * Migrado de: JenkinsService.startJob(String area, String app, String branch)
   */
  async startJob(app: string, branch: string): Promise<string> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    const cleanBranch = sanitizeInput(branch);
    const jobUrl = `${buildJobUrl('', app, cleanBranch)}/buildWithParameters`;
    const params = new URLSearchParams();
    params.append('BRANCH_TO_BUILD', cleanBranch);
    params.append('delay', '0sec');

    try {
      await this.client.post(jobUrl, params.toString(), {
        headers: createFormHeaders(this.config)
      });
      
      return `Job started successfully for app ${app} on branch ${cleanBranch}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to start job for app: ${app}, branch: ${cleanBranch}`);
    }
  }

  /**
   * Detener un job específico en ejecución
   * Migrado de: JenkinsService.stopJob(String area, String app, int buildNumber)
   */
  async stopJob(app: string, buildNumber: number, branch: string = 'main'): Promise<string> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    const jobUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/stop`;
    
    try {
      await this.client.post(jobUrl);
      return `Job stopped successfully for app ${app}, build ${buildNumber}, branch ${branch}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to stop job for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
    }
  }

  /**
   * Obtener el estado de los steps de un job específico
   * Migrado de: JenkinsService.getJobStepsStatus(String area, String app, int buildNumber)
   */
  async getJobStepsStatus(app: string, buildNumber: number, branch: string = 'main'): Promise<BuildSteps> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    const stepsUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/wfapi/describe`;
    
    try {
      const response: AxiosResponse<BuildSteps> = await this.client.get(stepsUrl);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new JenkinsError(`Build steps not found for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
      }
      throw handleHttpError(error, `Failed to get job steps for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
    }
  }

  /**
   * Obtener el estado de un nodo específico
   * Migrado de: JenkinsService.getNodeStatus(String area, String app, int buildNumber, String nodeId)
   */
  async getNodeStatus(app: string, buildNumber: number, nodeId: string, branch: string = 'main'): Promise<NodeStatus | PendingInputAction> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    const nodeUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/execution/node/${nodeId}/wfapi/describe`;
    
    try {
      const response: AxiosResponse<NodeStatus> = await this.client.get(nodeUrl);
      const nodeDetails = response.data;
      
      // Si el estado es PAUSED_PENDING_INPUT, obtener los detalles de input pending
      if (nodeDetails.status === 'PAUSED_PENDING_INPUT') {
        return await this.getPendingInputActions(app, buildNumber, branch);
      }
      
      return nodeDetails;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get node status for app: ${app}, build: ${buildNumber}, node: ${nodeId}, branch: ${branch}`);
    }
  }

  /**
   * Obtener los detalles de input pending de un nodo en Jenkins
   * Migrado de: JenkinsService.getPendingInputActions(String area, String app, int buildNumber)
   */
  async getPendingInputActions(app: string, buildNumber: number, branch: string = 'main'): Promise<PendingInputAction> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    const pendingInputUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/wfapi/nextPendingInputAction`;
    
    try {
      const response: AxiosResponse<PendingInputAction> = await this.client.get(pendingInputUrl);
      return response.data;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get pending input actions for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
    }
  }

  /**
   * Enviar una acción de input a un nodo en Jenkins
   * Migrado de: JenkinsService.submitInputAction(String decisionUrl)
   */
  async submitInputAction(decisionUrl: string): Promise<string> {
    try {
      await this.client.post(decisionUrl);
      return 'Action submitted successfully';
    } catch (error: any) {
      throw handleHttpError(error, `Failed to submit input action to URL: ${decisionUrl}`);
    }
  }

  /**
   * Obtener reporte de cobertura total
   * Migrado de: JenkinsService.getTotalCoverageReport(String area, String app, int buildNumber, String packageName, String clase)
   */
  async getCoverageReport(app: string, buildNumber: number, packageName?: string, className?: string, branch: string = 'main'): Promise<CoverageReport | CoverageSummary> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    // Primero intentar con backend (jacoco)
    try {
      const backendUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/jacoco/jacoco.exec`;
      await this.client.get(backendUrl);
      // Si existe, procesar reporte backend
      return await this.getCoverageReportBackend(app, buildNumber, branch);
    } catch (error: any) {
      // Si falla, intentar con frontend coverage
      try {
        const frontendReport = await this.getCoverageReportFrontend(app, buildNumber, branch);
        
        if (packageName) {
          return this.calculatePackageSummary(frontendReport, packageName, className);
        } else if (className) {
          return this.calculateClassSummary(frontendReport, className);
        } else {
          return this.calculateTotalSummary(frontendReport);
        }
      } catch (frontendError: any) {
        throw handleHttpError(frontendError, `Failed to get coverage report for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
      }
    }
  }

  /**
   * Obtener líneas de cobertura por path
   * Migrado de: JenkinsService.getCoverageReportContentLines(String area, String app, int buildNumber, String path)
   */
  async getCoverageReportLines(app: string, buildNumber: number, path: string, branch: string = 'main'): Promise<FileCoverage> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    try {
      const frontendReport = await this.getCoverageReportFrontend(app, buildNumber, branch);
      return this.getLinesByPath(frontendReport, path);
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get coverage lines for app: ${app}, build: ${buildNumber}, path: ${path}, branch: ${branch}`);
    }
  }

  /**
   * Obtener todos los paths de cobertura
   * Migrado de: JenkinsService.getCoverageReportPaths(String area, String app, int buildNumber)
   */
  async getCoverageReportPaths(app: string, buildNumber: number, branch: string = 'main'): Promise<string[]> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    try {
      const frontendReport = await this.getCoverageReportFrontend(app, buildNumber, branch);
      return this.getAllPaths(frontendReport);
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get coverage paths for app: ${app}, build: ${buildNumber}, branch: ${branch}`);
    }
  }

  /**
   * Obtener branches de Git
   * Migrado de: JenkinsService.getGitBranches(String area, String app)
   */
  async getGitBranches(app: string): Promise<string[]> {
    if (!validateAppName(app)) {
      throw new Error('Invalid app name.');
    }

    // Para obtener branches, usamos el job principal sin branch específico
    const url = `${this.config.url}/jenkins/job/${app}/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems?param=BRANCH_TO_BUILD`;
    
    try {
      const response: AxiosResponse<{ values: GitBranch[] }> = await this.client.get(url);
      return response.data.values.map(branch => branch.name);
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get Git branches for app: ${app}`);
    }
  }

  // Métodos privados de soporte

  private async getCoverageReportBackend(app: string, buildNumber: number, branch: string = 'main'): Promise<CoverageReport> {
    const jacocoUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/jacoco/jacoco.exec`;
    const response = await this.client.get(jacocoUrl, { responseType: 'arraybuffer' });
    
    // Aquí deberías procesar el archivo jacoco.exec
    // Por simplicidad, devolvemos un reporte básico
    return {
      instructionCoverage: { covered: 0, missed: 0, percentage: 0, total: 0 },
      branchCoverage: { covered: 0, missed: 0, percentage: 0, total: 0 },
      lineCoverage: { covered: 0, missed: 0, percentage: 0, total: 0 }
    };
  }

  private async getCoverageReportFrontend(app: string, buildNumber: number, branch: string = 'main'): Promise<CoverageReportFront> {
    const zipUrl = `${buildJobBuildUrl('', app, buildNumber, branch)}/Coverage_20Unit_20Test_20Report/*zip*/Coverage_20Unit_20Test_20Report.zip`;
    
    const response = await this.client.get(zipUrl, { responseType: 'arraybuffer' });
    
    // Aquí deberías extraer y procesar el ZIP
    // Por simplicidad, devolvemos un reporte vacío
    return { files: {} };
  }

  private calculateTotalSummary(report: CoverageReportFront): CoverageSummary {
    const summary: CoverageSummary = {
      statements: 0,
      functions: 0,
      branches: 0,
      uncoveredStatements: 0,
      uncoveredFunctions: 0,
      uncoveredBranches: 0
    };

    Object.values(report.files).forEach(file => {
      summary.statements += Object.keys(file.statementMap).length;
      summary.functions += Object.keys(file.fnMap).length;
      summary.branches += Object.keys(file.branchMap).length;

      // Calcular no cubiertos
      summary.uncoveredStatements += Object.values(file.s).filter(v => v === 0).length;
      summary.uncoveredFunctions += Object.values(file.f).filter(v => v === 0).length;
      summary.uncoveredBranches += Object.values(file.b).flat().filter(v => v === 0).length;
    });

    return summary;
  }

  private calculatePackageSummary(report: CoverageReportFront, packageName: string, className?: string): CoverageSummary {
    const summary: CoverageSummary = {
      statements: 0,
      functions: 0,
      branches: 0,
      uncoveredStatements: 0,
      uncoveredFunctions: 0,
      uncoveredBranches: 0
    };

    Object.values(report.files)
      .filter(file => file.path.includes(packageName))
      .filter(file => !className || file.path.includes(className))
      .forEach(file => {
        summary.statements += Object.keys(file.statementMap).length;
        summary.functions += Object.keys(file.fnMap).length;
        summary.branches += Object.keys(file.branchMap).length;

        summary.uncoveredStatements += Object.values(file.s).filter(v => v === 0).length;
        summary.uncoveredFunctions += Object.values(file.f).filter(v => v === 0).length;
        summary.uncoveredBranches += Object.values(file.b).flat().filter(v => v === 0).length;
      });

    return summary;
  }

  private calculateClassSummary(report: CoverageReportFront, className: string): CoverageSummary {
    const summary: CoverageSummary = {
      statements: 0,
      functions: 0,
      branches: 0,
      uncoveredStatements: 0,
      uncoveredFunctions: 0,
      uncoveredBranches: 0
    };

    Object.values(report.files)
      .filter(file => file.path.includes(className))
      .forEach(file => {
        summary.statements += Object.keys(file.statementMap).length;
        summary.functions += Object.keys(file.fnMap).length;
        summary.branches += Object.keys(file.branchMap).length;

        summary.uncoveredStatements += Object.values(file.s).filter(v => v === 0).length;
        summary.uncoveredFunctions += Object.values(file.f).filter(v => v === 0).length;
        summary.uncoveredBranches += Object.values(file.b).flat().filter(v => v === 0).length;
      });

    return summary;
  }

  private getLinesByPath(report: CoverageReportFront, path: string): FileCoverage {
    const file = Object.values(report.files).find(f => f.path.includes(path));
    if (!file) {
      throw new Error(`File not found for path: ${path}`);
    }
    return file;
  }

  private getAllPaths(report: CoverageReportFront): string[] {
    return Object.values(report.files).map(file => file.path);
  }
} 