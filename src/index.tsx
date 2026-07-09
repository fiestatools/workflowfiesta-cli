import { initializeServices } from './services';
import { logger } from './logger';
import { parseArgs, executeCommand } from './cli';
import { startApp } from './app';

async function main(): Promise<void> {
  const command = parseArgs();

  logger.init();
  logger.info('CLI starting', { command: command.type });

  let services;
  try {
    services = await initializeServices();
  } catch (error) {
    console.error('Failed to initialize:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const handled = await executeCommand(command, services);
  if (handled) {
    return;
  }

  await startApp(services);
}

main().catch((error) => {
  logger.error('Fatal error during startup', error);
  console.error('Failed to start CLI:', error);
  process.exit(1);
});
