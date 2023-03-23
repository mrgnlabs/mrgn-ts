import { Logger } from "winston";

export function setupErrorHooks(logger: Logger): (signal?: any) => void {
  function handleGlobalError(up: any) {
    logger.error("Unhandled rejection");
    if (up instanceof Error) {
      logger.error(up);
    } else {
      let errorMessage = "";
      try {
        errorMessage = JSON.stringify(up);
        errorMessage = up.toString(); // Favour `.toString()` if it exists
      } catch (e) {
        if (errorMessage === "") errorMessage = `Unable to log exception of type ${typeof up}`;
      } finally {
        logger.error(errorMessage);
      }
    }

    throw up;
  }

  let sigCount = 0;

  /*
   * Give the logger time to flush the log buffer
   */
  function delayedShutdown(signal?: any) {
    if (sigCount === 0) {
      const SHUTDOWN_DELAY = 5; // (seconds)
      console.log(`Waiting ${SHUTDOWN_DELAY} seconds for log export to complete before shutting down...`);
      setTimeout(() => process.exit(1), SHUTDOWN_DELAY * 1_000);
    }

    if (sigCount >= 1) {
      console.log(`Received second ${signal}. Exiting.`);
      process.exit(1);
    }

    if (signal) sigCount++;
  }

  process.on("unhandledRejection", handleGlobalError);
  process.on("uncaughtException", handleGlobalError);
  process.on("SIGINT", delayedShutdown);
  process.on("SIGTERM", delayedShutdown);

  return delayedShutdown;
}
