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
