const { execSync } = require('child_process');

/**
 * Kills any process running on the specified port
 * @param {number} port - The port to kill processes on
 */
function killPort(port) {
  try {
    console.log(`Attempting to kill processes on port ${port}...`);
    
    // Different commands for different operating systems
    if (process.platform === 'win32') {
      // Windows
      const result = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = result.split('\n');
      
      for (const line of lines) {
        const match = line.match(/(\d+)$/);
        if (match) {
          const pid = match[1];
          console.log(`Killing process with PID: ${pid}`);
          execSync(`taskkill /F /PID ${pid}`);
        }
      }
    } else {
      // macOS/Linux
      const result = execSync(`lsof -i :${port}`).toString();
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTEN')) {
          const match = line.match(/^\S+\s+(\d+)/);
          if (match) {
            const pid = match[1];
            console.log(`Killing process with PID: ${pid}`);
            execSync(`kill -9 ${pid}`);
          }
        }
      }
    }
    
    console.log(`Successfully killed processes on port ${port}`);
  } catch (error) {
    console.error(`Error killing processes on port ${port}:`, error.message);
    console.log('No processes found running on the specified port or insufficient permissions.');
  }
}

// Kill processes on port 3007
killPort(3007);

console.log('You can now start the development server on port 3007'); 