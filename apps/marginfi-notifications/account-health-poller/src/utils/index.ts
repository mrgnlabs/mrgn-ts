export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function drawSpinner(message: string) {
  if (!!process.env.DEBUG) {
    // Don't draw spinner when logging is enabled
    return;
  }
  const spinnerFrames = ["-", "\\", "|", "/"];
  let frameIndex = 0;

  setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerFrames[frameIndex]}`);
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  }, 100);
}

export function getDebugLogger(context: string) {
  return require("debug")(`mfi:liquidator:${context}`);
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
