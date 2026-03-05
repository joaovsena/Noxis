"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.generateSalt = generateSalt;
const crypto_1 = require("crypto");
function hashPassword(password, salt) {
    return (0, crypto_1.createHash)('sha256').update(`${salt}:${password}`).digest('hex');
}
function generateSalt() {
    return (0, crypto_1.createHash)('sha256').update(Math.random().toString()).digest('hex').slice(0, 16);
}
//# sourceMappingURL=hash.js.map