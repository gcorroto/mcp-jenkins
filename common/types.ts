export interface JenkinsConfig {
  url: string;
  username: string;
  password: string;
}

export interface JobStatus {
  name: string;
  url: string;
  buildable: boolean;
  builds: Build[];
  color: string;
  displayName: string;
  lastBuild?: Build;
  lastCompletedBuild?: Build;
  lastFailedBuild?: Build;
  lastStableBuild?: Build;
  lastSuccessfulBuild?: Build;
  lastUnstableBuild?: Build;
  lastUnsuccessfulBuild?: Build;
  nextBuildNumber: number;
}

export interface Build {
  number: number;
  url: string;
  building?: boolean;
  duration?: number;
  estimatedDuration?: number;
  result?: string;
  timestamp?: number;
  displayName?: string;
}

export interface BuildSteps {
  id: string;
  name: string;
  status: string;
  startTimeMillis: number;
  durationMillis: number;
  stages: Stage[];
}

export interface Stage {
  id: string;
  name: string;
  status: string;
  startTimeMillis: number;
  durationMillis: number;
  stageFlowNodes: StageFlowNode[];
}

export interface StageFlowNode {
  id: string;
  name: string;
  status: string;
  startTimeMillis: number;
  durationMillis: number;
}

export interface NodeStatus {
  id: string;
  name: string;
  status: string;
  startTimeMillis: number;
  durationMillis: number;
  parameterDescription?: string;
  type?: string;
}

export interface PendingInputAction {
  id: string;
  proceedUrl: string;
  abortUrl: string;
  message?: string;
  inputs?: InputParameter[];
}

export interface InputParameter {
  name: string;
  description?: string;
  defaultParameterValue?: {
    name: string;
    value: any;
  };
}

export interface CoverageReport {
  instructionCoverage?: CoverageMetric;
  branchCoverage?: CoverageMetric;
  complexityCoverage?: CoverageMetric;
  lineCoverage?: CoverageMetric;
  methodCoverage?: CoverageMetric;
  classCoverage?: CoverageMetric;
}

export interface CoverageMetric {
  covered: number;
  missed: number;
  percentage: number;
  total: number;
}

export interface CoverageReportFront {
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  path: string;
  statementMap: Record<string, any>;
  fnMap: Record<string, any>;
  branchMap: Record<string, any>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

export interface CoverageSummary {
  statements: number;
  functions: number;
  branches: number;
  uncoveredStatements: number;
  uncoveredFunctions: number;
  uncoveredBranches: number;
}

export interface GitBranch {
  name: string;
  value?: string;
}

export class JenkinsError extends Error {
  status?: number;
  response?: any;
  
  constructor(message: string) {
    super(message);
    this.name = 'JenkinsError';
  }
} 