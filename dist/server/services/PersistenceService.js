"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const hash_1 = require("../utils/hash");
class PersistenceService {
    async getUser(username) {
        return await prisma_1.default.user.findUnique({
            where: { username },
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }
    async getUserById(userId) {
        return await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }
    async getPlayerByName(name) {
        return await prisma_1.default.player.findFirst({ where: { name } });
    }
    async createUser(username, password, profile) {
        const salt = (0, hash_1.generateSalt)();
        const passwordHash = (0, hash_1.hashPassword)(password, salt);
        const data = {
            username,
            passwordHash,
            salt
        };
        if (profile) {
            data.players = {
                create: profile
            };
        }
        return await prisma_1.default.user.create({
            data,
            include: { players: { orderBy: { slot: 'asc' } } }
        });
    }
    async createPlayerForUser(userId, slot, profile) {
        return await prisma_1.default.player.create({
            data: {
                ...profile,
                userId,
                slot
            }
        });
    }
    async savePlayer(player) {
        await prisma_1.default.player.update({
            where: { id: player.id },
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
        return await prisma_1.default.item.findMany();
    }
    async getMobTemplates() {
        return await prisma_1.default.mobTemplate.findMany();
    }
    async getItemById(id) {
        return await prisma_1.default.item.findUnique({ where: { id } });
    }
    async createItem(item) {
        return await prisma_1.default.item.create({ data: item });
    }
    async getFriendshipsForPlayer(playerId) {
        return await prisma_1.default.friendship.findMany({
            where: {
                OR: [{ playerAId: playerId }, { playerBId: playerId }]
            }
        });
    }
    async createFriendship(playerAId, playerBId) {
        const a = Math.min(playerAId, playerBId);
        const b = Math.max(playerAId, playerBId);
        return await prisma_1.default.friendship.upsert({
            where: {
                playerAId_playerBId: { playerAId: a, playerBId: b }
            },
            update: {},
            create: { playerAId: a, playerBId: b }
        });
    }
    async deleteFriendship(playerAId, playerBId) {
        const a = Math.min(playerAId, playerBId);
        const b = Math.max(playerAId, playerBId);
        await prisma_1.default.friendship.deleteMany({
            where: { playerAId: a, playerBId: b }
        });
    }
    async findPendingFriendRequestBetween(playerAId, playerBId) {
        return await prisma_1.default.friendRequest.findFirst({
            where: {
                status: 'pending',
                OR: [
                    { fromPlayerId: playerAId, toPlayerId: playerBId },
                    { fromPlayerId: playerBId, toPlayerId: playerAId }
                ]
            }
        });
    }
    async createFriendRequest(fromPlayerId, toPlayerId, expiresAt) {
        return await prisma_1.default.friendRequest.create({
            data: { fromPlayerId, toPlayerId, expiresAt, status: 'pending' }
        });
    }
    async getPendingFriendRequestById(requestId) {
        return await prisma_1.default.friendRequest.findFirst({
            where: { id: requestId, status: 'pending' }
        });
    }
    async getPendingFriendRequestsForPlayer(playerId) {
        const [incoming, outgoing] = await Promise.all([
            prisma_1.default.friendRequest.findMany({
                where: { toPlayerId: playerId, status: 'pending' }
            }),
            prisma_1.default.friendRequest.findMany({
                where: { fromPlayerId: playerId, status: 'pending' }
            })
        ]);
        return { incoming, outgoing };
    }
    async completeFriendRequest(requestId, status) {
        await prisma_1.default.friendRequest.updateMany({
            where: { id: requestId, status: 'pending' },
            data: { status }
        });
    }
    async pruneExpiredFriendRequests(now) {
        await prisma_1.default.friendRequest.updateMany({
            where: {
                status: 'pending',
                expiresAt: { lt: now }
            },
            data: { status: 'expired' }
        });
    }
    async clearFriendRequestsForPlayer(playerId) {
        await prisma_1.default.friendRequest.updateMany({
            where: {
                status: 'pending',
                OR: [{ fromPlayerId: playerId }, { toPlayerId: playerId }]
            },
            data: { status: 'cancelled' }
        });
    }
    async getPlayerBasicByIds(ids) {
        if (!ids.length)
            return [];
        return await prisma_1.default.player.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true }
        });
    }
}
exports.PersistenceService = PersistenceService;
//# sourceMappingURL=PersistenceService.js.map