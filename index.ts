#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Import Jenkins service
import { JenkinsService } from "./tools/jenkins-service.js";
import { formatDuration, formatTimestamp } from "./common/utils.js";
import { CoverageSummary } from "./common/types.js";

import { VERSION } from "./common/version.js";

// Create the MCP Server with proper configuration
const server = new McpServer({
  name: "jenkins-mcp-server",
  version: VERSION,
});

// Create Jenkins service instance (lazy initialization)
let jenkinsService: JenkinsService | null = null;

function getJenkinsService(): JenkinsService {
  if (!jenkinsService) {
    try {
      jenkinsService = new JenkinsService();
    } catch (error: any) {
      throw new Error(`Jenkins configuration error: ${error.message}`);
    }
  }
  return jenkinsService;
}

// ----- HERRAMIENTAS MCP PARA JENKINS CI/CD -----

// 1. Obtener estado de un job
server.tool(
  "jenkins_get_job_status",
  "Obtener el estado de un job específico de Jenkins",
  {
    app: z.string().describe("Nombre de la aplicación"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getJobStatus(args.app, args.branch || 'main');

      const lastBuild = result.lastBuild;
      const statusText = `🔧 **Estado del Job: ${result.displayName}**\n\n` +
        `**URL:** ${result.url}\n` +
        `**Estado:** ${result.color}\n` +
        `**Construible:** ${result.buildable ? '✅' : '❌'}\n` +
        `**Próximo build:** #${result.nextBuildNumber}\n\n` +
        (lastBuild ?
          `**Último build:** #${lastBuild.number}\n` +
          `**Resultado:** ${lastBuild.result || 'En progreso'}\n` +
          `**Duración:** ${formatDuration(lastBuild.duration || 0)}\n` +
          `**Timestamp:** ${formatTimestamp(lastBuild.timestamp || 0)}`
          : 'Sin builds previos');

      return {
        content: [{ type: "text", text: statusText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 2. Iniciar un job
server.tool(
  "jenkins_start_job",
  "Iniciar un job de Jenkins con una rama específica",
  {
    app: z.string().describe("Nombre de la aplicación"),
    branch: z.string().describe("Rama de Git a construir")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().startJob(args.app, args.branch);

      return {
        content: [{ type: "text", text: `🚀 **${result}**` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 3. Detener un job
server.tool(
  "jenkins_stop_job",
  "Detener un job de Jenkins en ejecución",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build a detener"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().stopJob(args.app, args.buildNumber, args.branch || 'main');

      return {
        content: [{ type: "text", text: `🛑 **${result}**` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 4. Obtener estado de los steps de un build
server.tool(
  "jenkins_get_build_steps",
  "Obtener el estado de los steps de un build específico",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getJobStepsStatus(args.app, args.buildNumber, args.branch || 'main');

      const stepsText = `📋 **Steps del Build #${args.buildNumber} - ${args.app}**\n\n` +
        `**ID:** ${result.id}\n` +
        `**Nombre:** ${result.name}\n` +
        `**Estado:** ${result.status}\n` +
        `**Duración:** ${formatDuration(result.durationMillis)}\n` +
        `**Inicio:** ${formatTimestamp(result.startTimeMillis)}\n\n` +
        `**Stages (${result.stages.length}):**\n` +
        result.stages.map(stage =>
          `- **${stage.name}** (${stage.status}) - ${formatDuration(stage.durationMillis)}`
        ).join('\n');

      return {
        content: [{ type: "text", text: stepsText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 5. Obtener estado de un nodo específico
server.tool(
  "jenkins_get_node_status",
  "Obtener el estado de un nodo específico de un build",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    nodeId: z.string().describe("ID del nodo"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getNodeStatus(args.app, args.buildNumber, args.nodeId, args.branch || 'main');

      let statusText: string;

      if ('proceedUrl' in result) {
        // Es un PendingInputAction
        statusText = `⏸️ **Nodo Esperando Input - ${args.nodeId}**\n\n` +
          `**ID:** ${result.id}\n` +
          `**Proceed URL:** ${result.proceedUrl}\n` +
          `**Abort URL:** ${result.abortUrl}\n` +
          (result.message ? `**Mensaje:** ${result.message}` : '');
      } else {
        // Es un NodeStatus normal
        statusText = `🔍 **Estado del Nodo: ${args.nodeId}**\n\n` +
          `**Nombre:** ${result.name}\n` +
          `**Estado:** ${result.status}\n` +
          `**Duración:** ${formatDuration(result.durationMillis)}\n` +
          `**Inicio:** ${formatTimestamp(result.startTimeMillis)}`;
      }

      return {
        content: [{ type: "text", text: statusText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 6. Obtener acciones pendientes de input
server.tool(
  "jenkins_get_pending_actions",
  "Obtener las acciones pendientes de input de un build",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getPendingInputActions(args.app, args.buildNumber, args.branch || 'main');

      const pendingText = `⏳ **Acciones Pendientes - Build #${args.buildNumber}**\n\n` +
        `**ID:** ${result.id}\n` +
        `**Proceed URL:** ${result.proceedUrl}\n` +
        `**Abort URL:** ${result.abortUrl}\n` +
        (result.message ? `**Mensaje:** ${result.message}\n` : '') +
        (result.inputs && result.inputs.length > 0 ?
          `**Inputs requeridos:**\n${result.inputs.map(input => `- ${input.name}: ${input.description || 'N/A'}`).join('\n')}`
          : '');

      return {
        content: [{ type: "text", text: pendingText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 7. Enviar acción de input
server.tool(
  "jenkins_submit_input_action",
  "Enviar una acción de input a Jenkins (aprobar/rechazar)",
  {
    decisionUrl: z.string().describe("URL de la decisión (proceedUrl o abortUrl)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().submitInputAction(args.decisionUrl);

      return {
        content: [{ type: "text", text: `✅ **${result}**` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 8. Obtener reporte de cobertura
server.tool(
  "jenkins_get_coverage_report",
  "Obtener reporte de cobertura de código de un build",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    packageName: z.string().optional().describe("Nombre del paquete específico"),
    className: z.string().optional().describe("Nombre de la clase específica"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReport(
        args.app,
        args.buildNumber,
        args.packageName,
        args.className,
        args.branch || 'main'
      );

      let coverageText: string;

      if ('instructionCoverage' in result) {
        // Es un CoverageReport (backend)
        coverageText = `📊 **Reporte de Cobertura - Build #${args.buildNumber}**\n\n` +
          `**Instrucciones:** ${result.instructionCoverage?.percentage || 0}% (${result.instructionCoverage?.covered || 0}/${result.instructionCoverage?.total || 0})\n` +
          `**Ramas:** ${result.branchCoverage?.percentage || 0}% (${result.branchCoverage?.covered || 0}/${result.branchCoverage?.total || 0})\n` +
          `**Líneas:** ${result.lineCoverage?.percentage || 0}% (${result.lineCoverage?.covered || 0}/${result.lineCoverage?.total || 0})`;
      } else {
        // Es un CoverageSummary (frontend)
        const summary = result as CoverageSummary;
        const stmtPercent = summary.statements > 0 ? ((summary.statements - summary.uncoveredStatements) / summary.statements * 100).toFixed(2) : 0;
        const funcPercent = summary.functions > 0 ? ((summary.functions - summary.uncoveredFunctions) / summary.functions * 100).toFixed(2) : 0;
        const branchPercent = summary.branches > 0 ? ((summary.branches - summary.uncoveredBranches) / summary.branches * 100).toFixed(2) : 0;

        coverageText = `📊 **Resumen de Cobertura - Build #${args.buildNumber}**\n\n` +
          `**Declaraciones:** ${stmtPercent}% (${summary.statements - summary.uncoveredStatements}/${summary.statements})\n` +
          `**Funciones:** ${funcPercent}% (${summary.functions - summary.uncoveredFunctions}/${summary.functions})\n` +
          `**Ramas:** ${branchPercent}% (${summary.branches - summary.uncoveredBranches}/${summary.branches})`;
      }

      return {
        content: [{ type: "text", text: coverageText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 9. Obtener líneas de cobertura por archivo
server.tool(
  "jenkins_get_coverage_lines",
  "Obtener líneas de cobertura de un archivo específico",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    path: z.string().describe("Ruta del archivo"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReportLines(args.app, args.buildNumber, args.path, args.branch || 'main');

      const linesText = `📄 **Cobertura de Archivo: ${args.path}**\n\n` +
        `**Declaraciones:** ${Object.keys(result.statementMap).length}\n` +
        `**Funciones:** ${Object.keys(result.fnMap).length}\n` +
        `**Ramas:** ${Object.keys(result.branchMap).length}\n\n` +
        `**Líneas cubiertas:** ${Object.values(result.s).filter(v => v > 0).length}/${Object.keys(result.s).length}\n` +
        `**Funciones cubiertas:** ${Object.values(result.f).filter(v => v > 0).length}/${Object.keys(result.f).length}`;

      return {
        content: [{ type: "text", text: linesText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 10. Obtener todos los paths de cobertura
server.tool(
  "jenkins_get_coverage_paths",
  "Obtener todos los paths de archivos con cobertura",
  {
    app: z.string().describe("Nombre de la aplicación"),
    buildNumber: z.number().describe("Número del build"),
    branch: z.string().optional().describe("Rama de Git (por defecto: main)")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReportPaths(args.app, args.buildNumber, args.branch || 'main');

      const pathsText = `📂 **Paths de Cobertura - Build #${args.buildNumber}**\n\n` +
        `**Total de archivos:** ${result.length}\n\n` +
        result.slice(0, 20).map((path, index) => `${index + 1}. ${path}`).join('\n') +
        (result.length > 20 ? `\n\n... y ${result.length - 20} archivos más` : '');

      return {
        content: [{ type: "text", text: pathsText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

// 11. Obtener ramas de Git disponibles
server.tool(
  "jenkins_get_git_branches",
  "Obtener las ramas de Git disponibles para un job",
  {
    app: z.string().describe("Nombre de la aplicación")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getGitBranches(args.app);

      const branchesText = `🌿 **Ramas de Git Disponibles - ${args.app}**\n\n` +
        `**Total de ramas:** ${result.length}\n\n` +
        result.slice(0, 15).map((branch, index) => `${index + 1}. ${branch}`).join('\n') +
        (result.length > 15 ? `\n\n... y ${result.length - 15} ramas más` : '');

      return {
        content: [{ type: "text", text: branchesText }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `❌ **Error:** ${error.message}` }],
      };
    }
  }
);

function jsonResponse(result: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

function errorResponse(error: any) {
  return {
    content: [{ type: "text" as const, text: `❌ **Error:** ${error.message}` }],
  };
}

const buildParametersSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));
const optionalText = (description: string) => z.string().optional().default("").describe(description);
const optionalNumber = (description: string) => z.number().optional().default(0).describe(description);

server.tool(
  "jenkins_job_manager",
  "Gestionar jobs y pipelines de Jenkins: listar, leer, crear, actualizar config, borrar, habilitar, deshabilitar y ramas Git",
  {
    action: z.enum(["list", "get", "get_config", "create_pipeline", "update_config", "delete", "enable", "disable", "get_branches"]).describe("Acción a ejecutar"),
    fullName: optionalText("Ruta completa del job en Jenkins, por ejemplo folder/app/main"),
    folder: optionalText("Folder desde el que listar jobs"),
    query: optionalText("Filtro de texto para nombre o fullName"),
    limit: z.number().optional().default(50).describe("Máximo de resultados a devolver"),
    configXml: optionalText("config.xml completo para crear o actualizar un job"),
    confirmName: optionalText("Confirmación exacta requerida para update_config, delete, enable y disable"),
    app: optionalText("Nombre de la aplicación para get_branches compatible con herramientas existentes")
  },
  async (args) => {
    try {
      const service = getJenkinsService();

      switch (args.action) {
        case "list":
          return jsonResponse(await service.listJobs({ folder: args.folder, query: args.query, limit: args.limit }));

        case "get":
          if (!args.fullName) throw new Error("fullName is required for get action");
          return jsonResponse(await service.getJobByFullName(args.fullName));

        case "get_config":
          if (!args.fullName) throw new Error("fullName is required for get_config action");
          return jsonResponse(await service.getJobConfig(args.fullName));

        case "create_pipeline":
          if (!args.fullName || !args.configXml) throw new Error("fullName and configXml are required for create_pipeline action");
          return jsonResponse({ message: await service.createPipelineJob({ fullName: args.fullName, configXml: args.configXml }) });

        case "update_config":
          if (!args.fullName || !args.configXml) throw new Error("fullName and configXml are required for update_config action");
          return jsonResponse({ message: await service.updateJobConfig(args.fullName, args.configXml, args.confirmName) });

        case "delete":
          if (!args.fullName) throw new Error("fullName is required for delete action");
          return jsonResponse({ message: await service.deleteJob(args.fullName, args.confirmName) });

        case "enable":
          if (!args.fullName) throw new Error("fullName is required for enable action");
          return jsonResponse({ message: await service.setJobEnabled(args.fullName, true, args.confirmName) });

        case "disable":
          if (!args.fullName) throw new Error("fullName is required for disable action");
          return jsonResponse({ message: await service.setJobEnabled(args.fullName, false, args.confirmName) });

        case "get_branches":
          if (!args.app) throw new Error("app is required for get_branches action");
          return jsonResponse(await service.getGitBranches(args.app));

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return errorResponse(error);
    }
  }
);

server.tool(
  "jenkins_build_manager",
  "Gestionar builds de Jenkins: listar, consultar, iniciar, esperar, detener con confirmación, reconstruir, replay, logs y artifacts",
  {
    action: z.enum(["list", "get", "start", "wait", "stop", "rebuild", "replay", "console", "artifacts"]).describe("Acción a ejecutar"),
    fullName: z.string().describe("Ruta completa del job en Jenkins, por ejemplo folder/app/main"),
    buildNumber: optionalNumber("Número de build"),
    limit: optionalNumber("Límite de builds o caracteres de consola"),
    start: optionalNumber("Offset para logs progresivos"),
    pollIntervalSeconds: z.number().optional().default(10).describe("Segundos entre consultas al esperar un build"),
    timeoutSeconds: z.number().optional().default(1800).describe("Timeout máximo al esperar un build"),
    includeStages: z.boolean().optional().default(false).describe("Incluir stages del pipeline al finalizar"),
    parameters: buildParametersSchema.optional().describe("Parámetros para iniciar buildWithParameters"),
    confirmBuild: optionalNumber("Confirmación exacta requerida para stop")
  },
  async (args) => {
    try {
      const service = getJenkinsService();

      switch (args.action) {
        case "list":
          return jsonResponse(await service.listBuilds({ fullName: args.fullName, limit: args.limit }));

        case "get":
          if (!args.buildNumber) throw new Error("buildNumber is required for get action");
          return jsonResponse(await service.getBuildByFullName(args.fullName, args.buildNumber));

        case "start":
          return jsonResponse({ message: await service.startBuild({ fullName: args.fullName, parameters: args.parameters }) });

        case "wait":
          if (!args.buildNumber) throw new Error("buildNumber is required for wait action");
          return jsonResponse(await service.waitForBuildCompletion({
            fullName: args.fullName,
            buildNumber: args.buildNumber,
            pollIntervalSeconds: args.pollIntervalSeconds,
            timeoutSeconds: args.timeoutSeconds,
            includeStages: args.includeStages
          }));

        case "stop":
          if (!args.buildNumber) throw new Error("buildNumber is required for stop action");
          return jsonResponse({ message: await service.stopBuildByFullName(args.fullName, args.buildNumber, args.confirmBuild) });

        case "rebuild":
          if (!args.buildNumber) throw new Error("buildNumber is required for rebuild action");
          return jsonResponse({ message: await service.replayBuild(args.fullName, args.buildNumber, "rebuild") });

        case "replay":
          if (!args.buildNumber) throw new Error("buildNumber is required for replay action");
          return jsonResponse({ message: await service.replayBuild(args.fullName, args.buildNumber, "replay") });

        case "console":
          if (!args.buildNumber) throw new Error("buildNumber is required for console action");
          return jsonResponse(await service.getBuildConsole(args.fullName, args.buildNumber, args.start, args.limit));

        case "artifacts":
          if (!args.buildNumber) throw new Error("buildNumber is required for artifacts action");
          return jsonResponse(await service.listArtifacts(args.fullName, args.buildNumber));

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return errorResponse(error);
    }
  }
);

server.tool(
  "jenkins_wait_for_build",
  "Esperar de forma bloqueante a que termine un build de Jenkins o detectar pausas manuales con input pendiente para poder aprobarlas desde MCP",
  {
    fullName: z.string().describe("Ruta completa del job en Jenkins, por ejemplo folder/app/main"),
    buildNumber: z.number().describe("Número del build a esperar"),
    pollIntervalSeconds: z.number().optional().default(10).describe("Segundos entre consultas; mínimo efectivo 2, máximo 120"),
    timeoutSeconds: z.number().optional().default(1800).describe("Timeout máximo; por defecto 30 minutos, máximo 24 horas"),
    includeStages: z.boolean().optional().default(true).describe("Incluir stages del pipeline cuando el build termine")
  },
  async (args) => {
    try {
      return jsonResponse(await getJenkinsService().waitForBuildCompletion({
        fullName: args.fullName,
        buildNumber: args.buildNumber,
        pollIntervalSeconds: args.pollIntervalSeconds,
        timeoutSeconds: args.timeoutSeconds,
        includeStages: args.includeStages
      }));
    } catch (error: any) {
      return errorResponse(error);
    }
  }
);

server.tool(
  "jenkins_pipeline_monitor",
  "Monitorear pipelines Jenkins: stages, nodos, inputs pendientes y envío de acciones de input",
  {
    action: z.enum(["steps", "node", "pending_inputs", "submit_input"]).describe("Acción a ejecutar"),
    fullName: optionalText("Ruta completa del job en Jenkins"),
    buildNumber: optionalNumber("Número de build"),
    nodeId: optionalText("ID del nodo del pipeline"),
    decisionUrl: optionalText("URL proceedUrl o abortUrl devuelta por Jenkins")
  },
  async (args) => {
    try {
      const service = getJenkinsService();

      switch (args.action) {
        case "steps":
          if (!args.fullName || !args.buildNumber) throw new Error("fullName and buildNumber are required for steps action");
          return jsonResponse(await service.getBuildStepsByFullName(args.fullName, args.buildNumber));

        case "node":
          if (!args.fullName || !args.buildNumber || !args.nodeId) throw new Error("fullName, buildNumber and nodeId are required for node action");
          return jsonResponse(await service.getNodeStatusByFullName(args.fullName, args.buildNumber, args.nodeId));

        case "pending_inputs":
          if (!args.fullName || !args.buildNumber) throw new Error("fullName and buildNumber are required for pending_inputs action");
          return jsonResponse(await service.getPendingInputActionsByFullName(args.fullName, args.buildNumber));

        case "submit_input":
          if (!args.decisionUrl) throw new Error("decisionUrl is required for submit_input action");
          return jsonResponse({ message: await service.submitInputAction(args.decisionUrl) });

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return errorResponse(error);
    }
  }
);

async function runServer() {
  try {
    console.error("Creating Jenkins MCP Server...");
    console.error("Server info: jenkins-mcp-server");
    console.error("Version:", VERSION);

    // Validate environment variables
    if (!process.env.JENKINS_URL) {
      console.error("Warning: JENKINS_URL environment variable not set");
    } else {
      console.error("JENKINS_URL:", process.env.JENKINS_URL);
    }

    if (!process.env.JENKINS_USERNAME) {
      console.error("Warning: JENKINS_USERNAME environment variable not set");
    } else {
      console.error("JENKINS_USERNAME:", process.env.JENKINS_USERNAME);
    }

    if (!process.env.JENKINS_PASSWORD) {
      console.error("Warning: JENKINS_PASSWORD environment variable not set");
    } else {
      console.error("JENKINS_PASSWORD:", "***");
    }

    console.error("Starting Jenkins MCP Server in stdio mode...");

    // Create transport
    const transport = new StdioServerTransport();

    console.error("Connecting server to transport...");

    // Connect server to transport - this should keep the process alive
    await server.connect(transport);

    console.error("MCP Server connected and ready!");
    console.error("Available tools:", [
      "jenkins_get_job_status",
      "jenkins_start_job",
      "jenkins_stop_job",
      "jenkins_get_build_steps",
      "jenkins_get_node_status",
      "jenkins_get_pending_actions",
      "jenkins_submit_input_action",
      "jenkins_get_coverage_report",
      "jenkins_get_coverage_lines",
      "jenkins_get_coverage_paths",
      "jenkins_get_git_branches",
      "jenkins_job_manager",
      "jenkins_build_manager",
      "jenkins_wait_for_build",
      "jenkins_pipeline_monitor"
    ]);

  } catch (error) {
    console.error("Error starting server:", error);
    console.error("Stack trace:", (error as Error).stack);
    process.exit(1);
  }
}

// Start the server
runServer(); 
