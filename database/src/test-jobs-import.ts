// Test file to verify job types can be imported
import {
  Job,
  JobStatus,
  JobType,
  JobPayload,
  CreateJobInput,
  JobQuery,
  JobResponse,
  JobExecutionResult,
  JobHandler,
  JobHandlerRegistry,
  WorkerOptions,
  RetryConfig,
} from './index.js';

// Verify types work correctly
const testJob: Job = {
  id: 'test-job-1',
  type: JobType.PROVISION_PROJECT,
  payload: { project_id: 'proj-123' },
  status: JobStatus.PENDING,
  attempts: 0,
  max_attempts: 3,
  last_error: null,
  scheduled_at: new Date(),
  started_at: null,
  completed_at: null,
  created_at: new Date(),
};

const testInput: CreateJobInput = {
  type: JobType.DELIVER_WEBHOOK,
  payload: { webhook_url: 'https://example.com/webhook' },
  scheduled_at: new Date(),
  max_attempts: 5,
};

console.log('Job types import test passed!');
console.log('Test job:', testJob);
