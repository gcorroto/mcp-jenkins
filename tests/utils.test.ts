import { describe, expect, it } from '@jest/globals';
import {
  buildFullNameJobPath,
  buildJobFullNameBuildUrl,
  buildJobFullNameUrl,
  requireExactConfirmation,
  validateJobFullName,
} from '../common/utils.js';

describe('Jenkins fullName utilities', () => {
  it('builds Jenkins job paths from fullName values', () => {
    expect(buildFullNameJobPath('folder/app/main')).toBe('/job/folder/job/app/job/main');
    expect(buildJobFullNameUrl('', 'folder/app/main')).toBe('/job/folder/job/app/job/main');
    expect(buildJobFullNameBuildUrl('', 'folder/app/main', 42)).toBe('/job/folder/job/app/job/main/42');
  });

  it('encodes individual Jenkins job path segments', () => {
    expect(buildFullNameJobPath('folder name/app name')).toBe('/job/folder%20name/job/app%20name');
  });

  it('validates fullName values before destructive operations', () => {
    expect(validateJobFullName('folder/app/main')).toBe(true);
    expect(validateJobFullName('')).toBe(false);
    expect(validateJobFullName('bad<job')).toBe(false);
  });

  it('requires exact confirmations for protected actions', () => {
    expect(() => requireExactConfirmation('folder/app', undefined, 'Deleting Jenkins job')).toThrow('requires explicit confirmation');
    expect(() => requireExactConfirmation('folder/app', 'folder/other', 'Deleting Jenkins job')).toThrow('requires explicit confirmation');
    expect(() => requireExactConfirmation('folder/app', 'folder/app', 'Deleting Jenkins job')).not.toThrow();
  });
});

describe('Jenkins build status', () => {
  it('requests the fields needed for job status', async () => {
    const { JOB_STATUS_TREE } = await import('../tools/jenkins-service.js');
    expect(JOB_STATUS_TREE).toContain('lastBuild[number,url,building,result,duration,estimatedDuration,timestamp,displayName]');
    expect(JOB_STATUS_TREE).toContain('color');
    expect(JOB_STATUS_TREE).toContain('nextBuildNumber');
  });

  it('describes running, completed and unknown builds', async () => {
    const { describeBuildResult } = await import('../common/utils.js');
    expect(describeBuildResult({ building: true })).toBe('En progreso');
    expect(describeBuildResult({ building: false, result: 'SUCCESS' })).toBe('SUCCESS');
    expect(describeBuildResult({ result: 'FAILURE' })).toBe('FAILURE');
    expect(describeBuildResult({})).toBe('Desconocido');
    expect(describeBuildResult({ building: false, result: null })).toBe('Terminado (sin resultado)');
  });
});
