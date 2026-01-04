import { app, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';

type BackendState = 'stopped' | 'starting' | 'running';

export class BackendManager {
  private proc: ChildProcess | null = null;
  private state: BackendState = 'stopped';
  private lastSpawnError: string | null = null;
  private lastExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;

  private readonly host = '127.0.0.1';
  private readonly port = 12393;

  /**
   * Backend directory on disk.
   * - In dev: a repo checkout (env override supported)
   * - In packaged builds: copied from resources into a writable userData folder
   */
  private readonly backendDir: string;

  constructor() {
    this.backendDir = this.resolveBackendDir();
  }

  private getBuildIdFilePath(dir: string): string {
    return path.join(dir, 'backend-build-id.txt');
  }

  private readBuildId(dir: string): string | null {
    try {
      const p = this.getBuildIdFilePath(dir);
      if (!fs.existsSync(p)) return null;
      return fs.readFileSync(p, 'utf8').trim() || null;
    } catch {
      return null;
    }
  }

  private resolveBackendDir(): string {
    // Allow explicit override for power users / debugging.
    if (process.env.OPEN_LLM_VTUBER_BACKEND_DIR) {
      return process.env.OPEN_LLM_VTUBER_BACKEND_DIR;
    }

    // Packaged app: backend is shipped inside the app resources and must be copied
    // to a writable location (Program Files is read-only for normal users on Windows).
    if (app.isPackaged) {
      return path.join(app.getPath('userData'), 'backend');
    }

    // Dev fallback: try to locate backend as a sibling folder next to this repo.
    // __dirname in dev typically points to: Open-LLM-VTuber-Web/out/main
    const candidateSibling = path.resolve(__dirname, '..', '..', '..', 'Open-LLM-VTuber');
    if (fs.existsSync(candidateSibling)) return candidateSibling;

    // Last resort: current working dir based guess
    const candidateCwdSibling = path.resolve(process.cwd(), '..', 'Open-LLM-VTuber');
    if (fs.existsSync(candidateCwdSibling)) return candidateCwdSibling;

    return candidateSibling;
  }

  private getBundledBackendSourceDir(): string {
    // In packaged builds, electron-builder will place extraResources at:
    //   <resourcesPath>/backend
    return path.join(process.resourcesPath, 'backend');
  }

  private ensureBackendAvailable(): void {
    if (!app.isPackaged) return;

    // If user set OPEN_LLM_VTUBER_BACKEND_DIR, we assume they manage it.
    if (process.env.OPEN_LLM_VTUBER_BACKEND_DIR) return;

    const sourceDir = this.getBundledBackendSourceDir();
    const targetDir = this.backendDir;

    if (!fs.existsSync(sourceDir)) {
      dialog.showErrorBox(
        'Bundled backend missing',
        `Packaged app expected a bundled backend at:\n\n${sourceDir}\n\nRebuild the installer including backend files.`,
      );
      return;
    }

    // IMPORTANT:
    // We must update the cached backend when the installer updates. Otherwise users will
    // keep running an old (possibly broken) backend from %AppData% forever.
    //
    // We do this by comparing a build id file shipped alongside the backend payload.
    const sourceBuildId = this.readBuildId(sourceDir);
    const targetBuildId = this.readBuildId(targetDir);

    const needsCopy =
      !fs.existsSync(targetDir) ||
      // If build id is missing on either side, fall back to re-copying to be safe.
      !sourceBuildId ||
      !targetBuildId ||
      sourceBuildId !== targetBuildId;

    if (!needsCopy) return;

    try {
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      // Clear existing cached backend before copying new payload.
      fs.rmSync(targetDir, { recursive: true, force: true });
      fs.cpSync(sourceDir, targetDir, { recursive: true });
    } catch (e: any) {
      dialog.showErrorBox(
        'Failed to prepare backend',
        `Could not copy bundled backend to writable directory:\n\n${targetDir}\n\nError:\n${e?.message || String(e)}`,
      );
    }
  }

  /**
   * Get the path to the backend executable.
   * Priority:
   * 1. backend / backend.exe (PyInstaller one-folder build - most reliable)
   * 2. open-llm-vtuber-backend (legacy PyInstaller one-file)
   * 
   * On Windows: executables have .exe extension
   * On Mac/Linux: executables have no extension
   */
  private getBackendExecutablePath(): string {
    const isWindows = process.platform === 'win32';
    
    // PyInstaller one-folder build (preferred)
    const backendName = isWindows ? 'backend.exe' : 'backend';
    const pyinstallerExe = path.join(this.backendDir, backendName);
    if (fs.existsSync(pyinstallerExe)) {
      return pyinstallerExe;
    }
    
    // Legacy PyInstaller one-file build
    const legacyName = isWindows ? 'open-llm-vtuber-backend.exe' : 'open-llm-vtuber-backend';
    const legacyExe = path.join(this.backendDir, legacyName);
    if (fs.existsSync(legacyExe)) {
      return legacyExe;
    }
    
    return pyinstallerExe; // Return default path even if not found
  }

  /**
   * Check if we have a compiled backend executable (PyInstaller).
   * This is the preferred method for Windows distribution.
   */
  private hasCompiledBackend(): boolean {
    const exePath = this.getBackendExecutablePath();
    return fs.existsSync(exePath);
  }

  /**
   * Check if we have embedded Python (fallback for corporate security).
   * Embedded Python bundle contains: python.exe + run_server.py
   */
  private hasEmbeddedPython(): boolean {
    if (process.platform !== 'win32') return false;
    const pythonExe = path.join(this.backendDir, 'python.exe');
    const runServer = path.join(this.backendDir, 'run_server.py');
    return fs.existsSync(pythonExe) && fs.existsSync(runServer);
  }

  private getEmbeddedPythonPath(): string {
    return path.join(this.backendDir, 'python.exe');
  }

  private async isPortOpen(): Promise<boolean> {
    return await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutMs = 250;

      const done = (result: boolean) => {
        socket.removeAllListeners();
        try {
          socket.destroy();
        } catch {
          // ignore
        }
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => done(true));
      socket.once('timeout', () => done(false));
      socket.once('error', () => done(false));
      socket.connect(this.port, this.host);
    });
  }

  private getLogFilePath(): string {
    const dir = app.getPath('logs');
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
    return path.join(dir, 'backend-server.log');
  }

  private readLogTail(logPath: string, maxChars = 8000): string | null {
    try {
      if (!fs.existsSync(logPath)) return null;
      const content = fs.readFileSync(logPath, 'utf8');
      if (!content) return null;
      return content.length > maxChars ? content.slice(-maxChars) : content;
    } catch {
      return null;
    }
  }

  async startIfNeeded(): Promise<void> {
    if (this.state === 'starting' || this.state === 'running') return;

    // If something else is already listening, don't spawn another backend.
    if (await this.isPortOpen()) {
      this.state = 'running';
      return;
    }

    this.ensureBackendAvailable();

    if (!fs.existsSync(this.backendDir)) {
      dialog.showErrorBox(
        'Backend not found',
        `Open-LLM-VTuber backend folder was not found at:\n\n${this.backendDir}\n\nSet OPEN_LLM_VTUBER_BACKEND_DIR to point to your backend folder.`,
      );
      return;
    }

    this.state = 'starting';
    this.lastSpawnError = null;
    this.lastExit = null;

    const logPath = this.getLogFilePath();
    const logFd = fs.openSync(logPath, 'a');

    // Strategy priority:
    // 1. PyInstaller compiled backend (most reliable for distribution)
    // 2. Embedded Python (fallback for corporate security)
    // 3. Dev mode fallback (uv run)

    const hasCompiledBackend = this.hasCompiledBackend();
    const hasEmbeddedPython = this.hasEmbeddedPython();

    if (hasCompiledBackend) {
      // PREFERRED: PyInstaller compiled backend (one-folder mode)
      // This is the most reliable method for Windows distribution.
      // One-folder mode has better compatibility than one-file mode.
      const exePath = this.getBackendExecutablePath();
      console.log(`Starting backend with compiled executable: ${exePath}`);
      this.proc = spawn(exePath, [], {
        cwd: this.backendDir,
        stdio: ['ignore', logFd, logFd],
        detached: true,
        env: {
          ...process.env,
          // Ensure the executable can find its dependencies
          PATH: `${this.backendDir};${process.env.PATH}`,
        },
      });
    } else if (hasEmbeddedPython) {
      // FALLBACK: Embedded Python - uses official Python interpreter
      // This might work better in some corporate environments.
      const pythonExe = this.getEmbeddedPythonPath();
      console.log(`Starting backend with embedded Python: ${pythonExe}`);
      this.proc = spawn(pythonExe, ['run_server.py'], {
        cwd: this.backendDir,
        stdio: ['ignore', logFd, logFd],
        detached: true,
        env: {
          ...process.env,
          PYTHONPATH: this.backendDir,
          PYTHONNOUSERSITE: '1',
        },
      });
    } else {
      // DEV MODE: Use local uv environment
      console.log('Starting backend in dev mode with uv');
      const cmd =
        process.platform === 'win32'
          ? [`cd /d "${this.backendDir}"`, `uv run run_server.py`].join(' && ')
          : [
              `export PATH="$HOME/.local/bin:$PATH"`,
              `source "$HOME/.local/bin/env" 2>/dev/null || true`,
              `cd "${this.backendDir}"`,
              `uv run run_server.py`,
            ].join(' && ');

      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
      const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c', cmd] : ['-lc', cmd];

      this.proc = spawn(shell, shellArgs, {
        stdio: ['ignore', logFd, logFd],
        detached: true,
      });
    }

    // Capture immediate spawn failures and early exits (common when a Python dependency is missing).
    this.proc.on('error', (err) => {
      this.lastSpawnError = err?.message || String(err);
    });
    this.proc.on('exit', (code, signal) => {
      this.lastExit = { code, signal };
    });

    // Allow the child to continue running independently; we will still try to stop it on quit.
    this.proc.unref();

    // Wait for backend to come up.
    // IMPORTANT: First launch can take 5-10 MINUTES because it downloads
    // speech recognition models (~1GB). Subsequent launches are fast.
    // Timeout: 10 minutes (600 seconds) for first launch, checking every second.
    const TIMEOUT_MS = 600000; // 10 minutes
    const startDeadlineMs = Date.now() + TIMEOUT_MS;
    let lastLogMessage = '';
    
    while (Date.now() < startDeadlineMs) {
      // eslint-disable-next-line no-await-in-loop
      if (await this.isPortOpen()) {
        this.state = 'running';
        return;
      }
      // If it failed to spawn or exited early, don't keep waiting.
      if (this.lastSpawnError || this.lastExit) break;
      
      // Check log for download progress every few seconds (helps debugging)
      const currentTail = this.readLogTail(logPath, 500);
      if (currentTail && currentTail !== lastLogMessage) {
        lastLogMessage = currentTail;
        // Log progress to console (not shown to user, but helpful for debugging)
        if (currentTail.includes('MiB/s') || currentTail.includes('Downloading')) {
          console.log('Backend is downloading models...');
        }
      }
      
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000)); // Check every second
    }

    this.state = 'stopped';
    const tail = this.readLogTail(logPath);
    
    // Check if it was a download timeout vs other error
    const isDownloading = tail?.includes('MiB/s') || tail?.includes('Downloading') || tail?.includes('.tar.bz2');
    
    const extra =
      this.lastSpawnError
        ? `\n\nSpawn error:\n${this.lastSpawnError}`
        : this.lastExit
          ? `\n\nBackend exited early:\ncode=${this.lastExit.code} signal=${this.lastExit.signal ?? 'null'}`
          : isDownloading
            ? '\n\n⏳ The backend is still downloading required AI models (~1GB).\nPlease wait a few more minutes and try again, or check your internet connection.'
            : '';
    dialog.showErrorBox(
      'Backend failed to start',
      `Tried to start backend but it did not open port ${this.port} within 10 minutes.${extra}\n\nSee log:\n${logPath}${
        tail ? `\n\n--- Log tail ---\n${tail}` : ''
      }`,
    );
  }

  stop(): void {
    // Only stop the backend we spawned (we should not kill a user-managed backend).
    const pid = this.proc?.pid;
    this.proc = null;
    this.state = 'stopped';

    if (!pid) return;

    try {
      if (process.platform === 'win32') {
        // Windows: best-effort kill the whole process tree.
        spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        // POSIX: kill the whole process group (detached).
        process.kill(-pid, 'SIGTERM');
      }
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // ignore
      }
    }
  }
}


