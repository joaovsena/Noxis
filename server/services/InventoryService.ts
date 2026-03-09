import { randomUUID } from 'crypto';
import { HP_POTION_TEMPLATE, INVENTORY_SIZE, ITEM_PICKUP_RANGE } from '../config';
import { GroundItem, PlayerRuntime } from '../models/types';
import { clamp, distance } from '../utils/math';

type MapInstanceIdFn = (mapKey: string, mapId: string) => string;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type RecomputePlayerStatsFn = (player: PlayerRuntime) => void;
type SendInventoryStateFn = (player: PlayerRuntime) => void;
type SendStatsUpdatedFn = (player: PlayerRuntime) => void;
type NormalizeHotbarBindingsFn = (raw: any) => any;
type FirstFreeInventorySlotFn = (items: any[], ignoreItemIds?: Set<string>) => number;
type GetSpentSkillPointsFn = (player: PlayerRuntime) => number;
type SendRawFn = (ws: any, payload: any) => void;
type ItemCollectedFn = (player: PlayerRuntime, templateId: string, quantity: number) => void;

export class InventoryService {
    constructor(
        private readonly getGroundItems: () => GroundItem[],
        private readonly setGroundItems: (items: GroundItem[]) => void,
        private readonly mapInstanceId: MapInstanceIdFn,
        private readonly persistPlayer: PersistPlayerFn,
        private readonly recomputePlayerStats: RecomputePlayerStatsFn,
        private readonly sendInventoryState: SendInventoryStateFn,
        private readonly sendStatsUpdated: SendStatsUpdatedFn,
        private readonly normalizeHotbarBindings: NormalizeHotbarBindingsFn,
        private readonly firstFreeInventorySlot: FirstFreeInventorySlotFn,
        private readonly getSpentSkillPoints: GetSpentSkillPointsFn,
        private readonly sendRaw: SendRawFn,
        private readonly onItemCollected?: ItemCollectedFn
    ) {}

    handlePickupItem(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const items = this.getGroundItems();
        const index = items.findIndex((it) => it.id === itemId && it.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (index === -1) return;
        const item = items[index];
        if (typeof item.expiresAt === 'number' && item.expiresAt <= Date.now()) {
            items.splice(index, 1);
            this.setGroundItems(items);
            return;
        }
        if (distance(player, item) > ITEM_PICKUP_RANGE) return;
        const requestedQty = Math.max(1, Math.floor(Number(item.quantity || 1)));
        let remaining = requestedQty;
        remaining = this.addItemToInventory(player, item, remaining);
        const collectedQty = Math.max(0, requestedQty - remaining);
        if (remaining <= 0) {
            items.splice(index, 1);
        } else {
            items[index] = { ...item, quantity: remaining };
        }
        this.setGroundItems(items);
        this.persistPlayer(player);
        this.sendInventoryState(player);
        if (collectedQty > 0 && this.onItemCollected) {
            this.onItemCollected(player, String(item.templateId || item.type || ''), collectedQty);
        }
    }

    handleHotbarSet(player: PlayerRuntime, msg: any) {
        const raw = msg && typeof msg.bindings === 'object' ? msg.bindings : null;
        if (!raw) return;
        const normalized = this.normalizeHotbarBindings(raw);
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object') player.statusOverrides = {};
        player.statusOverrides.__hotbarBindings = normalized;
        this.persistPlayer(player);
    }

    handleEquipItem(player: PlayerRuntime, msg: any) {
        const itemId = msg.itemId ? String(msg.itemId) : null;
        if (!itemId) {
            const equipped = player.equippedWeaponId
                ? player.inventory.find((it: any) => it.id === player.equippedWeaponId && it.type === 'weapon')
                : null;
            if (equipped && (!Number.isInteger(equipped.slotIndex) || equipped.slotIndex < 0)) {
                equipped.slotIndex = this.firstFreeInventorySlot(player.inventory, new Set([equipped.id]));
            }
            player.equippedWeaponId = null;
            player.inventory = this.normalizeInventorySlots(player.inventory, null);
            this.recomputePlayerStats(player);
            this.persistPlayer(player);
            this.sendInventoryState(player);
            return;
        }

        const found = player.inventory.find((it: any) => it.id === itemId && it.type === 'weapon');
        if (!found) return;
        const previousEquippedId = player.equippedWeaponId && player.equippedWeaponId !== found.id ? player.equippedWeaponId : null;
        if (previousEquippedId) {
            const oldEquipped = player.inventory.find((it: any) => it.id === previousEquippedId && it.type === 'weapon');
            if (oldEquipped) {
                oldEquipped.slotIndex = Number.isInteger(found.slotIndex) && found.slotIndex >= 0
                    ? found.slotIndex
                    : this.firstFreeInventorySlot(player.inventory, new Set([oldEquipped.id, found.id]));
            }
        }
        found.slotIndex = -1;

        player.equippedWeaponId = found.id;
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryMove(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;
        if (player.equippedWeaponId && player.equippedWeaponId === itemId) return;

        const item = player.inventory.find((it: any) => it.id === itemId);
        if (!item) return;

        const occupant = player.inventory.find((it: any) => it.slotIndex === toSlot);
        const fromSlot = item.slotIndex;

        if (occupant && occupant.id !== item.id && this.canItemsStack(occupant, item)) {
            const max = Math.min(this.getItemMaxStack(occupant), this.getItemMaxStack(item));
            const occupantQty = Math.max(1, Math.floor(Number(occupant.quantity || 1)));
            const itemQty = Math.max(1, Math.floor(Number(item.quantity || 1)));
            const room = Math.max(0, max - occupantQty);

            if (room > 0) {
                const moved = Math.min(room, itemQty);
                occupant.quantity = occupantQty + moved;
                occupant.stackable = true;
                occupant.maxStack = max;

                const remaining = itemQty - moved;
                if (remaining <= 0) {
                    const idx = player.inventory.findIndex((it: any) => it.id === item.id);
                    if (idx !== -1) player.inventory.splice(idx, 1);
                } else {
                    item.quantity = remaining;
                    item.stackable = true;
                    item.maxStack = max;
                    item.slotIndex = fromSlot;
                }

                player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
                this.persistPlayer(player);
                this.sendInventoryState(player);
                return;
            }
        }

        item.slotIndex = toSlot;
        if (occupant && occupant.id !== item.id) occupant.slotIndex = fromSlot;

        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventorySort(player: PlayerRuntime) {
        const equippedId = player.equippedWeaponId || null;
        const sorted = [...player.inventory]
            .filter((it: any) => it.id !== equippedId)
            .sort((a: any, b: any) => {
                const byName = String(a.name || '').localeCompare(String(b.name || ''));
                if (byName !== 0) return byName;
                return String(a.id).localeCompare(String(b.id));
            });
        for (let i = 0; i < sorted.length && i < INVENTORY_SIZE; i++) {
            sorted[i].slotIndex = i;
        }
        if (equippedId) {
            const equipped = player.inventory.find((it: any) => it.id === equippedId);
            if (equipped) sorted.push({ ...equipped, slotIndex: -1 });
        }
        player.inventory = this.normalizeInventorySlots(sorted, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryDelete(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const index = player.inventory.findIndex((it: any) => it.id === itemId);
        if (index === -1) return;
        if (player.equippedWeaponId === itemId) {
            player.equippedWeaponId = null;
            this.recomputePlayerStats(player);
        }
        player.inventory.splice(index, 1);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryUnequipToSlot(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;
        if (player.equippedWeaponId !== itemId) return;

        const item = player.inventory.find((it: any) => it.id === itemId);
        if (!item) return;
        const occupant = player.inventory.find((it: any) => it.slotIndex === toSlot && it.id !== itemId);
        const fromSlot = item.slotIndex;
        item.slotIndex = toSlot;
        if (occupant) occupant.slotIndex = fromSlot;
        player.equippedWeaponId = null;

        this.recomputePlayerStats(player);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleItemUse(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const itemId = String(msg?.itemId || '');
        if (!itemId) return;
        const index = player.inventory.findIndex((it: any) => String(it?.id || '') === itemId);
        if (index === -1) return;
        const item = player.inventory[index];
        const itemType = String(item?.type || '');
        if (itemType !== 'potion_hp' && itemType !== 'skill_reset_hourglass') return;

        let returnedPoints = 0;
        if (itemType === 'potion_hp') {
            const healPercent = Number.isFinite(Number(item?.healPercent)) ? Number(item.healPercent) : Number(HP_POTION_TEMPLATE.healPercent || 0.5);
            const amount = Math.max(1, Math.floor(Number(player.maxHp || 1) * Math.max(0, healPercent)));
            player.hp = clamp(Number(player.hp || 0) + amount, 1, Number(player.maxHp || 1));
        } else {
            returnedPoints = this.getSpentSkillPoints(player);
            player.skillLevels = {};
            if (!player.statusOverrides || typeof player.statusOverrides !== 'object') player.statusOverrides = {};
            player.statusOverrides.__skillLevels = {};
            player.skillCooldowns = {};
            player.activeSkillEffects = [];
            this.recomputePlayerStats(player);
        }
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        if (quantity > 1) {
            item.quantity = quantity - 1;
        } else {
            player.inventory.splice(index, 1);
        }
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);

        this.persistPlayer(player);
        this.sendInventoryState(player);
        this.sendStatsUpdated(player);
        if (itemType === 'skill_reset_hourglass') {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Ampulheta usada: habilidades resetadas e ${returnedPoints} ponto(s) devolvido(s).`
            });
        }
    }

    normalizeInventorySlots(items: any[], equippedWeaponId: string | null = null) {
        const out = [];
        const used = new Set();
        for (const item of items) {
            const clone = { ...item };
            if (clone.id === equippedWeaponId) {
                clone.slotIndex = -1;
                out.push(clone);
                continue;
            }
            if (!Number.isInteger(clone.slotIndex) || clone.slotIndex < 0 || clone.slotIndex >= INVENTORY_SIZE || used.has(clone.slotIndex)) {
                clone.slotIndex = this.firstFreeInventorySlot(out.filter((it: any) => it.id !== equippedWeaponId));
            }
            if (Number.isInteger(clone.slotIndex) && clone.slotIndex >= 0) used.add(clone.slotIndex);
            out.push(clone);
        }
        return out;
    }

    addItemToInventory(player: PlayerRuntime, item: any, quantity: number) {
        let remaining = Math.max(0, Math.floor(Number(quantity || 0)));
        if (remaining <= 0) return 0;

        if (!this.isStackableItem(item)) {
            while (remaining > 0) {
                const freeSlot = this.firstFreeInventorySlot(player.inventory);
                if (freeSlot === -1) break;
                player.inventory.push({ ...item, id: randomUUID(), quantity: 1, slotIndex: freeSlot });
                remaining -= 1;
            }
            return remaining;
        }

        const max = this.getItemMaxStack(item);
        for (const existing of player.inventory) {
            if (remaining <= 0) break;
            if (!this.canItemsStack(existing, item)) continue;
            const current = Math.max(1, Math.floor(Number(existing.quantity || 1)));
            if (current >= max) continue;
            const add = Math.min(max - current, remaining);
            existing.quantity = current + add;
            existing.maxStack = max;
            existing.stackable = true;
            remaining -= add;
        }

        while (remaining > 0) {
            const freeSlot = this.firstFreeInventorySlot(player.inventory);
            if (freeSlot === -1) break;
            const add = Math.min(max, remaining);
            player.inventory.push({
                ...item,
                id: randomUUID(),
                quantity: add,
                stackable: true,
                maxStack: max,
                slotIndex: freeSlot
            });
            remaining -= add;
        }

        return remaining;
    }

    private isStackableItem(item: any) {
        return Boolean(item?.stackable) || Number(item?.maxStack || 1) > 1;
    }

    private getItemMaxStack(item: any) {
        const max = Number(item?.maxStack || 1);
        return Number.isInteger(max) && max > 1 ? max : 1;
    }

    private canItemsStack(a: any, b: any) {
        if (!a || !b) return false;
        if (!this.isStackableItem(a) || !this.isStackableItem(b)) return false;
        const at = String(a.templateId || a.type || '');
        const bt = String(b.templateId || b.type || '');
        return at.length > 0 && at === bt;
    }
}
