/**
 * CENTINELA TIC — Scanner Worker
 * Processes file analysis jobs from BullMQ queue.
 * Runs in an isolated container with no network access.
 */
import { Worker } from 'bullmq';
import { createConnection } from './redis.js';
import { processFileJob } from './processors/file.processor.js';

const QUEUE_NAME = 'file-analysis';
const connection = createConnection();

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[scanner] Processing job ${job.id} type=${job.name}`);
    switch (job.name) {
      case 'analyze-file':
        return await processFileJob(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 2,
    settings: {
      lockDuration: 60000,
    },
  },
);

worker.on('completed', (job) => {
  console.log(`[scanner] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[scanner] Job ${job?.id} failed: ${err.message}`);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
