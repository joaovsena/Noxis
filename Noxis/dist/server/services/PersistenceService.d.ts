import { PlayerRuntime } from '../models/types';
export declare class PersistenceService {
    getUser(username: string): Promise<({
        player: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string;
            class: string;
            gender: string;
            level: number;
            xp: number;
            hp: number;
            maxHp: number;
            baseStats: import("@prisma/client/runtime/library").JsonValue;
            stats: import("@prisma/client/runtime/library").JsonValue;
            statusOverrides: import("@prisma/client/runtime/library").JsonValue | null;
            role: string;
            inventory: import("@prisma/client/runtime/library").JsonValue;
            equippedWeaponId: string | null;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        username: string;
        passwordHash: string;
        salt: string;
        createdAt: Date;
    }) | null>;
    getPlayerByName(name: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        userId: string;
        class: string;
        gender: string;
        level: number;
        xp: number;
        hp: number;
        maxHp: number;
        baseStats: import("@prisma/client/runtime/library").JsonValue;
        stats: import("@prisma/client/runtime/library").JsonValue;
        statusOverrides: import("@prisma/client/runtime/library").JsonValue | null;
        role: string;
        inventory: import("@prisma/client/runtime/library").JsonValue;
        equippedWeaponId: string | null;
        updatedAt: Date;
    } | null>;
    createUser(username: string, password: string, profile: any): Promise<{
        player: {
            id: string;
            createdAt: Date;
            name: string;
            userId: string;
            class: string;
            gender: string;
            level: number;
            xp: number;
            hp: number;
            maxHp: number;
            baseStats: import("@prisma/client/runtime/library").JsonValue;
            stats: import("@prisma/client/runtime/library").JsonValue;
            statusOverrides: import("@prisma/client/runtime/library").JsonValue | null;
            role: string;
            inventory: import("@prisma/client/runtime/library").JsonValue;
            equippedWeaponId: string | null;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        username: string;
        passwordHash: string;
        salt: string;
        createdAt: Date;
    }>;
    savePlayer(player: PlayerRuntime): Promise<void>;
    getItems(): Promise<{
        id: string;
        name: string;
        type: string;
        slot: string;
        bonuses: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    createItem(item: any): Promise<{
        id: string;
        name: string;
        type: string;
        slot: string;
        bonuses: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
//# sourceMappingURL=PersistenceService.d.ts.map