"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSHandler = void 0;
class WSHandler {
    constructor(controller) {
        this.controller = controller;
    }
    handleMessage(ws, raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (msg.type === 'ping') {
            try {
                ws.send(JSON.stringify({ type: 'pong', nonce: msg.nonce ?? null, serverTime: Date.now() }));
            }
            catch {
                // noop
            }
            return;
        }
        if (!ws.playerId || !this.controller.players.has(ws.playerId)) {
            if (msg.type.startsWith('auth_')) {
                this.controller.handleAuth(ws, msg);
                return;
            }
            if (msg.type === 'character_create') {
                void this.controller.handleCharacterCreate(ws, msg);
                return;
            }
            if (msg.type === 'character_enter') {
                void this.controller.handleCharacterEnter(ws, msg);
            }
            return;
        }
        const player = this.controller.players.get(ws.playerId);
        switch (msg.type) {
            case 'move':
                this.controller.handleMove(player, msg);
                break;
            case 'target_mob':
                this.controller.handleTargetMob(player, msg);
                break;
            case 'chat_send':
                this.controller.handleChat(player, msg);
                break;
            case 'pickup_item':
                this.controller.handlePickupItem(player, msg);
                break;
            case 'equip_item':
                this.controller.handleEquipItem(player, msg);
                break;
            case 'equip_req':
                this.controller.handleEquipItem(player, msg);
                break;
            case 'inventory_move':
                this.controller.handleInventoryMove(player, msg);
                break;
            case 'inventory_sort':
                this.controller.handleInventorySort(player);
                break;
            case 'inventory_delete':
                this.controller.handleInventoryDelete(player, msg);
                break;
            case 'inventory_unequip_to_slot':
                this.controller.handleInventoryUnequipToSlot(player, msg);
                break;
            case 'item.use':
                this.controller.handleItemUse(player, msg);
                break;
            case 'switch_instance':
                this.controller.handleSwitchInstance(player, msg);
                break;
            case 'admin_command':
                void this.controller.handleAdminCommand(player, msg);
                break;
            case 'admin.setMobPeaceful':
                this.controller.handleAdminSetMobPeaceful(player, msg);
                break;
            case 'party.create':
                this.controller.handlePartyCreate(player);
                break;
            case 'party.invite':
                this.controller.handlePartyInvite(player, msg);
                break;
            case 'party.acceptInvite':
                this.controller.handlePartyAcceptInvite(player, msg);
                break;
            case 'party.declineInvite':
                this.controller.handlePartyDeclineInvite(player, msg);
                break;
            case 'party.leave':
                this.controller.handlePartyLeave(player);
                break;
            case 'party.kick':
                this.controller.handlePartyKick(player, msg);
                break;
            case 'party.promote':
                this.controller.handlePartyPromote(player, msg);
                break;
            case 'party.requestAreaParties':
                this.controller.handlePartyRequestAreaParties(player);
                break;
            case 'party.requestJoin':
                this.controller.handlePartyRequestJoin(player, msg);
                break;
            case 'party.approveJoin':
                this.controller.handlePartyApproveJoin(player, msg);
                break;
            case 'party.waypointPing':
                this.controller.handlePartyWaypointPing(player, msg);
                break;
            case 'friend.request':
                this.controller.handleFriendRequest(player, msg);
                break;
            case 'friend.accept':
                this.controller.handleFriendAccept(player, msg);
                break;
            case 'friend.decline':
                this.controller.handleFriendDecline(player, msg);
                break;
            case 'friend.remove':
                this.controller.handleFriendRemove(player, msg);
                break;
            case 'friend.list':
                this.controller.handleFriendList(player);
                break;
            case 'stats.allocate':
                this.controller.handleStatsAllocate(player, msg);
                break;
            case 'player.setPvpMode':
                this.controller.handleSetPvpMode(player, msg);
                break;
            case 'combat.attack':
                this.controller.handleCombatAttack(player, msg);
                break;
            case 'combat.targetPlayer':
                this.controller.handleCombatTargetPlayer(player, msg);
                break;
            case 'combat.clearTarget':
                this.controller.handleCombatClearTarget(player);
                break;
            case 'player.revive':
                this.controller.handlePlayerRevive(player);
                break;
            case 'skill.cast':
                this.controller.handleSkillCast(player, msg);
                break;
            case 'skill.learn':
                this.controller.handleSkillLearn(player, msg);
                break;
            case 'hotbar.set':
                this.controller.handleHotbarSet(player, msg);
                break;
            // Adicionar outros cases...
        }
    }
}
exports.WSHandler = WSHandler;
//# sourceMappingURL=WSHandler.js.map