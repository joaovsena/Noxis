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
        return await prisma_1.default.user.findUnique({ where: { username }, include: { player: true } });
    }
    async getPlayerByName(name) {
        return await prisma_1.default.player.findFirst({ where: { name } });
    }
    async createUser(username, password, profile) {
        const salt = (0, hash_1.generateSalt)();
        const passwordHash = (0, hash_1.hashPassword)(password, salt);
        return await prisma_1.default.user.create({
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
    async savePlayer(player) {
        await prisma_1.default.player.update({
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
        return await prisma_1.default.item.findMany();
    }
    async createItem(item) {
        return await prisma_1.default.item.create({ data: item });
    }
}
exports.PersistenceService = PersistenceService;
//# sourceMappingURL=PersistenceService.js.map