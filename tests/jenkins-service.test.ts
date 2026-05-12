import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JenkinsError, PendingInputAction, Stage } from '../common/types.js';
import { JenkinsService } from '../tools/jenkins-service.js';

describe('JenkinsService.waitForBuildCompletion', () => {
  let service: JenkinsService;

  beforeEach(() => {
    process.env.JENKINS_URL = 'https://test-jenkins.com';
    process.env.JENKINS_USERNAME = 'test-user';
    process.env.JENKINS_PASSWORD = 'test-password';
    service = new JenkinsService();
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  it('returns early when the build is paused waiting for manual input', async () => {
    const pendingInput: PendingInputAction = {
      id: 'input-1',
      proceedUrl: 'https://test-jenkins.com/job/folder/job/app/job/main/42/input/proceedEmpty',
      abortUrl: 'https://test-jenkins.com/job/folder/job/app/job/main/42/input/abort',
      message: 'Approve deployment'
    };
    const stages: Stage[] = [{
      id: '7',
      name: 'Deploy - Primary Environment',
      status: 'PAUSED_PENDING_INPUT',
      startTimeMillis: 0,
      durationMillis: 603,
      stageFlowNodes: []
    }];

    const getBuildByFullNameSpy = jest.spyOn(service, 'getBuildByFullName').mockResolvedValue({
      number: 42,
      url: 'https://test-jenkins.com/job/folder/job/app/job/main/42',
      building: true
    });
    jest.spyOn(service, 'getPendingInputActionsByFullName').mockResolvedValue(pendingInput);
    jest.spyOn(service, 'getBuildStepsByFullName').mockResolvedValue({
      id: '42',
      name: '#42',
      status: 'PAUSED_PENDING_INPUT',
      startTimeMillis: 0,
      durationMillis: 603,
      stages
    });

    const result = await service.waitForBuildCompletion({
      fullName: 'folder/app/main',
      buildNumber: 42,
      pollIntervalSeconds: 2,
      timeoutSeconds: 30,
      includeStages: true
    });

    expect(result.completed).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.waitingForInput).toBe(true);
    expect(result.pendingInput).toEqual(pendingInput);
    expect(result.stages).toEqual(stages);
    expect(result.nextStep).toContain('jenkins_submit_input_action');
    expect(getBuildByFullNameSpy).toHaveBeenCalledTimes(1);
    expect((service as any).sleep).not.toHaveBeenCalled();
  });

  it('ignores missing pending input endpoints and keeps waiting until the build finishes', async () => {
    const pendingInputNotFoundError = new JenkinsError('pending input endpoint not found');
    pendingInputNotFoundError.status = 404;

    jest.spyOn(service, 'getBuildByFullName')
      .mockResolvedValueOnce({
        number: 42,
        url: 'https://test-jenkins.com/job/folder/job/app/job/main/42',
        building: true
      })
      .mockResolvedValueOnce({
        number: 42,
        url: 'https://test-jenkins.com/job/folder/job/app/job/main/42',
        building: false,
        result: 'SUCCESS'
      });
    jest.spyOn(service, 'getPendingInputActionsByFullName').mockRejectedValue(pendingInputNotFoundError);

    const result = await service.waitForBuildCompletion({
      fullName: 'folder/app/main',
      buildNumber: 42,
      pollIntervalSeconds: 2,
      timeoutSeconds: 30,
      includeStages: false
    });

    expect(result.completed).toBe(true);
    expect(result.waitingForInput).toBeUndefined();
    expect(result.result).toBe('SUCCESS');
    expect((service as any).sleep).toHaveBeenCalledTimes(1);
  });
});
