import { createWriteStream } from 'fs';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const logsDir = join(__dirname, '../logs');

// Criar diretório de logs se não existir
if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
}

const serverLogFile = join(logsDir, 'server.log.txt');
const logStream = createWriteStream(serverLogFile, { flags: 'a' });

export function logEvent(level: string, event: string, data: any = {}): void {
    const line = `[${new Date().toISOString()}] [${level}] ${event} ${JSON.stringify(data)}\n`;
    logStream.write(line);
}