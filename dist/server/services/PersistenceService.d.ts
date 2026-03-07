import { PlayerRuntime } from '../models/types';
export declare class PersistenceService {
    getUser(username: string): Promise<({
        players: {
            id: number;
            createdAt: Date;
            slot: number;
            name: string;
            userId: string;
            class: string;
            gender: string;
            level: number;
            xp: number;
            hp: number;
            maxHp: number;
            baseStats: import("@prisma/client/runtime/client").JsonValue;
            stats: import("@prisma/client/runtime/client").JsonValue;
            allocatedStats: import("@prisma/client/runtime/client").JsonValue | null;
            unspentPoints: number;
            statusOverrides: import("@prisma/client/runtime/client").JsonValue | null;
            pvpMode: string;
            mapKey: string;
            mapId: string;
            posX: number;
            posY: number;
            role: string;
            inventory: import("@prisma/client/runtime/client").JsonValue;
            equippedWeaponId: string | null;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        username: string;
        passwordHash: string;
        salt: string;
        createdAt: Date;
    }) | null>;
    getUserById(userId: string): Promise<({
        players: {
            id: number;
            createdAt: Date;
            slot: number;
            name: string;
            userId: string;
            class: string;
            gender: string;
            level: number;
            xp: number;
            hp: number;
            maxHp: number;
            baseStats: import("@prisma/client/runtime/client").JsonValue;
            stats: import("@prisma/client/runtime/client").JsonValue;
            allocatedStats: import("@prisma/client/runtime/client").JsonValue | null;
            unspentPoints: number;
            statusOverrides: import("@prisma/client/runtime/client").JsonValue | null;
            pvpMode: string;
            mapKey: string;
            mapId: string;
            posX: number;
            posY: number;
            role: string;
            inventory: import("@prisma/client/runtime/client").JsonValue;
            equippedWeaponId: string | null;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        username: string;
        passwordHash: string;
        salt: string;
        createdAt: Date;
    }) | null>;
    getPlayerByName(name: string): Promise<{
        id: number;
        createdAt: Date;
        slot: number;
        name: string;
        userId: string;
        class: string;
        gender: string;
        level: number;
        xp: number;
        hp: number;
        maxHp: number;
        baseStats: import("@prisma/client/runtime/client").JsonValue;
        stats: import("@prisma/client/runtime/client").JsonValue;
        allocatedStats: import("@prisma/client/runtime/client").JsonValue | null;
        unspentPoints: number;
        statusOverrides: import("@prisma/client/runtime/client").JsonValue | null;
        pvpMode: string;
        mapKey: string;
        mapId: string;
        posX: number;
        posY: number;
        role: string;
        inventory: import("@prisma/client/runtime/client").JsonValue;
        equippedWeaponId: string | null;
        updatedAt: Date;
    } | null>;
    createUser(username: string, password: string, profile?: any): Promise<{
        players: {
            id: number;
            createdAt: Date;
            slot: number;
            name: string;
            userId: string;
            class: string;
            gender: string;
            level: number;
            xp: number;
            hp: number;
            maxHp: number;
            baseStats: import("@prisma/client/runtime/client").JsonValue;
            stats: import("@prisma/client/runtime/client").JsonValue;
            allocatedStats: import("@prisma/client/runtime/client").JsonValue | null;
            unspentPoints: number;
            statusOverrides: import("@prisma/client/runtime/client").JsonValue | null;
            pvpMode: string;
            mapKey: string;
            mapId: string;
            posX: number;
            posY: number;
            role: string;
            inventory: import("@prisma/client/runtime/client").JsonValue;
            equippedWeaponId: string | null;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        username: string;
        passwordHash: string;
        salt: string;
        createdAt: Date;
    }>;
    createPlayerForUser(userId: string, slot: number, profile: any): Promise<{
        id: number;
        createdAt: Date;
        slot: number;
        name: string;
        userId: string;
        class: string;
        gender: string;
        level: number;
        xp: number;
        hp: number;
        maxHp: number;
        baseStats: import("@prisma/client/runtime/client").JsonValue;
        stats: import("@prisma/client/runtime/client").JsonValue;
        allocatedStats: import("@prisma/client/runtime/client").JsonValue | null;
        unspentPoints: number;
        statusOverrides: import("@prisma/client/runtime/client").JsonValue | null;
        pvpMode: string;
        mapKey: string;
        mapId: string;
        posX: number;
        posY: number;
        role: string;
        inventory: import("@prisma/client/runtime/client").JsonValue;
        equippedWeaponId: string | null;
        updatedAt: Date;
    }>;
    savePlayer(player: PlayerRuntime): Promise<void>;
    getItems(): Promise<{
        id: string;
        slot: string;
        name: string;
        type: string;
        bonuses: import("@prisma/client/runtime/client").JsonValue;
    }[]>;
    getMobTemplates(): Promise<{
        id: string;
        maxHp: number;
        kind: string;
        size: number;
        color: string;
        xpReward: number;
        physicalDefense: number;
        magicDefense: number;
        aggroRange: number | null;
        leashRange: number | null;
        attackRange: number | null;
        attackCadenceMs: number | null;
        moveSpeed: number | null;
        wanderRadius: number | null;
        repathMs: number | null;
        idleMinMs: number | null;
        idleMaxMs: number | null;
        luckyStrikeChance: number | null;
        accuracy: number | null;
        evasion: number | null;
    }[]>;
    getItemById(id: string): Promise<{
        id: string;
        slot: string;
        name: string;
        type: string;
        bonuses: import("@prisma/client/runtime/client").JsonValue;
    } | null>;
    createItem(item: any): Promise<{
        id: string;
        slot: string;
        name: string;
        type: string;
        bonuses: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getFriendshipsForPlayer(playerId: number): Promise<{
        id: number;
        createdAt: Date;
        playerAId: number;
        playerBId: number;
    }[]>;
    createFriendship(playerAId: number, playerBId: number): Promise<{
        id: number;
        createdAt: Date;
        playerAId: number;
        playerBId: number;
    }>;
    deleteFriendship(playerAId: number, playerBId: number): Promise<void>;
    findPendingFriendRequestBetween(playerAId: number, playerBId: number): Promise<{
        id: number;
        createdAt: Date;
        fromPlayerId: number;
        toPlayerId: number;
        status: string;
        expiresAt: Date;
    } | null>;
    createFriendRequest(fromPlayerId: number, toPlayerId: number, expiresAt: Date): Promise<{
        id: number;
        createdAt: Date;
        fromPlayerId: number;
        toPlayerId: number;
        status: string;
        expiresAt: Date;
    }>;
    getPendingFriendRequestById(requestId: number): Promise<{
        id: number;
        createdAt: Date;
        fromPlayerId: number;
        toPlayerId: number;
        status: string;
        expiresAt: Date;
    } | null>;
    getPendingFriendRequestsForPlayer(playerId: number): Promise<{
        incoming: {
            id: number;
            createdAt: Date;
            fromPlayerId: number;
            toPlayerId: number;
            status: string;
            expiresAt: Date;
        }[];
        outgoing: {
            id: number;
            createdAt: Date;
            fromPlayerId: number;
            toPlayerId: number;
            status: string;
            expiresAt: Date;
        }[];
    }>;
    completeFriendRequest(requestId: number, status: 'accepted' | 'declined'): Promise<void>;
    pruneExpiredFriendRequests(now: Date): Promise<void>;
    clearFriendRequestsForPlayer(playerId: number): Promise<void>;
    getPlayerBasicByIds(ids: number[]): Promise<{
        id: number;
        name: string;
    }[]>;
}
//# sourceMappingURL=PersistenceService.d.ts.map