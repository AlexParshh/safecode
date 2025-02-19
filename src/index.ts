import express from 'express';
import Docker from 'dockerode';
import morgan from 'morgan';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { randomBytes } from 'crypto';
import { EvaluationRequest, EvaluationResponse } from './types';

const app = express();
const docker = new Docker();

// Middleware
app.use(express.json());

// For http request logging
app.use(morgan('dev'));

// Create temporary files for code and scope
// Uses a random string for the temporary directory so that multiple requests can be processed concurrently
async function createTempFiles(code: string, scope: Record<string, any>): Promise<string> {
  const tempDir = join(tmpdir(), `safe-eval-${randomBytes(8).toString('hex')}`);
  
  // Create the temporary directory
  await mkdir(tempDir, { recursive: true });
  
  const userCodePath = join(tempDir, 'user_code.py');
  const scopePath = join(tempDir, 'scope.json');

  // Write files
  await writeFile(userCodePath, code);
  await writeFile(scopePath, JSON.stringify(scope));

  console.log('Created temp directory:', tempDir);
  console.log('User code path:', userCodePath);
  console.log('Scope path:', scopePath);

  return tempDir;
}

// Remove Docker's 8-byte header from each line
const cleanDockerOutput = (output: string): string => {
  return output.split('\n')
    .map(line => line.slice(8))
    .join('\n')
    .trim();
};

// Evaluate code in Docker container
async function evaluateInContainer(tempDir: string): Promise<EvaluationResponse> {
  let container;
  try {
    const bindMount = `${tempDir}:/data`;
    console.log('Creating container with bind mount:', bindMount);
    
    container = await docker.createContainer({
      Image: 'safe-evaluator',
      HostConfig: {
        AutoRemove: true,
        Memory: 50 * 1024 * 1024, // 50MB
        MemorySwap: 50 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        Binds: [bindMount],
        ReadonlyRootfs: true,
        CapDrop: ['ALL']
      },
      WorkingDir: '/app',
      Env: ['DATA_DIR=/data'],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      User: 'nobody'
    });

    console.log('Starting container...');
    
    // Get the logs stream before starting the container
    const logStream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    let containerOutput = '';
    logStream.on('data', (chunk: Buffer) => {
      const output = chunk.toString('utf8');
      containerOutput += output;
      console.log('Container output chunk:', output);
    });

    // Start the container
    await container.start();
    
    console.log('Waiting for container to finish...');
    const result = await container.wait();
    
    console.log('Container exit code:', result.StatusCode);
    
    // Clean the output before processing
    const cleanedOutput = cleanDockerOutput(containerOutput);
    console.log('Cleaned container output:', cleanedOutput);

    try {
      // Parse the output as JSON
      const parsedOutput = JSON.parse(cleanedOutput);
      return parsedOutput;
    } catch (e) {
      return { error: 'Invalid output format: ' + cleanedOutput };
    }
  } catch (error) {
    console.error('Container error:', error);
    return { error: `Container error: ${(error as Error).message}` };
  } finally {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temporary directory:', cleanupError);
    }
  }
}

// Evaluation endpoint
app.post('/evaluate', async (req, res) => {
  const { code, language, scope } = req.body as EvaluationRequest;

  // Validate request
  if (!code || !language || !scope) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (language.toLowerCase() !== 'python') {
    return res.status(400).json({ error: 'Only Python language is supported at this time' });
  }

  try {
    const tempDir = await createTempFiles(code, scope);
    const result = await evaluateInContainer(tempDir);
    res.json(result);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: `Server error: ${(error as Error).message}` });
  }
});

const PORT = 6000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
