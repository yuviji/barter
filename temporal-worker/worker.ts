import { Worker } from '@temporalio/worker';
import * as activities from './activities';

async function main() {
  console.log('🚀 Starting Barter Temporal Worker...');
  
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'arbitrage-task-queue',
    maxConcurrentActivityTaskExecutions: 10,
  });

  console.log('✅ Worker ready! Listening on task queue: arbitrage-task-queue');
  console.log('🔗 Web UI: http://localhost:8233');
  
  await worker.run();
}

main().catch((err) => {
  console.error('❌ Worker error:', err);
  process.exit(1);
}); 