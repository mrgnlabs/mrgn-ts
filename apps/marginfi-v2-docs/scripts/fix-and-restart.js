/**
 * Fix and Restart Script
 * 
 * This script:
 * 1. Runs the sanity-content-manager.js script to fix content issues
 * 2. Kills any process running on port 3007
 * 3. Restarts the development server
 * 
 * Usage:
 *   node scripts/fix-and-restart.js
 */

const { exec, spawn } = require('child_process');
const path = require('path');

// Configuration
const PORT = 3007;
const SCRIPTS_DIR = __dirname;

// Function to run a command and return a promise
function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Function to kill a process on a specific port
async function killPort(port) {
  try {
    console.log(`Attempting to kill process on port ${port}...`);
    
    // For Windows
    if (process.platform === 'win32') {
      const result = await runCommand(`netstat -ano | findstr :${port}`);
      const lines = result.split('\n');
      
      for (const line of lines) {
        const match = line.match(/(\d+)$/);
        if (match && match[1]) {
          const pid = match[1];
          console.log(`Found process with PID ${pid} on port ${port}`);
          await runCommand(`taskkill /F /PID ${pid}`);
          console.log(`Killed process with PID ${pid}`);
        }
      }
    } 
    // For Unix-based systems (Linux, macOS)
    else {
      await runCommand(`lsof -ti:${port} | xargs kill -9`);
    }
    
    console.log(`Successfully killed process on port ${port}`);
  } catch (error) {
    console.log(`No process found on port ${port} or error killing process`);
  }
}

// Main function
async function fixAndRestart() {
  try {
    console.log('Starting fix and restart process...');
    
    // Step 1: Run the sanity-content-manager.js script to fix content issues
    console.log('\n=== Step 1: Running content fix script ===');
    await runCommand(`node ${path.join(SCRIPTS_DIR, 'sanity-content-manager.js')} --fix-all`);
    
    // Step 2: Kill any process running on port 3007
    console.log('\n=== Step 2: Killing process on port 3007 ===');
    await killPort(PORT);
    
    // Step 3: Start the development server
    console.log('\n=== Step 3: Starting development server ===');
    console.log('Starting development server with pnpm dev...');
    
    // Use spawn to start the server in a new process
    const serverProcess = spawn('pnpm', ['dev'], {
      cwd: path.resolve(SCRIPTS_DIR, '..'),
      stdio: 'inherit',
      shell: true
    });
    
    // Handle server process events
    serverProcess.on('error', (error) => {
      console.error('Failed to start development server:', error);
    });
    
    console.log(`Development server started on port ${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('Error in fix and restart process:', error);
  }
}

// Run the main function
fixAndRestart(); 