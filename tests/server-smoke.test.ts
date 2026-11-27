import { describe, expect, it } from '@jest/globals';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { execFileSync } from 'node:child_process';

describe('stdio server', () => {
  it('lists the 15 tools and preserves field descriptions', async () => {
    execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'pipe' });
    const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], env: { ...process.env as Record<string, string>, JENKINS_URL: 'http://127.0.0.1:9', JENKINS_USERNAME: 'test', JENKINS_PASSWORD: 'test' } });
    const client = new Client({ name: 'smoke', version: '1.0.0' });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      expect(tools.map(t => t.name).sort()).toEqual([
        'jenkins_get_job_status', 'jenkins_start_job', 'jenkins_stop_job', 'jenkins_get_build_steps',
        'jenkins_get_node_status', 'jenkins_get_pending_actions', 'jenkins_submit_input_action',
        'jenkins_get_coverage_report', 'jenkins_get_coverage_lines', 'jenkins_get_coverage_paths',
        'jenkins_get_git_branches', 'jenkins_job_manager', 'jenkins_build_manager',
        'jenkins_wait_for_build', 'jenkins_pipeline_monitor'
      ].sort());
      const properties = tools.find(t => t.name === 'jenkins_wait_for_build')!.inputSchema.properties as Record<string, { description?: string }>;
      expect(properties.waitSeconds).toBeDefined();
      expect(properties.fullName.description).toBe('Ruta completa del job en Jenkins, por ejemplo folder/app/main');
      expect(properties.buildNumber.description).toBe('Número del build a esperar');
    } finally { await client.close(); }
  }, 30000);
});
