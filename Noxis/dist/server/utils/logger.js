"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEvent = logEvent;
const fs_1 = require("fs");
const path_1 = require("path");
const fs_2 = require("fs");
const logsDir = (0, path_1.join)(__dirname, '../logs');
// Criar diretório de logs se não existir
if (!(0, fs_2.existsSync)(logsDir)) {
    (0, fs_2.mkdirSync)(logsDir, { recursive: true });
}
const serverLogFile = (0, path_1.join)(logsDir, 'server.log.txt');
const logStream = (0, fs_1.createWriteStream)(serverLogFile, { flags: 'a' });
function logEvent(level, event, data = {}) {
    const line = `[${new Date().toISOString()}] [${level}] ${event} ${JSON.stringify(data)}\n`;
    logStream.write(line);
}
//# sourceMappingURL=logger.js.map