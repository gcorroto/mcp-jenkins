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
    app: z.string().describe("Nombre de la aplicación")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getJobStatus(args.app);
      
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
    buildNumber: z.number().describe("Número del build a detener")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().stopJob(args.app, args.buildNumber);
      
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
    buildNumber: z.number().describe("Número del build")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getJobStepsStatus(args.app, args.buildNumber);
      
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
    nodeId: z.string().describe("ID del nodo")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getNodeStatus(args.app, args.buildNumber, args.nodeId);
      
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
    buildNumber: z.number().describe("Número del build")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getPendingInputActions(args.app, args.buildNumber);
      
      const actionsText = `⏳ **Acciones Pendientes - Build #${args.buildNumber}**\n\n` +
        `**ID:** ${result.id}\n` +
        `**Proceed URL:** ${result.proceedUrl}\n` +
        `**Abort URL:** ${result.abortUrl}\n` +
        (result.message ? `**Mensaje:** ${result.message}\n` : '') +
        (result.inputs ? 
          `\n**Inputs requeridos:**\n${result.inputs.map(input => 
            `- ${input.name}: ${input.description || 'Sin descripción'}`
          ).join('\n')}` : '');

      return {
        content: [{ type: "text", text: actionsText }],
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
    className: z.string().optional().describe("Nombre de la clase específica")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReport(
        args.app, 
        args.buildNumber, 
        args.packageName, 
        args.className
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
    path: z.string().describe("Ruta del archivo")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReportLines(args.app, args.buildNumber, args.path);
      
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
    buildNumber: z.number().describe("Número del build")
  },
  async (args) => {
    try {
      const result = await getJenkinsService().getCoverageReportPaths(args.app, args.buildNumber);
      
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
      "jenkins_get_git_branches"
    ]);
    
  } catch (error) {
    console.error("Error starting server:", error);
    console.error("Stack trace:", (error as Error).stack);
    process.exit(1);
  }
}

// Start the server
runServer(); 