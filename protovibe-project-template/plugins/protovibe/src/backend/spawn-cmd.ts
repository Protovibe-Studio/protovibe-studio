import { spawn } from 'node:child_process';

export function spawnCmd(
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv; onData?: (chunk: string) => void; timeoutMs?: number; shell?: boolean; stdoutOnly?: boolean },
): Promise<string> {
  return new Promise((resolve, reject) => {
    // shell is only needed for .cmd shims (pnpm/wrangler) on Windows; callers
    // passing secrets in argv (git auth headers) must opt out of it.
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: 'pipe', shell: opts.shell ?? process.platform === 'win32' });
    let out = '';
    let stdout = '';
    let settled = false;
    const settle = (fn: typeof resolve | typeof reject, val: string | Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      (fn as any)(val);
    };

    const onChunk = (buf: Buffer) => { const t = buf.toString(); out += t; opts.onData?.(t); };
    child.stdout.on('data', (buf: Buffer) => {
      if (opts.stdoutOnly) stdout += buf.toString();
      onChunk(buf);
    });
    child.stderr.on('data', onChunk);
    child.on('close', (code) =>
      code === 0
        // Machine-readable results exclude diagnostics; failures retain both streams.
        ? settle(resolve, opts.stdoutOnly ? stdout : out)
        : settle(reject, new Error(`[exit ${code}] ${out.slice(-600)}`)),
    );
    child.on('error', (err) => settle(reject, err));

    const timeoutMs = opts.timeoutMs ?? 3 * 60 * 1000; // default 3 min
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
      settle(reject, new Error(`Command timed out after ${timeoutMs / 1000}s. Output:\n${out.slice(-400)}`));
    }, timeoutMs);
  });
}
