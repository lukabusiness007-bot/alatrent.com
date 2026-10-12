import { spawn } from 'node:child_process';
const port = process.env.PORT || '3010';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('PORT mora biti broj između 1 i 65535.');
}
const child = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'start', '--hostname',
  process.env.APP_HOST || '0.0.0.0', '--port', port,
], { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
