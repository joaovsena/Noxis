import prisma from '../utils/prisma';
import { PlayerRuntime, GroundItem } from '../models/types';
import { hashPassword, generateSalt } from '../utils/hash';

export class PersistenceService {
    async getUser(username: string) {
        return await prisma.user.findUnique({
            where: { username },
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }

    async getUserById(userId: string) {
        return await prisma.user.findUnique({
            where: { id: userId },
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }

    async getPlayerByName(name: string) {
        return await prisma.player.findFirst({ where: { name } });
    }

    async createUser(username: string, password: string, profile?: any) {
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        const data: any = {
            username,
            passwordHash,
            salt
        };
        if (profile) {
            data.players = {
                create: profile
            };
        }
        return await prisma.user.create({
            data,
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }

    async createPlayerForUser(userId: string, slot: number, profile: any) {
        return await prisma.player.create({
            data: {
                ...profile,
                userId,
                slot
            }
        });
    }

    async savePlayer(player: PlayerRuntime) {
        await prisma.player.update({
            where: { id: player.id as any },
            data: {
                level: player.level,
                xp: player.xp,
                hp: player.hp,
                stats: player.stats,
                allocatedStats: player.allocatedStats,
                unspentPoints: player.unspentPoints,
                statusOverrides: player.statusOverrides,
                pvpMode: player.pvpMode,
                mapKey: player.mapKey,
                mapId: player.mapId,
                posX: player.x,
                posY: player.y,
                inventory: player.inventory,
                equippedWeaponId: player.equippedWeaponId
            }
        });
    }

    async getItems() {
        return await prisma.item.findMany();
    }

    async getMobTemplates() {
        return await prisma.mobTemplate.findMany();
    }

    async getItemById(id: string) {
        return await prisma.item.findUnique({ where: { id } });
    }

    async createItem(item: any) {
        return await prisma.item.create({ data: item });
    }

    async getFriendshipsForPlayer(playerId: number) {
        return await prisma.friendship.findMany({
            where: {
                OR: [{ playerAId: playerId }, { playerBId: playerId }]
            }
        });
    }

    async createFriendship(playerAId: number, playerBId: number) {
        const a = Math.min(playerAId, playerBId);
        const b = Math.max(playerAId, playerBId);
        return await prisma.friendship.upsert({
            where: {
                playerAId_playerBId: { playerAId: a, playerBId: b } as any
            } as any,
            update: {},
            create: { playerAId: a, playerBId: b }
        });
    }

    async deleteFriendship(playerAId: number, playerBId: number) {
        const a = Math.min(playerAId, playerBId);
        const b = Math.max(playerAId, playerBId);
        await prisma.friendship.deleteMany({
            where: { playerAId: a, playerBId: b }
        });
    }

    async findPendingFriendRequestBetween(playerAId: number, playerBId: number) {
        return await prisma.friendRequest.findFirst({
            where: {
                status: 'pending',
                OR: [
                    { fromPlayerId: playerAId, toPlayerId: playerBId },
                    { fromPlayerId: playerBId, toPlayerId: playerAId }
                ]
            }
        });
    }

    async createFriendRequest(fromPlayerId: number, toPlayerId: number, expiresAt: Date) {
        return await prisma.friendRequest.create({
            data: { fromPlayerId, toPlayerId, expiresAt, status: 'pending' }
        });
    }

    async getPendingFriendRequestById(requestId: number) {
        return await prisma.friendRequest.findFirst({
            where: { id: requestId, status: 'pending' }
        });
    }

    async getPendingFriendRequestsForPlayer(playerId: number) {
        const [incoming, outgoing] = await Promise.all([
            prisma.friendRequest.findMany({
                where: { toPlayerId: playerId, status: 'pending' }
            }),
            prisma.friendRequest.findMany({
                where: { fromPlayerId: playerId, status: 'pending' }
            })
        ]);
        return { incoming, outgoing };
    }

    async completeFriendRequest(requestId: number, status: 'accepted' | 'declined') {
        await prisma.friendRequest.updateMany({
            where: { id: requestId, status: 'pending' },
            data: { status }
        });
    }

    async pruneExpiredFriendRequests(now: Date) {
        await prisma.friendRequest.updateMany({
            where: {
                status: 'pending',
                expiresAt: { lt: now }
            },
            data: { status: 'expired' }
        });
    }

    async clearFriendRequestsForPlayer(playerId: number) {
        await prisma.friendRequest.updateMany({
            where: {
                status: 'pending',
                OR: [{ fromPlayerId: playerId }, { toPlayerId: playerId }]
            },
            data: { status: 'cancelled' }
        });
    }

    async getPlayerBasicByIds(ids: number[]) {
        if (!ids.length) return [];
        return await prisma.player.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true }
        });
    }
}
