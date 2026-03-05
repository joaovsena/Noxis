import { createHash } from 'crypto';

export function hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function generateSalt(): string {
    return createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 16);
}