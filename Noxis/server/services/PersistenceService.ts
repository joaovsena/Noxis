import prisma from '../utils/prisma';
import { PlayerRuntime, GroundItem } from '../models/types';
import { hashPassword, generateSalt } from '../utils/hash';

export class PersistenceService {
    async getUser(username: string) {
        return await prisma.user.findUnique({ where: { username }, include: { player: true } });
    }

    async getPlayerByName(name: string) {
        return await prisma.player.findFirst({ where: { name } });
    }

    async createUser(username: string, password: string, profile: any) {
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        return await prisma.user.create({
            data: {
                username,
                passwordHash,
                salt,
                player: {
                    create: profile
                }
            },
            include: { player: true }
        });
    }

    async savePlayer(player: PlayerRuntime) {
        await prisma.player.update({
            where: { id: player.id },
            data: {
                level: player.level,
                xp: player.xp,
                hp: player.hp,
                stats: player.stats,
                statusOverrides: player.statusOverrides,
                inventory: player.inventory,
                equippedWeaponId: player.equippedWeaponId
            }
        });
    }

    async getItems() {
        return await prisma.item.findMany();
    }

    async createItem(item: any) {
        return await prisma.item.create({ data: item });
    }
}
