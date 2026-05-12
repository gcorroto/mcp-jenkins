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
  JenkinsError,
  JobSummary,
  JobListOptions,
  JobConfigResult,
  CreatePipelineJobOptions,
  BuildListOptions,
  BuildStartOptions,
  WaitForBuildOptions,
  WaitForBuildResult,
  Artifact,
  ConsoleTextResult,
  Build
} from '../common/types.js';
import {
  createJenkinsConfig,
  createAuthHeaders,
  createFormHeaders,
  createXmlHeaders,
  createHttpsAgent,
  buildJobUrl,
  buildJobBuildUrl,
  buildJobFullNameUrl,
  buildJobFullNameBuildUrl,
  handleHttpError,
  validateAppName,
  validateJobFullName,
  requireExactConfirmation,
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
    const url = `${buildJobUrl('', app, 'main')}/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems?param=BRANCH_TO_BUILD`;

    try {
      const response: AxiosResponse<{ values: GitBranch[] }> = await this.client.get(url);
      return response.data.values.map(branch => branch.name);
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get Git branches for app: ${app}`);
    }
  }

  async listJobs(options: JobListOptions = {}): Promise<JobSummary[]> {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const basePath = options.folder ? buildJobFullNameUrl('', options.folder) : '';
    const tree = 'jobs[name,fullName,url,color,buildable,description,displayName,lastBuild[number,url,result,building,duration,timestamp],nextBuildNumber]';

    try {
      const response: AxiosResponse<{ jobs: JobSummary[] }> = await this.client.get(`${basePath}/api/json`, {
        params: { tree }
      });

      const query = options.query?.toLowerCase().trim();
      const jobs = response.data.jobs || [];

      return jobs
        .filter(job => !query || job.name.toLowerCase().includes(query) || job.fullName?.toLowerCase().includes(query))
        .slice(0, limit);
    } catch (error: any) {
      throw handleHttpError(error, `Failed to list Jenkins jobs${options.folder ? ` in folder: ${options.folder}` : ''}`);
    }
  }

  async getJobByFullName(fullName: string): Promise<JobSummary> {
    this.validateFullName(fullName);

    const tree = 'name,fullName,url,color,buildable,description,displayName,lastBuild[number,url,result,building,duration,timestamp],nextBuildNumber';

    try {
      const response: AxiosResponse<JobSummary> = await this.client.get(`${buildJobFullNameUrl('', fullName)}/api/json`, {
        params: { tree }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new JenkinsError(`Job not found: ${fullName}`);
      }
      throw handleHttpError(error, `Failed to get Jenkins job: ${fullName}`);
    }
  }

  async getJobConfig(fullName: string): Promise<JobConfigResult> {
    this.validateFullName(fullName);

    try {
      const response: AxiosResponse<string> = await this.client.get(`${buildJobFullNameUrl('', fullName)}/config.xml`, {
        responseType: 'text'
      });
      return { fullName, configXml: response.data };
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get Jenkins job config: ${fullName}`);
    }
  }

  async createPipelineJob(options: CreatePipelineJobOptions): Promise<string> {
    this.validateFullName(options.fullName);
    this.validateConfigXml(options.configXml);

    const segments = this.splitFullName(options.fullName);
    const jobName = segments[segments.length - 1];
    const parentFullName = segments.slice(0, -1).join('/');
    const parentPath = parentFullName ? buildJobFullNameUrl('', parentFullName) : '';

    try {
      await this.client.post(`${parentPath}/createItem`, options.configXml, {
        params: { name: jobName },
        headers: createXmlHeaders(this.config)
      });
      return `Pipeline job created successfully: ${options.fullName}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to create Jenkins pipeline job: ${options.fullName}`);
    }
  }

  async updateJobConfig(fullName: string, configXml: string, confirmName?: string): Promise<string> {
    this.validateFullName(fullName);
    this.validateConfigXml(configXml);
    requireExactConfirmation(fullName, confirmName, 'Updating Jenkins job config');

    try {
      await this.client.post(`${buildJobFullNameUrl('', fullName)}/config.xml`, configXml, {
        headers: createXmlHeaders(this.config)
      });
      return `Job config updated successfully: ${fullName}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to update Jenkins job config: ${fullName}`);
    }
  }

  async deleteJob(fullName: string, confirmName?: string): Promise<string> {
    this.validateFullName(fullName);
    requireExactConfirmation(fullName, confirmName, 'Deleting Jenkins job');

    try {
      await this.client.post(`${buildJobFullNameUrl('', fullName)}/doDelete`);
      return `Job deleted successfully: ${fullName}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to delete Jenkins job: ${fullName}`);
    }
  }

  async setJobEnabled(fullName: string, enabled: boolean, confirmName?: string): Promise<string> {
    this.validateFullName(fullName);
    requireExactConfirmation(fullName, confirmName, `${enabled ? 'Enabling' : 'Disabling'} Jenkins job`);

    try {
      await this.client.post(`${buildJobFullNameUrl('', fullName)}/${enabled ? 'enable' : 'disable'}`);
      return `Job ${enabled ? 'enabled' : 'disabled'} successfully: ${fullName}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to ${enabled ? 'enable' : 'disable'} Jenkins job: ${fullName}`);
    }
  }

  async listBuilds(options: BuildListOptions): Promise<Build[]> {
    this.validateFullName(options.fullName);
    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const tree = `builds[number,url,building,duration,estimatedDuration,result,timestamp,displayName,id,description]{0,${limit}}`;

    try {
      const response: AxiosResponse<{ builds: Build[] }> = await this.client.get(`${buildJobFullNameUrl('', options.fullName)}/api/json`, {
        params: { tree }
      });
      return response.data.builds || [];
    } catch (error: any) {
      throw handleHttpError(error, `Failed to list builds for Jenkins job: ${options.fullName}`);
    }
  }

  async getBuildByFullName(fullName: string, buildNumber: number): Promise<Build> {
    this.validateFullName(fullName);

    try {
      const response: AxiosResponse<Build> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/api/json`);
      return response.data;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get build ${buildNumber} for Jenkins job: ${fullName}`);
    }
  }

  async startBuild(options: BuildStartOptions): Promise<string> {
    this.validateFullName(options.fullName);

    const parameters = options.parameters || {};
    const hasParameters = Object.keys(parameters).length > 0;
    const endpoint = `${buildJobFullNameUrl('', options.fullName)}/${hasParameters ? 'buildWithParameters' : 'build'}`;

    try {
      if (hasParameters) {
        const params = new URLSearchParams();
        Object.entries(parameters).forEach(([key, value]) => params.append(key, String(value)));
        await this.client.post(endpoint, params.toString(), {
          headers: createFormHeaders(this.config)
        });
      } else {
        await this.client.post(endpoint);
      }

      return `Build started successfully for job ${options.fullName}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to start build for Jenkins job: ${options.fullName}`);
    }
  }

  async stopBuildByFullName(fullName: string, buildNumber: number, confirmBuild?: number): Promise<string> {
    this.validateFullName(fullName);
    if (confirmBuild !== buildNumber) {
      throw new Error(`Stopping build requires explicit confirmation. Set confirmBuild to exactly: ${buildNumber}`);
    }

    try {
      await this.client.post(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/stop`);
      return `Build stopped successfully for job ${fullName}, build ${buildNumber}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to stop build ${buildNumber} for Jenkins job: ${fullName}`);
    }
  }

  async replayBuild(fullName: string, buildNumber: number, mode: 'replay' | 'rebuild' = 'rebuild'): Promise<string> {
    this.validateFullName(fullName);
    const endpoint = mode === 'replay' ? 'replay/run' : 'rebuild';

    try {
      await this.client.post(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/${endpoint}`);
      return `${mode === 'replay' ? 'Replay' : 'Rebuild'} requested successfully for job ${fullName}, build ${buildNumber}`;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to ${mode} build ${buildNumber} for Jenkins job: ${fullName}. Confirm the required Jenkins plugin/endpoint is available.`);
    }
  }

  async waitForBuildCompletion(options: WaitForBuildOptions): Promise<WaitForBuildResult> {
    this.validateFullName(options.fullName);

    if (!Number.isInteger(options.buildNumber) || options.buildNumber <= 0) {
      throw new Error('buildNumber must be a positive integer.');
    }

    const pollIntervalSeconds = this.clampNumber(options.pollIntervalSeconds || 10, 2, 120);
    const timeoutSeconds = this.clampNumber(options.timeoutSeconds || 1800, pollIntervalSeconds, 86400);
    const startedAt = Date.now();
    let pollCount = 0;
    let latestBuild: Build | undefined;

    while (true) {
      pollCount += 1;
      latestBuild = await this.getBuildByFullName(options.fullName, options.buildNumber);
      const waitedSeconds = Math.round((Date.now() - startedAt) / 1000);

      const pendingInput = await this.getPendingInputActionsIfAvailable(options.fullName, options.buildNumber);
      if (pendingInput) {
        const result: WaitForBuildResult = {
          fullName: options.fullName,
          buildNumber: options.buildNumber,
          completed: false,
          timedOut: false,
          waitingForInput: true,
          waitedSeconds,
          pollCount,
          result: latestBuild.result,
          build: latestBuild,
          pendingInput,
          nextStep: `Build paused waiting for manual input. To approve, call jenkins_submit_input_action with decisionUrl=${pendingInput.proceedUrl}. To abort, use decisionUrl=${pendingInput.abortUrl}.`
        };

        if (options.includeStages) {
          try {
            const steps = await this.getBuildStepsByFullName(options.fullName, options.buildNumber);
            result.stages = steps.stages;
          } catch {
            // Some jobs are not Pipeline jobs or do not expose wfapi. The pending input result is still useful.
          }
        }

        return result;
      }

      if (!latestBuild.building) {
        const result: WaitForBuildResult = {
          fullName: options.fullName,
          buildNumber: options.buildNumber,
          completed: true,
          timedOut: false,
          waitedSeconds,
          pollCount,
          result: latestBuild.result,
          build: latestBuild
        };

        if (options.includeStages) {
          try {
            const steps = await this.getBuildStepsByFullName(options.fullName, options.buildNumber);
            result.stages = steps.stages;
          } catch {
            // Some jobs are not Pipeline jobs or do not expose wfapi. The completed build result is still useful.
          }
        }

        return result;
      }

      if (waitedSeconds >= timeoutSeconds) {
        return {
          fullName: options.fullName,
          buildNumber: options.buildNumber,
          completed: false,
          timedOut: true,
          waitedSeconds,
          pollCount,
          result: latestBuild.result,
          build: latestBuild
        };
      }

      await this.sleep(pollIntervalSeconds * 1000);
    }
  }

  async getBuildConsole(fullName: string, buildNumber: number, start?: number, limit?: number): Promise<ConsoleTextResult> {
    this.validateFullName(fullName);

    try {
      if (start !== undefined) {
        const response: AxiosResponse<string> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/logText/progressiveText`, {
          params: { start },
          responseType: 'text'
        });
        const end = Number(response.headers['x-text-size'] || start + response.data.length);
        const hasMore = response.headers['x-more-data'] === 'true';
        const text = limit ? response.data.slice(0, limit) : response.data;
        return { fullName, buildNumber, text, start, end, hasMore };
      }

      const response: AxiosResponse<string> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/consoleText`, {
        responseType: 'text'
      });
      const text = limit ? response.data.slice(-limit) : response.data;
      return { fullName, buildNumber, text };
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get console output for Jenkins job: ${fullName}, build: ${buildNumber}`);
    }
  }

  async listArtifacts(fullName: string, buildNumber: number): Promise<Artifact[]> {
    const build = await this.getBuildByFullName(fullName, buildNumber);
    const baseUrl = build.url || buildJobFullNameBuildUrl(this.config.url, fullName, buildNumber);

    return (build.artifacts || []).map(artifact => ({
      ...artifact,
      url: `${baseUrl}/artifact/${artifact.relativePath}`
    }));
  }

  async getBuildStepsByFullName(fullName: string, buildNumber: number): Promise<BuildSteps> {
    this.validateFullName(fullName);

    try {
      const response: AxiosResponse<BuildSteps> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/wfapi/describe`);
      return response.data;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get pipeline steps for Jenkins job: ${fullName}, build: ${buildNumber}`);
    }
  }

  async getNodeStatusByFullName(fullName: string, buildNumber: number, nodeId: string): Promise<NodeStatus | PendingInputAction> {
    this.validateFullName(fullName);

    try {
      const response: AxiosResponse<NodeStatus> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/execution/node/${nodeId}/wfapi/describe`);
      const nodeDetails = response.data;

      if (nodeDetails.status === 'PAUSED_PENDING_INPUT') {
        return await this.getPendingInputActionsByFullName(fullName, buildNumber);
      }

      return nodeDetails;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get pipeline node for Jenkins job: ${fullName}, build: ${buildNumber}, node: ${nodeId}`);
    }
  }

  async getPendingInputActionsByFullName(fullName: string, buildNumber: number): Promise<PendingInputAction> {
    this.validateFullName(fullName);

    try {
      const response: AxiosResponse<PendingInputAction> = await this.client.get(`${buildJobFullNameBuildUrl('', fullName, buildNumber)}/wfapi/nextPendingInputAction`);
      return response.data;
    } catch (error: any) {
      throw handleHttpError(error, `Failed to get pending input actions for Jenkins job: ${fullName}, build: ${buildNumber}`);
    }
  }

  // Métodos privados de soporte

  private validateFullName(fullName: string): void {
    if (!validateJobFullName(fullName)) {
      throw new Error('Invalid Jenkins job fullName. Provide a non-empty Jenkins path without XML/HTML special characters.');
    }
  }

  private validateConfigXml(configXml: string): void {
    if (!configXml.trim().startsWith('<')) {
      throw new Error('configXml must be a Jenkins XML configuration document.');
    }
  }

  private splitFullName(fullName: string): string[] {
    return fullName
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private async getPendingInputActionsIfAvailable(fullName: string, buildNumber: number): Promise<PendingInputAction | undefined> {
    try {
      const pendingInput = await this.getPendingInputActionsByFullName(fullName, buildNumber);
      if (!pendingInput?.proceedUrl || !pendingInput?.abortUrl) {
        return undefined;
      }

      return pendingInput;
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) {
        return undefined;
      }

      return undefined;
    }
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

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
