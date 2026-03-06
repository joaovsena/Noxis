import { Network } from './Network.js';
import { Sprites } from './Sprites.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.network = new Network(this);
        this.sprites = new Sprites();
        this.menu = null;

        this.localId = null;
        this.players = {};
        this.mobs = {};
        this.groundItems = {};
        this.hoveredMobId = null;
        this.selectedMobId = null;

        this.tileSize = 64;
        this.mapWidth = 6400;
        this.mapHeight = 6400;
        this.camera = { x: 0, y: 0 };
        this.currentMapCode = 'A1';
        this.currentMapId = 'Z1';
        this.currentMapKey = 'forest';
        this.currentMapTheme = 'forest';
        this.mapFeatures = [];
        this.mapPortals = [];
        this.baseRenderWidth = window.innerWidth || 1366;
        this.baseRenderHeight = window.innerHeight || 768;

        this.panel = document.getElementById('char-panel');
        this.panelBody = document.getElementById('panel-body');
        this.panelClassChip = document.getElementById('panel-class-chip');

        this.playerCard = document.getElementById('player-card');
        this.playerAvatar = document.getElementById('player-avatar');
        this.playerName = document.getElementById('player-name');
        this.playerPvpToggle = document.getElementById('player-pvp-toggle');
        this.playerPvpMenu = document.getElementById('player-pvp-menu');
        this.playerPvpOptions = [...document.querySelectorAll('.pvp-mode-option')];
        this.playerHpFill = document.getElementById('player-hp-fill');
        this.playerHpText = document.getElementById('player-hp-text');
        this.targetPlayerCard = document.getElementById('target-player-card');
        this.targetPlayerAvatar = document.getElementById('target-player-avatar');
        this.targetPlayerHpFill = document.getElementById('target-player-hp-fill');
        this.targetActionsToggle = document.getElementById('target-actions-toggle');
        this.targetActionsMenu = document.getElementById('target-actions-menu');
        this.targetInviteBtn = document.getElementById('target-invite-btn');
        this.targetFriendBtn = document.getElementById('target-friend-btn');

        this.minimapWrap = document.getElementById('minimap-wrap');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.mapCodeLabel = document.getElementById('map-code-label');
        this.mapSettingsToggle = document.getElementById('map-settings-toggle');
        this.mapSettingsPanel = document.getElementById('map-settings-panel');
        this.autoAttackToggle = document.getElementById('auto-attack-toggle');
        this.pathDebugSetting = document.getElementById('path-debug-setting');
        this.pathDebugToggle = document.getElementById('path-debug-toggle');
        this.mobPeacefulSetting = document.getElementById('mob-peaceful-setting');
        this.mobPeacefulToggle = document.getElementById('mob-peaceful-toggle');
        this.pathDebugEnabled = false;
        this.mobPeacefulEnabled = false;
        if (this.mapCodeLabel) this.mapCodeLabel.textContent = `Mapa ${this.currentMapCode}`;
        this.worldmapPanel = document.getElementById('worldmap-panel');
        this.worldmapHeader = document.getElementById('worldmap-header');
        this.worldmapCanvas = document.getElementById('worldmap-canvas');
        this.worldmapCtx = this.worldmapCanvas.getContext('2d');
        this.worldmapClose = document.getElementById('worldmap-close');
        this.menuMap = document.getElementById('menu-map');
        this.menuParty = document.getElementById('menu-party');
        this.menuFriends = document.getElementById('menu-friends');
        this.menusWrap = document.getElementById('menus-wrap');
        this.partyPanel = document.getElementById('party-panel');
        this.partyHeader = document.getElementById('party-header');
        this.partyTabMy = document.getElementById('party-tab-my');
        this.partyTabArea = document.getElementById('party-tab-area');
        this.partyViewMy = document.getElementById('party-view-my');
        this.partyViewArea = document.getElementById('party-view-area');
        this.partyRequestWrap = document.getElementById('party-request-wrap');
        this.partyCreateWrap = document.getElementById('party-create-wrap');
        this.partyMyMeta = document.getElementById('party-my-meta');
        this.partyMyLeaveWrap = document.getElementById('party-my-leave-wrap');
        this.partyMyInviteWrap = document.getElementById('party-my-invite-wrap');
        this.partyMembers = document.getElementById('party-members');
        this.partyAreaList = document.getElementById('party-area-list');
        this.partyAreaSearch = document.getElementById('party-area-search');
        this.partyCreateBtn = document.getElementById('party-create');
        this.partyLeaveBtn = document.getElementById('party-leave');
        this.partyInviteName = document.getElementById('party-invite-name');
        this.partyInviteBtn = document.getElementById('party-invite-btn');
        this.partyRequestJoinBtn = document.getElementById('party-request-join-btn');
        this.partyFrames = document.getElementById('party-frames');
        this.partyNotifications = document.getElementById('party-notifications');
        this.partyNotificationsList = document.getElementById('party-notifications-list');
        this.friendsNotifications = document.getElementById('friends-notifications');
        this.friendsNotificationsList = document.getElementById('friends-notifications-list');
        this.friendsPanel = document.getElementById('friends-panel');
        this.friendsHeader = document.getElementById('friends-header');
        this.friendsTabList = document.getElementById('friends-tab-list');
        this.friendsTabRequests = document.getElementById('friends-tab-requests');
        this.friendsViewList = document.getElementById('friends-view-list');
        this.friendsViewRequests = document.getElementById('friends-view-requests');
        this.friendsAddName = document.getElementById('friends-add-name');
        this.friendsAddBtn = document.getElementById('friends-add-btn');
        this.friendsList = document.getElementById('friends-list');
        this.friendsIncomingList = document.getElementById('friends-incoming-list');
        this.friendsOutgoingList = document.getElementById('friends-outgoing-list');

        this.chatWrap = document.getElementById('chat-wrap');
        this.chatLog = document.getElementById('chat-log');
        this.chatInput = document.getElementById('chat-input');
        this.chatScopeButtons = [...document.querySelectorAll('.chat-scope')];
        this.chatScope = 'local';
        this.chatToggle = document.getElementById('chat-toggle');
        this.lastMoveAck = null;
        this.lastMoveSent = null;
        this.moveReqCounter = 0;
        this.autoAttackEnabled = true;
        this.localPlannedPath = [];
        this.chatBubbles = {};
        this.combatProjectiles = [];

        this.skillbarWrap = document.getElementById('skillbar-wrap');
        this.skillButtons = [...document.querySelectorAll('.skill-slot-btn')];
        this.skillButtonByKey = new Map(this.skillButtons.map((btn) => [String(btn.dataset.key || '').toLowerCase(), btn]));
        this.hotbarBindings = {};
        this.skillButtons.forEach((btn) => {
            const key = String(btn.dataset.key || '').toLowerCase();
            if (!key) return;
            this.hotbarBindings[key] = null;
        });
        this.hotbarBindings['1'] = { type: 'action', actionId: 'basic_attack' };
        this.menuAttrs = document.getElementById('menu-attrs');
        this.menuInventory = document.getElementById('menu-inventory');
        this.instanceSelect = document.getElementById('instance-select');
        this.inventoryPanel = document.getElementById('inventory-panel');
        this.inventoryHeader = document.getElementById('inventory-header');
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.inventorySortBtn = document.getElementById('inventory-sort');
        this.inventoryEquippedLabel = document.getElementById('inventory-equipped-label');
        this.inventory = [];
        this.equippedWeaponId = null;
        this.inventoryDrag = null;
        this.pendingDeleteItemId = null;
        this.deleteConfirm = document.getElementById('delete-confirm');
        this.deleteConfirmYes = document.getElementById('delete-confirm-yes');
        this.deleteConfirmNo = document.getElementById('delete-confirm-no');
        this.reviveOverlay = document.getElementById('revive-overlay');
        this.reviveBtn = document.getElementById('revive-btn');
        this.tooltip = document.getElementById('item-tooltip');
        this.tooltipState = {
            activeTooltipId: null,
            anchorElementId: null,
            isPinned: false,
            lastOpenReason: null,
            hoverOpenTimer: null,
            hoverCloseTimer: null
        };
        this.draggingEquippedWeapon = null;
        this.charPanelHeader = document.getElementById('char-panel-header');
        this.charPanelName = document.getElementById('char-panel-name');
        this.adminPanel = document.getElementById('admin-panel');
        this.adminHeader = document.getElementById('admin-header');
        this.adminStatusHelp = document.getElementById('admin-status-help');
        this.adminCommand = document.getElementById('admin-command');
        this.adminSend = document.getElementById('admin-send');
        this.adminResult = document.getElementById('admin-result');
        this.playerRole = 'player';
        this.statusIds = {};
        this.selectedPlayerId = null;
        this.partyState = null;
        this.partyAreaParties = [];
        this.selectedAreaPartyId = null;
        this.pendingPartyInvites = [];
        this.pendingPartyJoinRequests = [];
        this.partyWaypoints = [];
        this.friendsState = { friends: [], incoming: [], outgoing: [] };
        this.partyAreaPollTimer = null;
        this.partyNotifyExpiryTimer = null;
        this.friendNotifyExpiryTimer = null;
        this.partyPanelSignature = '';
        this.isDead = false;
        this.statAllocationPending = {
            physicalAttack: 0,
            magicAttack: 0,
            physicalDefense: 0,
            magicDefense: 0
        };
        this.banditSwingTick = {};
        this.headOverlayTuning = {
            knight: {
                scale: 0.5,
                useBodyAnchor: true,
                anchorRatioX: 0.5,
                anchorRatioY: 0.24,
                scaleByDir: { s: 0.5, sw: 0.49, w: 0.48, nw: 0.49, n: 0.5, se: 0.49, e: 0.48, ne: 0.49 },
                offsetXByDir: { s: 0, sw: 0, w: 0, nw: 0, n: 0, se: 0, e: 0, ne: 0 },
                offsetYByDir: { s: -2, sw: -2, w: -2, nw: -2, n: -2, se: -2, e: -2, ne: -2 },
                bobPx: 0.35
            }
        };

        this.grass = new Image();
        this.grass.src = '/assets/grass.png';
        this.mapTextureImages = {};
        this.loadMapTextureAssets();
        this.forestSeed = 133742;
        this.mapCols = 0;
        this.mapRows = 0;
        this.mapTiles = null;
        this.mapVisualTheme = '';
        this.forestDecor = [];
        this.minimapViewSize = 1850;
        this.ensureForestMap();
        this.setPartyTab('area');
        this.renderPartyPanel();
        this.renderPartyFrames();
        this.renderPartyNotifications();
        this.setFriendsTab('list');
        this.renderFriendsPanel();
        this.renderFriendNotifications();
        if (this.autoAttackToggle) this.autoAttackToggle.checked = this.autoAttackEnabled;
        if (this.pathDebugToggle) this.pathDebugToggle.checked = this.pathDebugEnabled;
        if (this.mobPeacefulToggle) this.mobPeacefulToggle.checked = this.mobPeacefulEnabled;

        this.started = false;
        this.setupEvents();
        this.renderHotbar();
    }

    /**
     * Vincula a UI de autenticação à instância do jogo.
     */
    attachMenu(menu) {
        this.menu = menu;
    }

    /**
     * Configura todos os eventos de input (mouse, teclado e chat).
     */
    setupEvents() {
        const isTypingInField = () => {
            const active = document.activeElement;
            if (!active) return false;
            const tag = (active.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
            return Boolean(active.isContentEditable);
        };

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.localId) return;
            const world = this.toWorldCoords(e);
            this.hoveredMobId = this.getMobAt(world.x, world.y);
        });

        const handleWorldClick = (clientX, clientY) => {
            if (this.isDead) return;
            const world = this.toWorldCoordsFromClient(clientX, clientY);
            const itemId = this.getGroundItemAt(world.x, world.y);
            if (itemId) {
                this.network.send({ type: 'pickup_item', itemId });
                return;
            }
            const playerId = this.getPlayerAt(world.x, world.y);
            if (playerId) {
                this.selectPlayerTarget(playerId, this.autoAttackEnabled);
                return;
            }
            const mobId = this.getMobAt(world.x, world.y);

            if (mobId) {
                this.selectMobTarget(mobId, this.autoAttackEnabled);
                return;
            }

            this.selectedMobId = null;
            this.sendMoveToWorld(world.x, world.y);
        };

        const isUiBlockedTarget = (target) => {
            return Boolean(
                target.closest('#ui-container') ||
                target.closest('#chat-wrap') ||
                target.closest('#skillbar-wrap') ||
                target.closest('#menus-wrap') ||
                target.closest('#char-panel') ||
                target.closest('#inventory-panel') ||
                target.closest('#player-card') ||
                target.closest('#minimap-wrap') ||
                target.closest('#map-settings-panel') ||
                target.closest('#worldmap-panel') ||
                target.closest('#party-panel') ||
                target.closest('#party-frames') ||
                target.closest('#party-notifications') ||
                target.closest('#friends-notifications') ||
                target.closest('#target-player-card') ||
                target.closest('#friends-panel') ||
                target.closest('#admin-panel') ||
                target.closest('#revive-overlay')
            );
        };

        const sendMoveOrTarget = (clientX, clientY) => {
            if (!this.localId) return;
            if (this.isDead) return;
            const world = this.toWorldCoordsFromClient(clientX, clientY);
            this.lastMoveSent = { x: world.x, y: world.y, at: Date.now() };
            handleWorldClick(clientX, clientY);
        };

        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            sendMoveOrTarget(e.clientX, e.clientY);
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const t = e.target;
            if (!t || typeof t.closest !== 'function') return;
            if (!t.closest('#target-player-card')) this.targetActionsMenu.classList.add('hidden');
            if (!t.closest('#player-pvp-toggle') && !t.closest('#player-pvp-menu')) this.playerPvpMenu?.classList.add('hidden');
            if (isUiBlockedTarget(t)) return;
            if (t.closest('#gameCanvas')) return;
            sendMoveOrTarget(e.clientX, e.clientY);
        });

        window.addEventListener('resize', () => this.resize());

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (e.key === 'Escape') {
                this.clearPlayerTarget();
                this.network.send({ type: 'combat.clearTarget' });
                return;
            }
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'c') return;
            this.toggleAttributesPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'b') return;
            this.toggleInventoryPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'm') return;
            this.toggleWorldMapPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'g') return;
            this.togglePartyPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'h') return;
            if (this.playerRole !== 'adm') return;
            this.adminPanel.classList.toggle('hidden');
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            if (e.key.toLowerCase() !== 'o') return;
            this.toggleFriendsPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            const isQuote = e.code === 'Quote' || e.key === "'" || e.key === '"';
            if (!isQuote) return;
            e.preventDefault();
            this.selectNearestTarget();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (isTypingInField()) return;
            const key = String(e.key || '').toLowerCase();
            const btn = this.skillButtonByKey.get(key);
            if (!btn) return;
            btn.classList.add('pressed');
            setTimeout(() => btn.classList.remove('pressed'), 110);
            e.preventDefault();
            this.triggerHotbarKey(key);
        });

        window.addEventListener('keyup', (e) => {
            const key = String(e.key || '').toLowerCase();
            const btn = this.skillButtonByKey.get(key);
            if (!btn) return;
            btn.classList.remove('pressed');
        });

        this.chatScopeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.chatScope = btn.dataset.scope;
                this.chatScopeButtons.forEach((b) => b.classList.toggle('active', b === btn));
            });
        });

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const text = this.chatInput.value.trim();
            if (!text) return;
            this.network.send({
                type: 'chat_send',
                scope: this.chatScope,
                text
            });
            this.chatInput.value = '';
        });

        this.menuAttrs.addEventListener('click', () => {
            if (!this.localId) return;
            this.toggleAttributesPanel();
        });
        this.menuInventory.addEventListener('click', () => {
            if (!this.localId) return;
            this.toggleInventoryPanel();
        });
        this.menuMap.addEventListener('click', () => {
            if (!this.localId) return;
            this.toggleWorldMapPanel();
        });
        this.menuParty.addEventListener('click', () => {
            if (!this.localId) return;
            this.togglePartyPanel();
        });
        this.menuFriends.addEventListener('click', () => {
            if (!this.localId) return;
            this.toggleFriendsPanel();
        });
        this.instanceSelect.addEventListener('change', () => {
            if (!this.localId) return;
            this.network.send({ type: 'switch_instance', mapId: this.instanceSelect.value });
        });
        this.minimapCanvas.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (!this.localId) return;
            this.handleMinimapClick(e.clientX, e.clientY);
        });
        this.worldmapCanvas.addEventListener('pointerdown', (e) => {
            if (!this.localId) return;
            if (e.button === 0) {
                this.handleWorldMapClick(e.clientX, e.clientY);
                return;
            }
            if (e.button === 1) {
                e.preventDefault();
                this.handleWorldMapWaypointPing(e.clientX, e.clientY);
            }
        });
        this.worldmapClose.addEventListener('click', () => {
            this.worldmapPanel.classList.add('hidden');
            this.closeAllTooltips('ui_window_focus_changed');
        });
        this.inventorySortBtn.addEventListener('click', () => {
            if (!this.localId) return;
            this.closeAllTooltips('item_moved_slot');
            this.network.send({ type: 'inventory_sort' });
        });
        this.skillButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                btn.classList.add('pressed');
                setTimeout(() => btn.classList.remove('pressed'), 110);
                this.triggerHotbarKey(String(btn.dataset.key || '').toLowerCase());
            });
            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                btn.classList.add('hovered');
            });
            btn.addEventListener('dragleave', () => btn.classList.remove('hovered'));
            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('hovered');
                const targetKey = String(btn.dataset.key || '').toLowerCase();
                const payload = this.readDragPayload(e.dataTransfer);
                if (!payload || !targetKey) return;
                this.handleHotbarDrop(targetKey, payload);
            });
            btn.addEventListener('dragstart', (e) => {
                const key = String(btn.dataset.key || '').toLowerCase();
                if (!key) return;
                const binding = this.hotbarBindings[key];
                if (!binding) {
                    e.preventDefault();
                    return;
                }
                this.writeDragPayload(e.dataTransfer, { source: 'skillbar', key });
            });
            btn.addEventListener('dragend', () => {
                btn.classList.remove('hovered');
            });
        });

        this.playerPvpToggle.addEventListener('click', () => {
            if (!this.localId || !this.players[this.localId]) return;
            if (!this.playerPvpMenu) return;
            this.playerPvpMenu.classList.toggle('hidden');
        });
        this.playerPvpOptions.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!this.localId || !this.players[this.localId]) return;
                const mode = String(btn.dataset.mode || 'peace');
                this.network.send({ type: 'player.setPvpMode', mode });
                if (this.playerPvpMenu) this.playerPvpMenu.classList.add('hidden');
            });
        });

        if (this.mapSettingsToggle && this.mapSettingsPanel) {
            this.mapSettingsToggle.addEventListener('click', () => {
                this.mapSettingsPanel.classList.toggle('hidden');
            });
        }
        if (this.autoAttackToggle) {
            this.autoAttackToggle.addEventListener('change', () => {
                this.autoAttackEnabled = Boolean(this.autoAttackToggle.checked);
            });
        }
        if (this.pathDebugToggle) {
            this.pathDebugToggle.addEventListener('change', () => {
                if (this.playerRole !== 'adm') {
                    this.pathDebugEnabled = false;
                    this.pathDebugToggle.checked = false;
                    return;
                }
                this.pathDebugEnabled = Boolean(this.pathDebugToggle.checked);
            });
        }
        if (this.mobPeacefulToggle) {
            this.mobPeacefulToggle.addEventListener('change', () => {
                if (this.playerRole !== 'adm') {
                    this.mobPeacefulEnabled = false;
                    this.mobPeacefulToggle.checked = false;
                    return;
                }
                this.mobPeacefulEnabled = Boolean(this.mobPeacefulToggle.checked);
                this.network.send({ type: 'admin.setMobPeaceful', enabled: this.mobPeacefulEnabled });
            });
        }

        this.reviveBtn.addEventListener('click', () => {
            this.network.send({ type: 'player.revive' });
        });

        this.chatToggle.addEventListener('click', () => {
            const minimized = this.chatWrap.classList.toggle('minimized');
            this.chatToggle.textContent = minimized ? 'Mostrar' : 'Ocultar';
        });

        this.deleteConfirmYes.addEventListener('click', () => {
            if (this.pendingDeleteItemId) {
                this.closeAllTooltips('item_removed');
                this.network.send({ type: 'inventory_delete', itemId: this.pendingDeleteItemId });
            }
            this.pendingDeleteItemId = null;
            this.deleteConfirm.classList.add('hidden');
        });
        this.deleteConfirmNo.addEventListener('click', () => {
            this.pendingDeleteItemId = null;
            this.deleteConfirm.classList.add('hidden');
        });

        const executeAdminCommand = () => {
            const command = this.adminCommand.value.trim();
            if (!command) return;
            this.onSystemMessage({ text: `Voce executou o comando ${command}.` });
            this.network.send({ type: 'admin_command', command });
            this.adminCommand.value = '';
        };
        this.adminSend.addEventListener('click', executeAdminCommand);
        this.adminCommand.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            executeAdminCommand();
        });

        this.partyTabMy.addEventListener('click', () => this.setPartyTab('my'));
        this.partyTabArea.addEventListener('click', () => this.setPartyTab('area'));
        this.partyCreateBtn.addEventListener('click', () => {
            this.network.send({ type: 'party.create' });
        });
        this.partyLeaveBtn.addEventListener('click', () => {
            this.network.send({ type: 'party.leave' });
        });
        this.partyInviteBtn.addEventListener('click', () => {
            const targetName = this.partyInviteName.value.trim();
            if (!targetName) return;
            this.network.send({ type: 'party.invite', targetName });
            this.partyInviteName.value = '';
        });
        this.partyRequestJoinBtn.addEventListener('click', () => {
            if (!this.selectedAreaPartyId) return;
            this.network.send({ type: 'party.requestJoin', partyId: this.selectedAreaPartyId });
        });
        this.partyAreaSearch.addEventListener('input', () => {
            this.renderPartyPanel();
        });
        this.targetInviteBtn.addEventListener('click', () => {
            const target = this.selectedPlayerId ? this.players[this.selectedPlayerId] : null;
            if (!target) return;
            if (!this.partyState) {
                this.onSystemMessage({ text: 'Voce nao esta em um grupo e nao pode convidar ninguem.' });
                this.targetActionsMenu.classList.add('hidden');
                return;
            }
            const isLeader = Number(this.partyState.leaderId) === Number(this.localId);
            if (!isLeader) {
                this.onSystemMessage({ text: 'Somente o lider do grupo pode convidar jogadores.' });
                this.targetActionsMenu.classList.add('hidden');
                return;
            }
            const sameParty = Array.isArray(this.partyState.members)
                && this.partyState.members.some((m) => Number(m.playerId) === Number(target.id));
            if (sameParty) {
                this.onSystemMessage({ text: 'Esse jogador ja esta no seu grupo.' });
                this.targetActionsMenu.classList.add('hidden');
                return;
            }
            this.network.send({ type: 'party.invite', targetName: target.name });
            this.targetActionsMenu.classList.add('hidden');
        });
        this.targetFriendBtn.addEventListener('click', () => {
            const target = this.selectedPlayerId ? this.players[this.selectedPlayerId] : null;
            if (!target) return;
            this.network.send({ type: 'friend.request', targetPlayerId: Number(target.id) });
            this.targetActionsMenu.classList.add('hidden');
        });
        this.targetActionsToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.targetActionsMenu.classList.toggle('hidden');
        });
        this.friendsTabList.addEventListener('click', () => this.setFriendsTab('list'));
        this.friendsTabRequests.addEventListener('click', () => this.setFriendsTab('requests'));
        this.friendsAddBtn.addEventListener('click', () => {
            const targetName = this.friendsAddName.value.trim();
            if (!targetName) return;
            this.network.send({ type: 'friend.request', targetName });
            this.friendsAddName.value = '';
        });
        this.friendsAddName.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const targetName = this.friendsAddName.value.trim();
            if (!targetName) return;
            this.network.send({ type: 'friend.request', targetName });
            this.friendsAddName.value = '';
        });

        this.makeDraggable(this.panel, this.charPanelHeader);
        this.makeDraggable(this.inventoryPanel, this.inventoryHeader);
        this.makeDraggable(this.adminPanel, this.adminHeader);
        this.makeDraggable(this.partyPanel, this.partyHeader);
        this.makeDraggable(this.friendsPanel, this.friendsHeader);
        this.makeDraggable(this.worldmapPanel, this.worldmapHeader, true);
    }

    /**
     * Torna um painel arrastável pela barra de título.
     */
    makeDraggable(panel, handle, resetTransform = false) {
        if (!panel || !handle) return;
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (target && typeof target.closest === 'function' && target.closest('button')) return;
            dragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            if (resetTransform) panel.style.transform = 'none';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
        });

        window.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    /**
     * Alterna visibilidade do painel de atributos.
     */
    toggleAttributesPanel() {
        this.closeAllTooltips('ui_window_focus_changed');
        this.panel.classList.toggle('hidden');
        this.updatePanel();
    }

    /**
     * Alterna visibilidade do inventário.
     */
    toggleInventoryPanel() {
        this.closeAllTooltips('ui_window_focus_changed');
        this.inventoryPanel.classList.toggle('hidden');
        this.renderInventory();
    }

    toggleWorldMapPanel() {
        this.closeAllTooltips('ui_window_focus_changed');
        this.worldmapPanel.classList.toggle('hidden');
    }

    togglePartyPanel() {
        this.partyPanel.classList.toggle('hidden');
        if (!this.partyPanel.classList.contains('hidden')) {
            this.network.send({ type: 'party.requestAreaParties' });
            if (!this.partyAreaPollTimer) {
                this.partyAreaPollTimer = setInterval(() => {
                    if (this.partyPanel.classList.contains('hidden')) return;
                    this.network.send({ type: 'party.requestAreaParties' });
                }, 7000);
            }
        } else if (this.partyAreaPollTimer) {
            clearInterval(this.partyAreaPollTimer);
            this.partyAreaPollTimer = null;
        }
        this.renderPartyNotifications();
        this.renderPartyPanel();
    }

    setPartyTab(tab) {
        const showMy = tab !== 'area';
        this.partyTabMy.classList.toggle('active', showMy);
        this.partyTabArea.classList.toggle('active', !showMy);
        this.partyViewMy.classList.toggle('hidden', !showMy);
        this.partyViewArea.classList.toggle('hidden', showMy);
    }

    toggleFriendsPanel() {
        this.friendsPanel.classList.toggle('hidden');
        if (!this.friendsPanel.classList.contains('hidden')) {
            this.network.send({ type: 'friend.list' });
        }
        this.renderFriendsPanel();
    }

    setFriendsTab(tab) {
        const showList = tab !== 'requests';
        this.friendsTabList.classList.toggle('active', showList);
        this.friendsTabRequests.classList.toggle('active', !showList);
        this.friendsViewList.classList.toggle('hidden', !showList);
        this.friendsViewRequests.classList.toggle('hidden', showList);
    }

    sendMoveToWorld(x, y) {
        const reqId = `m-${++this.moveReqCounter}-${Date.now()}`;
        const clampedX = Math.max(0, Math.min(this.mapWidth, x));
        const clampedY = Math.max(0, Math.min(this.mapHeight, y));
        this.selectedMobId = null;
        this.network.send({ type: 'move', reqId, x: clampedX, y: clampedY });
        this.lastMoveSent = { reqId, x: clampedX, y: clampedY, at: Date.now() };
    }

    /**
     * Envia comando de registro para o servidor.
     */
    sendRegister(payload) {
        this.network.connect();
        this.network.send({ type: 'auth_register', ...payload });
        if (this.menu) this.menu.setStatus('Registrando...');
    }

    /**
     * Envia comando de login para o servidor.
     */
    sendLogin(payload) {
        this.network.connect();
        this.network.send({ type: 'auth_login', ...payload });
        if (this.menu) this.menu.setStatus('Logando...');
    }

    /**
     * Exibe mensagens de autenticação na UI.
     */
    onAuthMessage(message) {
        if (this.menu) this.menu.setStatus(message.message, message.type === 'auth_error');
    }

    /**
     * Finaliza login no cliente e habilita HUD/jogo.
     */
    onAuthSuccess(message) {
        this.localId = message.playerId;
        this.resetPendingStatAllocation();
        this.isDead = false;
        this.reviveOverlay.classList.add('hidden');
        this.playerRole = message.role || 'player';
        this.statusIds = message.statusIds || {};
        if (message.world) {
            this.mapWidth = message.world.width;
            this.mapHeight = message.world.height;
            this.ensureForestMap();
        }

        if (this.menu) this.menu.hide();
        this.canvas.style.display = 'block';
        this.playerCard.classList.remove('hidden');
        this.minimapWrap.classList.remove('hidden');
        this.chatWrap.classList.remove('hidden');
        this.skillbarWrap.classList.remove('hidden');
        this.menusWrap.classList.remove('hidden');
        if (this.playerRole !== 'adm') this.adminPanel.classList.add('hidden');
        if (this.playerRole === 'adm') {
            const lines = Object.entries(this.statusIds)
                .map(([name, id]) => `${id}=${name}`)
                .join(' | ');
            this.adminStatusHelp.textContent = `setstatus {id} {quantia} {jogador} | ids: ${lines}`;
        }
        this.updateAdminMapSettings();
        this.resize();

        if (!this.started) {
            this.started = true;
            this.startLoop();
        }
        this.network.send({ type: 'friend.list' });
        this.renderPartyPanel();
        this.renderPartyFrames();
        this.renderPartyNotifications();
        this.renderHotbar();
    }

    castPrimarySkill() {
        if (!this.localId || this.isDead) return;
        this.network.send({
            type: 'skill.cast',
            skillId: 'class_primary',
            targetMobId: this.selectedMobId || null,
            targetPlayerId: this.selectedPlayerId ? Number(this.selectedPlayerId) : null
        });
    }

    /**
     * Callback de desconexão do socket.
     */
    onDisconnected() {
        if (this.partyAreaPollTimer) {
            clearInterval(this.partyAreaPollTimer);
            this.partyAreaPollTimer = null;
        }
        if (this.partyNotifyExpiryTimer) {
            clearTimeout(this.partyNotifyExpiryTimer);
            this.partyNotifyExpiryTimer = null;
        }
        if (this.friendNotifyExpiryTimer) {
            clearTimeout(this.friendNotifyExpiryTimer);
            this.friendNotifyExpiryTimer = null;
        }
        this.partyState = null;
        this.partyAreaParties = [];
        this.selectedAreaPartyId = null;
        this.pendingPartyInvites = [];
        this.pendingPartyJoinRequests = [];
        this.partyWaypoints = [];
        this.friendsState = { friends: [], incoming: [], outgoing: [] };
        this.resetPendingStatAllocation();
        this.isDead = false;
        this.reviveOverlay.classList.add('hidden');
        this.clearPlayerTarget();
        this.renderPartyPanel();
        this.renderPartyFrames();
        this.renderPartyNotifications();
        this.renderFriendsPanel();
        this.renderFriendNotifications();
        if (this.menu) this.menu.setStatus('Conexao encerrada.', true);
    }

    /**
     * Recebe confirmação do servidor para comando de movimento.
     */
    onMoveAck(message) {
        this.lastMoveAck = message;
        if (!this.localId || !this.players[this.localId]) return;
        if (Array.isArray(message.pathNodes)) {
            this.players[this.localId].pathNodes = message.pathNodes;
        }
    }

    /**
     * Recebe snapshot do inventário do servidor.
     */
    onInventoryState(message) {
        this.closeAllTooltips('inventory_state_commit');
        this.inventory = Array.isArray(message.inventory) ? message.inventory : [];
        this.equippedWeaponId = message.equippedWeaponId || null;
        this.pruneInvalidHotbarItems();
        this.renderHotbar();
        this.renderInventory();
        this.updatePanel();
    }

    /**
     * Aplica animação curta de hit no atacante e no mob atingido.
     */
    onCombatHit(message) {
        const p = this.players[message.attackerId];
        const m = this.mobs[message.mobId];
        if (!p || !m) return;

        const dx = (message.mobX ?? m.x) - (message.attackerX ?? p.x);
        const dy = (message.mobY ?? m.y) - (message.attackerY ?? p.y);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        p.hitAnim = { until: Date.now() + 120, ox: ux * 8, oy: uy * 8 };
        p.attackAnim = { startedAt: Date.now(), until: Date.now() + 420 };
        if (p.class === 'bandit') this.banditSwingTick[String(p.id)] = (this.banditSwingTick[String(p.id)] || 0) + 1;
        if (p.class === 'shifter') {
            this.spawnProjectile(
                Number(message.attackerX ?? p.x),
                Number(message.attackerY ?? p.y) - 22,
                Number(message.mobX ?? m.x),
                Number(message.mobY ?? m.y) - 16,
                '#7dd3fc'
            );
        }
        m.hitAnim = { until: Date.now() + 140, ox: ux * 10, oy: uy * 10 };
    }

    onCombatPlayerHit(message) {
        const attacker = this.players[message.attackerId];
        const target = this.players[message.targetPlayerId];
        if (target) {
            target.hp = Number.isFinite(Number(message.targetHp)) ? Number(message.targetHp) : target.hp;
            target.maxHp = Number.isFinite(Number(message.targetMaxHp)) ? Number(message.targetMaxHp) : target.maxHp;
            target.dead = target.hp <= 0;
            target.hitAnim = { until: Date.now() + 140, ox: 0, oy: -6 };
        }
        if (attacker) {
            attacker.attackAnim = { startedAt: Date.now(), until: Date.now() + 300 };
            if (attacker.class === 'bandit') this.banditSwingTick[String(attacker.id)] = (this.banditSwingTick[String(attacker.id)] || 0) + 1;
            if (attacker.class === 'shifter') {
                this.spawnProjectile(
                    Number(message.attackerX ?? attacker.x),
                    Number(message.attackerY ?? attacker.y) - 22,
                    Number(message.targetX ?? (target ? target.x : attacker.x)),
                    Number(message.targetY ?? (target ? target.y : attacker.y)) - 16,
                    '#7dd3fc'
                );
            }
        }
        if (this.localId && Number(message.targetPlayerId) === Number(this.localId) && target && target.hp <= 0) {
            this.onPlayerDead({});
        }
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
        this.updatePanel();
    }

    onCombatMobHitPlayer(message) {
        const target = this.players[message.targetPlayerId];
        if (target) {
            target.hp = Number.isFinite(Number(message.targetHp)) ? Number(message.targetHp) : target.hp;
            target.maxHp = Number.isFinite(Number(message.targetMaxHp)) ? Number(message.targetMaxHp) : target.maxHp;
            target.dead = target.hp <= 0;
            target.hitAnim = { until: Date.now() + 120, ox: 0, oy: -4 };
        }
        if (this.localId && Number(message.targetPlayerId) === Number(this.localId) && target && target.hp <= 0) {
            this.onPlayerDead({});
        }
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
        this.updatePanel();
    }

    /**
     * Mostra mensagens do sistema no chat.
     */
    onSystemMessage(message) {
        this.onChatMessage({
            scope: 'system',
            from: 'Sistema',
            text: message.text || ''
        });
    }

    /**
     * Mostra retorno de comandos admin.
     */
    onAdminResult(message) {
        this.adminResult.textContent = message.message || '';
        this.adminResult.style.color = message.ok ? '#8ef6b2' : '#ff9d9d';
    }

    spawnProjectile(fromX, fromY, toX, toY, color = '#7dd3fc') {
        const now = Date.now();
        this.combatProjectiles.push({
            fromX,
            fromY,
            toX,
            toY,
            color,
            startedAt: now,
            expiresAt: now + 260
        });
    }

    onPartyInviteReceived(message) {
        const inviteId = String(message.inviteId || `${message.partyId}:${message.fromPlayerId}`);
        const already = this.pendingPartyInvites.some((it) => it.inviteId === inviteId);
        if (already) return;
        this.pendingPartyInvites.push({
            inviteId,
            partyId: message.partyId,
            fromPlayerId: message.fromPlayerId,
            fromName: message.fromName || 'Jogador',
            expiresAt: Date.now() + Number(message.expiresIn || 30000)
        });
        this.renderPartyNotifications();
    }

    onPartyState(message) {
        const previousPartyId = this.partyState?.id || null;
        this.partyState = message.party || null;
        const currentPartyId = this.partyState?.id || null;
        if (!previousPartyId && currentPartyId) {
            this.setPartyTab('my');
        }
        if (previousPartyId && !currentPartyId) {
            this.setPartyTab('area');
        }
        if (currentPartyId && currentPartyId !== previousPartyId) {
            this.pendingPartyInvites = [];
        }
        if (currentPartyId !== previousPartyId) {
            this.partyWaypoints = [];
        }
        const nextSignature = this.buildPartyPanelSignature(this.partyState);
        const changed = nextSignature !== this.partyPanelSignature;
        this.partyPanelSignature = nextSignature;
        if (changed) {
            this.renderPartyPanel();
        }
        this.renderPartyFrames();
        this.renderPartyNotifications();
    }

    onPartyAreaList(message) {
        this.partyAreaParties = Array.isArray(message.parties) ? message.parties : [];
        if (!this.partyAreaParties.some((p) => p.partyId === this.selectedAreaPartyId)) {
            this.selectedAreaPartyId = null;
        }
        if (!this.partyPanel.classList.contains('hidden')) this.renderPartyPanel();
    }

    onPartyError(message) {
        this.onSystemMessage({ text: message.message || 'Erro no sistema de grupo.' });
    }

    onFriendState(message) {
        this.friendsState = {
            friends: Array.isArray(message.friends) ? message.friends : [],
            incoming: Array.isArray(message.incoming) ? message.incoming : [],
            outgoing: Array.isArray(message.outgoing) ? message.outgoing : []
        };
        this.renderFriendsPanel();
        this.renderFriendNotifications();
    }

    onFriendRequestReceived(message) {
        this.onSystemMessage({ text: `${message.fromName || 'Jogador'} enviou pedido de amizade.` });
        this.network.send({ type: 'friend.list' });
        this.renderFriendNotifications();
    }

    onFriendError(message) {
        this.onSystemMessage({ text: message.message || 'Erro no sistema de amigos.' });
    }

    onPlayerStatsUpdated(message) {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        me.stats = message.stats || me.stats;
        me.allocatedStats = this.normalizeAllocatedStats(message.allocatedStats);
        me.unspentPoints = Number.isFinite(Number(message.unspentPoints)) ? Math.max(0, Number(message.unspentPoints)) : 0;
        me.level = Number.isFinite(Number(message.level)) ? Number(message.level) : me.level;
        me.xp = Number.isFinite(Number(message.xp)) ? Number(message.xp) : me.xp;
        me.xpToNext = Number.isFinite(Number(message.xpToNext)) ? Number(message.xpToNext) : me.xpToNext;
        me.hp = Number.isFinite(Number(message.hp)) ? Number(message.hp) : me.hp;
        me.maxHp = Number.isFinite(Number(message.maxHp)) ? Number(message.maxHp) : me.maxHp;
        me.dead = me.hp <= 0;
        this.isDead = me.dead;
        this.reviveOverlay.classList.toggle('hidden', !this.isDead);
        this.resetPendingStatAllocation();
        this.updatePanel();
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
    }

    onAdminMobPeacefulState(message) {
        const enabled = Boolean(message?.enabled);
        this.mobPeacefulEnabled = enabled;
        if (this.mobPeacefulToggle) this.mobPeacefulToggle.checked = enabled;
    }

    onPlayerPvpModeUpdated(message) {
        const id = String(message.playerId || '');
        if (!id || !this.players[id]) return;
        this.players[id].pvpMode = message.mode === 'evil' ? 'evil' : message.mode === 'group' ? 'group' : 'peace';
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
    }

    onPlayerDead() {
        this.isDead = true;
        this.reviveOverlay.classList.remove('hidden');
        this.network.send({ type: 'combat.clearTarget' });
    }

    onPartyJoinRequestReceived(message) {
        const requestId = String(message.requestId || '');
        if (!requestId) return;
        const already = this.pendingPartyJoinRequests.some((it) => it.requestId === requestId);
        if (already) return;
        this.pendingPartyJoinRequests.push({
            requestId,
            partyId: message.partyId,
            fromPlayerId: message.fromPlayerId,
            fromName: message.fromName || 'Jogador',
            expiresAt: Date.now() + Number(message.expiresIn || 30000)
        });
        this.renderPartyNotifications();
    }

    onPartyJoinRequestResult(message) {
        const text = message?.message || (message?.ok ? 'Entrada no grupo aprovada.' : 'Solicitacao recusada.');
        this.onSystemMessage({ text });
    }

    onPartyWaypointPing(message) {
        const waypointId = String(message.waypointId || '');
        if (!waypointId) return;
        const expiresIn = Number(message.expiresIn || 10000);
        const expiresAt = Date.now() + Math.max(1, expiresIn);
        this.partyWaypoints = this.partyWaypoints.filter((it) => it.waypointId !== waypointId);
        this.partyWaypoints.push({
            waypointId,
            partyId: String(message.partyId || ''),
            fromPlayerId: Number(message.fromPlayerId),
            fromName: String(message.fromName || 'Grupo'),
            mapKey: String(message.mapKey || this.currentMapKey || ''),
            mapId: String(message.mapId || this.currentMapId || ''),
            x: Number(message.x) || 0,
            y: Number(message.y) || 0,
            expiresAt
        });
    }

    resolvePartyInvite(invite, accept) {
        this.pendingPartyInvites = this.pendingPartyInvites.filter((it) => it.inviteId !== invite.inviteId);
        this.renderPartyNotifications();
        this.network.send({
            type: accept ? 'party.acceptInvite' : 'party.declineInvite',
            partyId: invite.partyId,
            inviteId: invite.inviteId
        });
    }

    resolvePartyJoinRequest(request, accept) {
        this.pendingPartyJoinRequests = this.pendingPartyJoinRequests.filter((it) => it.requestId !== request.requestId);
        this.renderPartyNotifications();
        this.network.send({
            type: 'party.approveJoin',
            requestId: request.requestId,
            accept
        });
    }

    /**
     * Renderiza linha no chat e atualiza balão de fala por 8s.
     */
    onChatMessage(message) {
        const line = document.createElement('div');
        line.className = 'chat-line';
        line.innerHTML = `<span class="chat-tag">[${message.scope}] ${message.from}:</span> ${this.escapeHtml(message.text)}`;
        this.chatLog.appendChild(line);
        this.chatLog.scrollTop = this.chatLog.scrollHeight;

        if (message.fromId) {
            this.chatBubbles[message.fromId] = {
                text: message.text,
                expiresAt: Date.now() + 8000
            };
        }
    }

    /**
     * Escapa HTML para evitar injeção na UI do chat.
     */
    escapeHtml(value) {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
    }

    /**
     * Converte coordenada de mouse para coordenada do mundo (com câmera).
     */
    toWorldCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / Math.max(1, rect.width);
        const sy = this.canvas.height / Math.max(1, rect.height);
        return {
            x: (event.clientX - rect.left) * sx + this.camera.x,
            y: (event.clientY - rect.top) * sy + this.camera.y
        };
    }

    /**
     * Converte clientX/clientY para coordenada do mundo.
     */
    toWorldCoordsFromClient(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / Math.max(1, rect.width);
        const sy = this.canvas.height / Math.max(1, rect.height);
        return {
            x: (clientX - rect.left) * sx + this.camera.x,
            y: (clientY - rect.top) * sy + this.camera.y
        };
    }

    getMinimapWorldRect() {
        const me = this.localId ? this.players[this.localId] : null;
        const viewSize = Math.max(700, Math.min(this.minimapViewSize, Math.min(this.mapWidth, this.mapHeight)));
        if (!me) {
            return { x: 0, y: 0, w: viewSize, h: viewSize };
        }
        const half = viewSize / 2;
        return {
            x: Math.max(0, Math.min(this.mapWidth - viewSize, me.x - half)),
            y: Math.max(0, Math.min(this.mapHeight - viewSize, me.y - half)),
            w: viewSize,
            h: viewSize
        };
    }

    worldFromCanvasClient(canvas, clientX, clientY, worldRect) {
        const rect = canvas.getBoundingClientRect();
        const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const localY = Math.max(0, Math.min(rect.height, clientY - rect.top));
        const nx = rect.width > 0 ? localX / rect.width : 0;
        const ny = rect.height > 0 ? localY / rect.height : 0;
        return {
            x: worldRect.x + nx * worldRect.w,
            y: worldRect.y + ny * worldRect.h
        };
    }

    handleMinimapClick(clientX, clientY) {
        const worldRect = this.getMinimapWorldRect();
        const world = this.worldFromCanvasClient(this.minimapCanvas, clientX, clientY, worldRect);
        this.sendMoveToWorld(world.x, world.y);
    }

    handleWorldMapClick(clientX, clientY) {
        const worldRect = { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight };
        const world = this.worldFromCanvasClient(this.worldmapCanvas, clientX, clientY, worldRect);
        this.sendMoveToWorld(world.x, world.y);
    }

    handleWorldMapWaypointPing(clientX, clientY) {
        if (!this.partyState || !this.partyState.id) {
            this.onSystemMessage({ text: 'Voce precisa estar em um grupo para marcar waypoint.' });
            return;
        }
        const worldRect = { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight };
        const world = this.worldFromCanvasClient(this.worldmapCanvas, clientX, clientY, worldRect);
        this.network.send({
            type: 'party.waypointPing',
            x: world.x,
            y: world.y
        });
    }

    /**
     * Retorna item no chão sob o cursor.
     */
    getGroundItemAt(x, y) {
        for (const id of Object.keys(this.groundItems)) {
            const it = this.groundItems[id];
            if (Math.abs(x - it.x) <= 16 && Math.abs(y - it.y) <= 16) {
                return id;
            }
        }
        return null;
    }

    /**
     * Retorna ID do mob sob o cursor (hit test em retângulo).
     */
    getMobAt(x, y) {
        for (const id of Object.keys(this.mobs)) {
            const mob = this.mobs[id];
            const half = mob.size / 2;
            if (x >= mob.x - half && x <= mob.x + half && y >= mob.y - half && y <= mob.y + half) return id;
        }
        return null;
    }

    /**
     * Retorna ID de player sob o cursor (hitbox aproximada do sprite).
     */
    getPlayerAt(x, y) {
        for (const id of Object.keys(this.players)) {
            if (id === String(this.localId)) continue;
            const p = this.players[id];
            const left = p.x - 20;
            const top = p.y - 20;
            const right = left + 50;
            const bottom = top + 80;
            if (x >= left && x <= right && y >= top && y <= bottom) return id;
        }
        return null;
    }

    selectMobTarget(mobId, activateCombat = false) {
        if (!mobId || !this.mobs[mobId]) return false;
        this.selectedMobId = mobId;
        this.clearPlayerTarget();
        if (activateCombat) this.network.send({ type: 'target_mob', mobId });
        return true;
    }

    selectPlayerTarget(playerId, activateCombat = false) {
        if (!this.players[playerId]) return;
        this.selectedPlayerId = playerId;
        this.selectedMobId = null;
        this.targetActionsMenu.classList.add('hidden');
        this.updateTargetPlayerCard();
        const me = this.localId ? this.players[this.localId] : null;
        const target = this.players[playerId];
        if (activateCombat && me && target && !this.isDead) {
            const allowed = this.canStartPvpAgainstTarget(me, target, true);
            if (!allowed.ok) {
                this.onSystemMessage({ text: allowed.reason || 'Nao pode atacar esse alvo.' });
                return;
            }
            this.network.send({ type: 'combat.targetPlayer', targetPlayerId: Number(playerId) });
        }
    }

    clearPlayerTarget() {
        this.selectedPlayerId = null;
        this.targetActionsMenu.classList.add('hidden');
        this.targetPlayerCard.classList.add('hidden');
    }

    canStartPvpAgainstTarget(me, target, strictMode = false) {
        if (!me || !target) return { ok: false, reason: 'Alvo invalido.' };
        if (this.isTargetInMyParty(target.id)) return { ok: false, reason: 'Nao pode atacar membro do seu grupo.' };
        const mode = me.pvpMode === 'evil' ? 'evil' : me.pvpMode === 'group' ? 'group' : 'peace';
        const targetMode = target.pvpMode === 'evil' ? 'evil' : target.pvpMode === 'group' ? 'group' : 'peace';
        if (mode === 'peace') return { ok: false, reason: 'Modo Paz ativo: voce nao pode atacar jogadores.' };
        if (mode === 'group') {
            if (!this.partyState) return { ok: false, reason: 'Modo Grupo exige estar em grupo.' };
            if (targetMode !== 'group') return { ok: false, reason: 'Modo Grupo so ataca jogadores no modo Grupo.' };
            return { ok: true };
        }
        if (mode === 'evil') {
            if (strictMode && targetMode === 'evil') return { ok: false, reason: 'Modo Mal ataca apenas alvos em Paz ou Grupo.' };
            return { ok: true };
        }
        return { ok: false, reason: 'Modo de combate invalido.' };
    }

    isTargetInMyParty(targetPlayerId) {
        return Boolean(
            this.partyState &&
            Array.isArray(this.partyState.members) &&
            this.partyState.members.some((m) => Number(m.playerId) === Number(targetPlayerId))
        );
    }

    selectNearestTarget() {
        if (!this.localId || this.isDead) return;
        const me = this.players[this.localId];
        if (!me) return;

        let nearest = null;
        let nearestDistSq = Number.POSITIVE_INFINITY;

        for (const [mobId, mob] of Object.entries(this.mobs)) {
            if (!mob || Number(mob.hp || 0) <= 0) continue;
            const dx = Number(mob.x) - Number(me.x);
            const dy = Number(mob.y) - Number(me.y);
            const d2 = dx * dx + dy * dy;
            if (d2 < nearestDistSq) {
                nearestDistSq = d2;
                nearest = { type: 'mob', id: mobId };
            }
        }

        for (const [playerId, target] of Object.entries(this.players)) {
            if (playerId === String(this.localId)) continue;
            if (!target || target.dead || Number(target.hp || 0) <= 0) continue;
            const dx = Number(target.x) - Number(me.x);
            const dy = Number(target.y) - Number(me.y);
            const d2 = dx * dx + dy * dy;
            if (d2 < nearestDistSq) {
                nearestDistSq = d2;
                nearest = { type: 'player', id: playerId };
            }
        }

        if (!nearest) {
            this.selectedMobId = null;
            this.clearPlayerTarget();
            this.onSystemMessage({ text: 'Nenhum alvo proximo.' });
            return;
        }

        if (nearest.type === 'mob') {
            this.selectMobTarget(nearest.id, false);
            return;
        }
        this.selectPlayerTarget(nearest.id);
    }

    triggerPrimaryAttack() {
        if (!this.localId || this.isDead) return;

        if (this.selectedMobId && this.mobs[this.selectedMobId]) {
            this.network.send({ type: 'target_mob', mobId: this.selectedMobId });
            return;
        }

        if (this.selectedPlayerId && this.players[this.selectedPlayerId]) {
            const me = this.players[this.localId];
            const target = this.players[this.selectedPlayerId];
            if (!me || !target) return;
            const allowed = this.canStartPvpAgainstTarget(me, target, true);
            if (!allowed.ok) {
                this.onSystemMessage({ text: allowed.reason || 'Nao pode atacar esse alvo.' });
                return;
            }
            this.network.send({ type: 'combat.targetPlayer', targetPlayerId: Number(this.selectedPlayerId) });
            return;
        }

        this.onSystemMessage({ text: 'Selecione um alvo com a tecla \'.' });
    }

    triggerHotbarKey(key) {
        if (!key) return;
        const binding = this.hotbarBindings[key] || null;
        if (!binding) return;
        if (binding.type === 'action' && binding.actionId === 'basic_attack') {
            this.triggerPrimaryAttack();
            return;
        }
        if (binding.type === 'item') {
            const item = this.inventory.find((it) => String(it.id) === String(binding.itemId));
            if (!item) {
                this.hotbarBindings[key] = null;
                this.renderHotbar();
                return;
            }
            this.network.send({ type: 'item.use', itemId: item.id });
        }
    }

    normalizeHotbarBinding(binding) {
        if (!binding || typeof binding !== 'object') return null;
        if (binding.type === 'action' && binding.actionId === 'basic_attack') {
            return { type: 'action', actionId: 'basic_attack' };
        }
        if (binding.type === 'item' && binding.itemId) {
            return { type: 'item', itemId: String(binding.itemId) };
        }
        return null;
    }

    renderHotbar() {
        this.skillButtons.forEach((btn) => {
            const key = String(btn.dataset.key || '').toLowerCase();
            const binding = this.hotbarBindings[key] || null;
            const keyLabel = String(btn.dataset.key || '').toUpperCase();
            let icon = '';
            let title = keyLabel;
            btn.classList.remove('slot-kind-action', 'slot-kind-item', 'slot-kind-empty', 'slot-icon-attack', 'slot-icon-potion');

            if (binding?.type === 'action' && binding.actionId === 'basic_attack') {
                icon = 'ATK';
                title = 'Ataque Basico';
                btn.classList.add('slot-kind-action', 'slot-icon-attack');
            } else if (binding?.type === 'item') {
                const item = this.inventory.find((it) => String(it.id) === String(binding.itemId));
                if (!item) {
                    this.hotbarBindings[key] = null;
                    btn.classList.add('slot-kind-empty');
                } else {
                    icon = String(item.type || '') === 'potion_hp' ? 'HP' : 'IT';
                    title = item.name || 'Item';
                    btn.classList.add('slot-kind-item');
                    if (String(item.type || '') === 'potion_hp') btn.classList.add('slot-icon-potion');
                }
            } else {
                btn.classList.add('slot-kind-empty');
            }

            btn.draggable = Boolean(binding);
            btn.title = title;
            btn.innerHTML = `<span class="slot-icon">${icon}</span><span class="slot-key">${keyLabel}</span>`;
        });
    }

    pruneInvalidHotbarItems() {
        const itemIds = new Set(this.inventory.map((it) => String(it.id)));
        for (const key of Object.keys(this.hotbarBindings)) {
            const binding = this.hotbarBindings[key];
            if (!binding || binding.type !== 'item') continue;
            if (!itemIds.has(String(binding.itemId))) this.hotbarBindings[key] = null;
        }
    }

    handleHotbarDrop(targetKey, payload) {
        if (!targetKey) return;
        if (payload.source === 'skillbar' && payload.key) {
            const fromKey = String(payload.key).toLowerCase();
            if (!Object.prototype.hasOwnProperty.call(this.hotbarBindings, fromKey) || !Object.prototype.hasOwnProperty.call(this.hotbarBindings, targetKey)) return;
            const fromBinding = this.normalizeHotbarBinding(this.hotbarBindings[fromKey]);
            const toBinding = this.normalizeHotbarBinding(this.hotbarBindings[targetKey]);
            this.hotbarBindings[targetKey] = fromBinding;
            this.hotbarBindings[fromKey] = toBinding;
            this.renderHotbar();
            return;
        }

        const itemId = payload.itemId ? String(payload.itemId) : '';
        if (!itemId) return;
        const currentTarget = this.hotbarBindings[targetKey];
        if (currentTarget?.type === 'action' && currentTarget.actionId === 'basic_attack') {
            this.onSystemMessage({ text: 'Mova o Ataque Basico para outro slot antes de colocar item aqui.' });
            return;
        }
        const item = this.inventory.find((it) => String(it.id) === itemId);
        if (!item) return;
        this.hotbarBindings[targetKey] = { type: 'item', itemId };
        this.renderHotbar();
    }

    writeDragPayload(dataTransfer, payload) {
        if (!dataTransfer) return;
        try {
            dataTransfer.setData('application/x-noxis-drag', JSON.stringify(payload));
        } catch {
            // noop
        }
        if (payload?.itemId) dataTransfer.setData('text/plain', String(payload.itemId));
        dataTransfer.effectAllowed = 'move';
    }

    readDragPayload(dataTransfer) {
        if (!dataTransfer) return null;
        const raw = dataTransfer.getData('application/x-noxis-drag');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch {
                // noop
            }
        }
        const itemId = dataTransfer.getData('text/plain');
        if (itemId) return { source: 'inventory', itemId: String(itemId) };
        return null;
    }

    normalizeAllocatedStats(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const toInt = (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return 0;
            return Math.max(0, Math.floor(parsed));
        };
        return {
            physicalAttack: toInt(source.physicalAttack),
            magicAttack: toInt(source.magicAttack),
            physicalDefense: toInt(source.physicalDefense),
            magicDefense: toInt(source.magicDefense)
        };
    }

    resetPendingStatAllocation() {
        this.statAllocationPending = {
            physicalAttack: 0,
            magicAttack: 0,
            physicalDefense: 0,
            magicDefense: 0
        };
    }

    getPendingStatAllocationTotal() {
        return Number(this.statAllocationPending.physicalAttack || 0)
            + Number(this.statAllocationPending.magicAttack || 0)
            + Number(this.statAllocationPending.physicalDefense || 0)
            + Number(this.statAllocationPending.magicDefense || 0);
    }

    /**
     * Cria estado local interpolável de um player.
     */
    createPlayerState(player) {
        const normalizedAllocated = this.normalizeAllocatedStats(player.allocatedStats);
        const unspentPoints = Number.isFinite(Number(player.unspentPoints)) ? Math.max(0, Number(player.unspentPoints)) : 0;
        return {
            ...player,
            pvpMode: player.pvpMode === 'evil' ? 'evil' : player.pvpMode === 'group' ? 'group' : 'peace',
            dead: Boolean(player.dead),
            allocatedStats: normalizedAllocated,
            unspentPoints,
            x: player.x,
            y: player.y,
            targetX: player.x,
            targetY: player.y,
            hitAnim: null,
            attackAnim: null,
            pathNodes: Array.isArray(player.pathNodes) ? player.pathNodes : [],
            facing: 's',
            animMs: 0,
            animLastAt: Date.now(),
            animLastX: player.x,
            animLastY: player.y
        };
    }

    /**
     * Cria estado local interpolável de um mob.
     */
    createMobState(mob) {
        return { ...mob, x: mob.x, y: mob.y, targetX: mob.x, targetY: mob.y, hitAnim: null };
    }

    /**
     * Atualiza estado completo do mundo recebido do servidor.
     */
    updateWorld(message) {
        if (message.world) {
            this.mapWidth = message.world.width;
            this.mapHeight = message.world.height;
            this.ensureForestMap();
        }
        if (message.mapCode) {
            this.currentMapCode = message.mapCode;
            if (this.mapCodeLabel) this.mapCodeLabel.textContent = `Mapa ${this.currentMapCode}`;
        }
        if (message.mapId) {
            this.currentMapId = message.mapId;
            const hasOption = [...this.instanceSelect.options].some((option) => option.value === message.mapId);
            if (!hasOption) {
                const option = document.createElement('option');
                option.value = message.mapId;
                option.textContent = message.mapId;
                this.instanceSelect.appendChild(option);
            }
            this.instanceSelect.value = message.mapId;
        }
        if (message.mapKey) this.currentMapKey = message.mapKey;
        if (message.mapTheme) this.currentMapTheme = message.mapTheme;
        this.mapFeatures = Array.isArray(message.mapFeatures) ? message.mapFeatures : [];
        this.mapPortals = Array.isArray(message.portals) ? message.portals : [];
        this.ensureForestMap();

        this.syncPlayers(message.players || {});
        this.syncMobs(message.mobs || []);
        this.syncGroundItems(message.groundItems || []);
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
    }

    /**
     * Sincroniza jogadores (add/update/remove) a partir do snapshot do servidor.
     */
    syncPlayers(serverPlayers) {
        for (const id of Object.keys(this.players)) {
            if (!serverPlayers[id]) delete this.players[id];
        }
        if (this.selectedPlayerId && !serverPlayers[this.selectedPlayerId]) {
            this.clearPlayerTarget();
        }

        for (const id of Object.keys(serverPlayers)) {
            const incoming = serverPlayers[id];
            if (!this.players[id]) {
                this.players[id] = this.createPlayerState(incoming);
                continue;
            }

            const p = this.players[id];
            p.name = incoming.name;
            p.class = incoming.class;
            p.gender = incoming.gender;
            p.role = incoming.role || p.role || 'player';
            p.level = Number.isFinite(Number(incoming.level)) ? Number(incoming.level) : p.level;
            p.hp = Number.isFinite(Number(incoming.hp)) ? Number(incoming.hp) : p.hp;
            p.maxHp = Number.isFinite(Number(incoming.maxHp)) ? Number(incoming.maxHp) : p.maxHp;
            p.pvpMode = incoming.pvpMode === 'evil' ? 'evil' : incoming.pvpMode === 'group' ? 'group' : p.pvpMode || 'peace';
            p.dead = Boolean(incoming.dead || p.hp <= 0);
            p.xp = incoming.xp;
            p.xpToNext = incoming.xpToNext;
            p.equippedWeaponName = incoming.equippedWeaponName || null;
            p.stats = incoming.stats;
            p.allocatedStats = this.normalizeAllocatedStats(incoming.allocatedStats);
            p.unspentPoints = Number.isFinite(Number(incoming.unspentPoints)) ? Math.max(0, Number(incoming.unspentPoints)) : 0;
            p.pathNodes = Array.isArray(incoming.pathNodes) ? incoming.pathNodes : [];
            p.targetX = incoming.x;
            p.targetY = incoming.y;

            if (String(id) === String(this.localId)) {
                this.playerRole = p.role === 'adm' ? 'adm' : 'player';
                const nowDead = Boolean(p.dead || p.hp <= 0);
                this.isDead = nowDead;
                this.reviveOverlay.classList.toggle('hidden', !nowDead);
                this.updateAdminMapSettings();
            }
        }
    }

    /**
     * Sincroniza mobs (add/update/remove) a partir do snapshot do servidor.
     */
    syncMobs(serverMobs) {
        const incomingIds = new Set();
        for (const mob of serverMobs) {
            incomingIds.add(mob.id);
            if (!this.mobs[mob.id]) {
                this.mobs[mob.id] = this.createMobState(mob);
                continue;
            }

            const localMob = this.mobs[mob.id];
            localMob.hp = mob.hp;
            localMob.maxHp = mob.maxHp;
            localMob.targetX = mob.x;
            localMob.targetY = mob.y;
            localMob.size = mob.size;
            localMob.color = mob.color;
            localMob.kind = mob.kind;
        }

        for (const id of Object.keys(this.mobs)) {
            if (!incomingIds.has(id)) delete this.mobs[id];
        }

        if (this.selectedMobId && !this.mobs[this.selectedMobId]) this.selectedMobId = null;
        if (this.hoveredMobId && !this.mobs[this.hoveredMobId]) this.hoveredMobId = null;
    }

    /**
     * Sincroniza drops no chão.
     */
    syncGroundItems(serverItems) {
        this.groundItems = {};
        for (const item of serverItems) {
            this.groundItems[item.id] = item;
        }
    }

    /**
     * Renderiza lista do inventário com ação de equipar/remover.
     */
    renderInventory() {
        if (this.inventoryPanel.classList.contains('hidden')) return;
        this.inventoryGrid.innerHTML = '';
        const equipped = this.inventory.find((it) => it.id === this.equippedWeaponId);
        this.inventoryEquippedLabel.textContent = equipped ? `Arma equipada: ${equipped.name}` : 'Arma equipada: nenhuma';

        const visibleItems = this.inventory.filter((it) => it.id !== this.equippedWeaponId);
        const bySlot = new Map(visibleItems.map((it) => [it.slotIndex, it]));
        for (let slot = 0; slot < 36; slot++) {
            const slotEl = document.createElement('div');
            slotEl.className = 'inv-slot';
            slotEl.dataset.slot = String(slot);

            slotEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                slotEl.classList.add('hovered');
            });
            slotEl.addEventListener('dragleave', () => slotEl.classList.remove('hovered'));
            slotEl.addEventListener('drop', (e) => {
                e.preventDefault();
                slotEl.classList.remove('hovered');
                const payload = this.readDragPayload(e.dataTransfer);
                const itemId = payload?.itemId ? String(payload.itemId) : '';
                if (!itemId) return;
                this.closeAllTooltips('inventory_drop');
                if (this.draggingEquippedWeapon && this.draggingEquippedWeapon === itemId) {
                    this.network.send({ type: 'inventory_unequip_to_slot', itemId, toSlot: slot });
                } else {
                    this.network.send({ type: 'inventory_move', itemId, toSlot: slot });
                }
            });

            const item = bySlot.get(slot);
            if (item) {
                const itemEl = document.createElement('div');
                itemEl.className = `inv-item item-type-${String(item.type || 'generic')}`;
                if (item.id === this.equippedWeaponId) itemEl.style.borderColor = '#27ae60';
                itemEl.draggable = true;
                itemEl.textContent = item.name;
                const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
                if (quantity > 1) {
                    const qtyEl = document.createElement('div');
                    qtyEl.className = 'inv-item-qty';
                    qtyEl.textContent = String(quantity);
                    itemEl.appendChild(qtyEl);
                }
                if (String(item.type || '') === 'potion_hp') {
                    itemEl.title = `${item.name}\nRecupera 50% do HP ao usar.\nQtd: ${quantity}`;
                } else {
                    itemEl.title = `${item.name}\nPATK +${item.bonuses?.physicalAttack || 0}\nMATK +${item.bonuses?.magicAttack || 0}\nMS +${item.bonuses?.moveSpeed || 0}\nASPD +${item.bonuses?.attackSpeed || 0}%`;
                }
                itemEl.addEventListener('dblclick', () => {
                    if (String(item.type || '') !== 'weapon') return;
                    this.closeAllTooltips('item_equipped');
                    this.network.send({ type: 'equip_item', itemId: item.id === this.equippedWeaponId ? null : item.id });
                });
                itemEl.addEventListener('mousemove', (e) => {
                    this.openItemTooltip(item, e.clientX, e.clientY, 'hover');
                });
                itemEl.addEventListener('mouseleave', () => {
                    this.scheduleTooltipClose();
                });
                itemEl.addEventListener('dragstart', (e) => {
                    this.closeAllTooltips('inventory_drag_start');
                    this.inventoryDrag = { itemId: item.id };
                    itemEl.classList.add('dragging');
                    this.writeDragPayload(e.dataTransfer, { source: 'inventory', itemId: item.id });
                });
                itemEl.addEventListener('dragend', (e) => {
                    itemEl.classList.remove('dragging');
                    const x = e.clientX;
                    const y = e.clientY;
                    const target = document.elementFromPoint(x, y);
                    const droppedInside = Boolean(
                        target && target.closest && (
                            target.closest('#inventory-grid')
                            || target.closest('#char-panel')
                            || target.closest('#skillbar-wrap')
                        )
                    );
                    if (!droppedInside && this.inventoryDrag?.itemId === item.id) {
                        this.pendingDeleteItemId = item.id;
                        this.deleteConfirm.classList.remove('hidden');
                    }
                    this.inventoryDrag = null;
                });
                slotEl.appendChild(itemEl);
            }

            this.inventoryGrid.appendChild(slotEl);
        }
    }

    /**
     * Exibe tooltip do item no cursor.
     */
    openItemTooltip(item, clientX, clientY, reason = 'hover') {
        this.cancelTooltipTimers();
        this.tooltipState.activeTooltipId = item.id;
        this.tooltipState.lastOpenReason = reason;
        if (String(item.type || '') === 'potion_hp') {
            const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
            this.tooltip.innerHTML = `
                <div><strong>${item.name}</strong></div>
                <div>Consumivel</div>
                <div>Restaura 50% do HP</div>
                <div>Qtd: ${quantity}</div>
            `;
        } else {
            this.tooltip.innerHTML = `
                <div><strong>${item.name}</strong></div>
                <div>PATK: +${item.bonuses?.physicalAttack || 0}</div>
                <div>MATK: +${item.bonuses?.magicAttack || 0}</div>
                <div>MSPD: +${item.bonuses?.moveSpeed || 0}</div>
                <div>ASPD: +${item.bonuses?.attackSpeed || 0}%</div>
            `;
        }
        this.tooltip.style.left = `${clientX + 12}px`;
        this.tooltip.style.top = `${clientY + 12}px`;
        this.tooltip.classList.remove('hidden');
    }

    scheduleTooltipClose() {
        this.cancelTooltipTimers();
        this.tooltipState.hoverCloseTimer = setTimeout(() => {
            this.closeAllTooltips('hover_leave');
        }, 0);
    }

    cancelTooltipTimers() {
        if (this.tooltipState.hoverOpenTimer) {
            clearTimeout(this.tooltipState.hoverOpenTimer);
            this.tooltipState.hoverOpenTimer = null;
        }
        if (this.tooltipState.hoverCloseTimer) {
            clearTimeout(this.tooltipState.hoverCloseTimer);
            this.tooltipState.hoverCloseTimer = null;
        }
    }

    closeAllTooltips(reason = 'hard_close') {
        this.cancelTooltipTimers();
        this.tooltipState.activeTooltipId = null;
        this.tooltipState.anchorElementId = null;
        this.tooltipState.isPinned = false;
        this.tooltipState.lastOpenReason = reason;
        this.tooltip.classList.add('hidden');
    }

    /**
     * Interpola movimento de entidades para renderização suave.
     */
    smoothEntities() {
        const lerp = 0.2;
        const snap = 0.4;

        for (const id of Object.keys(this.players)) {
            const p = this.players[id];
            p.x += (p.targetX - p.x) * lerp;
            p.y += (p.targetY - p.y) * lerp;
            if (Math.abs(p.targetX - p.x) < snap) p.x = p.targetX;
            if (Math.abs(p.targetY - p.y) < snap) p.y = p.targetY;
        }

        for (const id of Object.keys(this.mobs)) {
            const m = this.mobs[id];
            m.x += (m.targetX - m.x) * lerp;
            m.y += (m.targetY - m.y) * lerp;
            if (Math.abs(m.targetX - m.x) < snap) m.x = m.targetX;
            if (Math.abs(m.targetY - m.y) < snap) m.y = m.targetY;
        }
    }

    /**
     * Renderiza painel de atributos em linhas separadas.
     */
    updatePanel() {
        if (this.panel.classList.contains('hidden')) return;
        if (!this.localId || !this.players[this.localId]) return;
        const p = this.players[this.localId];

        this.applyClassAvatar(this.panelClassChip, p.class);
        this.charPanelName.textContent = `${p.name} - ${p.class}`;

        const weaponSlot = this.panel.querySelector('.equip-slot[data-slot="weapon"]');
        const allSlots = this.panel.querySelectorAll('.equip-slot');
        const slotLabels = {
            helmet: 'Capacete',
            chest: 'Peitoral',
            pants: 'Calca',
            gloves: 'Luva',
            boots: 'Bota',
            ring: 'Anel',
            weapon: 'Arma',
            necklace: 'Colar'
        };
        allSlots.forEach((slot) => {
            slot.classList.remove('filled');
            slot.textContent = slotLabels[slot.dataset.slot] || slot.dataset.slot;
        });
        if (p.equippedWeaponName && weaponSlot) {
            weaponSlot.classList.add('filled');
            weaponSlot.textContent = p.equippedWeaponName;
            weaponSlot.draggable = true;
            weaponSlot.ondragstart = (e) => {
                const equipped = this.inventory.find((it) => it.id === this.equippedWeaponId);
                if (!equipped) return;
                this.draggingEquippedWeapon = equipped.id;
                this.writeDragPayload(e.dataTransfer, { source: 'equipment', itemId: equipped.id });
            };
            weaponSlot.ondragend = () => {
                this.draggingEquippedWeapon = null;
            };
        } else if (weaponSlot) {
            weaponSlot.draggable = false;
            weaponSlot.ondragstart = null;
            weaponSlot.ondragend = null;
        }
        if (weaponSlot) {
            weaponSlot.ondragover = (e) => {
                e.preventDefault();
                weaponSlot.classList.add('hovered');
            };
            weaponSlot.ondragleave = () => {
                weaponSlot.classList.remove('hovered');
            };
            weaponSlot.ondrop = (e) => {
                e.preventDefault();
                weaponSlot.classList.remove('hovered');
                const payload = this.readDragPayload(e.dataTransfer);
                const itemId = payload?.itemId ? String(payload.itemId) : '';
                if (!itemId) return;
                const item = this.inventory.find((it) => String(it.id) === itemId);
                if (!item || String(item.type || '') !== 'weapon') return;
                this.closeAllTooltips('item_equipped');
                this.network.send({ type: 'equip_item', itemId });
            };
        }

        if (this.panel) {
            this.panel.ondragover = (e) => {
                e.preventDefault();
            };
            this.panel.ondrop = (e) => {
                const target = e.target;
                if (target && target.closest && target.closest('.equip-slot[data-slot="weapon"]')) return;
                e.preventDefault();
                const payload = this.readDragPayload(e.dataTransfer);
                const itemId = payload?.itemId ? String(payload.itemId) : '';
                if (!itemId) return;
                const item = this.inventory.find((it) => String(it.id) === itemId);
                if (!item || String(item.type || '') !== 'weapon') return;
                this.closeAllTooltips('item_equipped');
                this.network.send({ type: 'equip_item', itemId });
            };
        }

        this.panelBody.innerHTML = '';
        const baseRows = [
            `Nivel: ${p.level}`,
            `XP: ${p.xp}/${p.xpToNext}`,
            `HP: ${p.hp}/${p.maxHp}`
        ];
        for (const line of baseRows) {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = line;
            this.panelBody.appendChild(div);
        }

        const remainingPoints = Math.max(0, Number(p.unspentPoints || 0) - this.getPendingStatAllocationTotal());
        const unspentLine = document.createElement('div');
        unspentLine.className = 'line stat-points-line';
        unspentLine.textContent = `Pontos disponiveis: ${remainingPoints}`;
        this.panelBody.appendChild(unspentLine);

        const statRows = [
            { key: 'physicalAttack', label: 'PATK', value: Number(p.stats.physicalAttack || 0) },
            { key: 'magicAttack', label: 'MATK', value: Number(p.stats.magicAttack || 0) },
            { key: 'physicalDefense', label: 'PDEF', value: Number(p.stats.physicalDefense || 0) },
            { key: 'magicDefense', label: 'MDEF', value: Number(p.stats.magicDefense || 0) }
        ];
        for (const row of statRows) {
            const wrap = document.createElement('div');
            wrap.className = 'line stat-row';

            const pending = Number(this.statAllocationPending[row.key] || 0);
            const previewValue = row.value + pending;
            const valueLabel = document.createElement('span');
            valueLabel.textContent = `${row.label}: ${previewValue}`;
            wrap.appendChild(valueLabel);

            const controls = document.createElement('div');
            controls.className = 'stat-controls';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'stat-add-btn';
            removeBtn.type = 'button';
            removeBtn.textContent = '-';
            removeBtn.disabled = pending <= 0;
            removeBtn.addEventListener('click', () => {
                const currentPending = Number(this.statAllocationPending[row.key] || 0);
                if (currentPending <= 0) return;
                this.statAllocationPending[row.key] = currentPending - 1;
                this.updatePanel();
            });
            controls.appendChild(removeBtn);

            const addBtn = document.createElement('button');
            addBtn.className = 'stat-add-btn';
            addBtn.type = 'button';
            addBtn.textContent = '+';
            addBtn.disabled = remainingPoints <= 0;
            addBtn.addEventListener('click', () => {
                if (!this.localId || !this.players[this.localId]) return;
                const me = this.players[this.localId];
                const currentRemaining = Math.max(0, Number(me.unspentPoints || 0) - this.getPendingStatAllocationTotal());
                if (currentRemaining <= 0) return;
                this.statAllocationPending[row.key] = Number(this.statAllocationPending[row.key] || 0) + 1;
                this.updatePanel();
            });
            controls.appendChild(addBtn);
            wrap.appendChild(controls);
            this.panelBody.appendChild(wrap);
        }

        const extraRows = [
            `MSPD: ${p.stats.moveSpeed}`,
            `ASPD: ${p.stats.attackSpeed}%`,
            `RANGE: ${p.stats.attackRange}`
        ];
        for (const line of extraRows) {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = line;
            this.panelBody.appendChild(div);
        }

        const applyWrap = document.createElement('div');
        applyWrap.className = 'line stat-actions';
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = 'Aplicar';
        const pendingTotal = this.getPendingStatAllocationTotal();
        applyBtn.disabled = pendingTotal <= 0;
        applyBtn.addEventListener('click', () => {
            const total = this.getPendingStatAllocationTotal();
            if (total <= 0) return;
            this.network.send({
                type: 'stats.allocate',
                allocation: { ...this.statAllocationPending }
            });
        });
        applyWrap.appendChild(applyBtn);

        if (pendingTotal > 0) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Limpar';
            cancelBtn.addEventListener('click', () => {
                this.resetPendingStatAllocation();
                this.updatePanel();
            });
            applyWrap.appendChild(cancelBtn);
        }

        this.panelBody.appendChild(applyWrap);
    }

    /**
     * Atualiza card de vida/nome do jogador local.
     */
    updatePlayerCard() {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        this.applyClassAvatar(this.playerAvatar, me.class);
        this.playerName.textContent = me.name;
        const mode = me.pvpMode === 'evil' ? 'evil' : me.pvpMode === 'group' ? 'group' : 'peace';
        this.playerPvpToggle.textContent = mode === 'evil' ? 'Mal' : mode === 'group' ? 'Grupo' : 'Paz';
        this.playerPvpToggle.classList.toggle('active-danger', mode === 'evil');
        this.playerPvpToggle.classList.toggle('active-group', mode === 'group');
        this.playerPvpOptions.forEach((btn) => {
            btn.classList.toggle('active', String(btn.dataset.mode || '') === mode);
        });
        const hpPercent = me.maxHp > 0 ? me.hp / me.maxHp : 0;
        this.playerHpFill.style.width = `${Math.max(0, Math.min(1, hpPercent)) * 100}%`;
        this.playerHpText.textContent = `HP: ${me.hp}/${me.maxHp}`;
    }

    updateTargetPlayerCard() {
        if (!this.selectedPlayerId || !this.players[this.selectedPlayerId]) {
            this.targetPlayerCard.classList.add('hidden');
            return;
        }
        const target = this.players[this.selectedPlayerId];
        const hpPercent = target.maxHp > 0 ? target.hp / target.maxHp : 0;
        this.applyClassAvatar(this.targetPlayerAvatar, target.class);
        this.targetPlayerHpFill.style.width = `${Math.max(0, Math.min(1, hpPercent)) * 100}%`;

        const hasParty = Boolean(this.partyState);
        const isLeader = Boolean(this.partyState && Number(this.partyState.leaderId) === Number(this.localId));
        const sameParty = Boolean(
            this.partyState &&
            Array.isArray(this.partyState.members) &&
            this.partyState.members.some((m) => Number(m.playerId) === Number(target.id))
        );
        this.targetInviteBtn.disabled = sameParty;
        this.targetInviteBtn.title = !hasParty
            ? 'Voce nao esta em grupo.'
            : (!isLeader ? 'Somente o lider pode convidar.' : (sameParty ? 'Jogador ja esta no seu grupo.' : 'Convidar para grupo'));
        this.targetPlayerCard.classList.remove('hidden');
    }

    renderPartyPanel() {
        const party = this.partyState;
        if (!party) {
            this.partyMyMeta.textContent = 'Voce nao esta em grupo.';
            this.partyMembers.innerHTML = '';
            this.partyLeaveBtn.disabled = true;
            this.partyMyLeaveWrap.classList.add('hidden');
            this.partyMyInviteWrap.classList.add('hidden');
        } else {
            const leader = party.members.find((m) => m.role === 'leader');
            const isLeader = Number(party.leaderId) === Number(this.localId);
            this.partyMyMeta.textContent = `Grupo ${party.id.slice(0, 8)} | Lider: ${leader?.name || '-'} | ${party.members.length}/${party.maxMembers}`;
            this.partyLeaveBtn.disabled = false;
            this.partyMyLeaveWrap.classList.remove('hidden');
            this.partyMyInviteWrap.classList.toggle('hidden', !isLeader);
            this.partyMembers.innerHTML = '';
            for (const member of party.members) {
                const row = document.createElement('div');
                row.className = 'party-member-row';
                row.innerHTML = `<div>${member.role === 'leader' ? '[L] ' : ''}${member.name} (Lv.${member.level})</div><div>HP ${member.hp}/${member.maxHp}</div>`;
                if (party.leaderId === this.localId && member.playerId !== this.localId) {
                    const actions = document.createElement('div');
                    actions.className = 'party-member-actions';
                    const kickBtn = document.createElement('button');
                    kickBtn.textContent = 'Expulsar';
                    kickBtn.addEventListener('click', () => this.network.send({ type: 'party.kick', targetPlayerId: member.playerId }));
                    const promoteBtn = document.createElement('button');
                    promoteBtn.textContent = 'Promover';
                    promoteBtn.addEventListener('click', () => this.network.send({ type: 'party.promote', targetPlayerId: member.playerId }));
                    actions.appendChild(kickBtn);
                    actions.appendChild(promoteBtn);
                    row.appendChild(actions);
                }
                this.partyMembers.appendChild(row);
            }
        }

        const query = this.partyAreaSearch.value.trim().toLowerCase();
        const filteredParties = this.partyAreaParties.filter((p) => {
            if (!query) return true;
            const leader = String(p.leaderName || '').toLowerCase();
            const partyIdShort = String(p.partyId || '').slice(0, 8).toLowerCase();
            return leader.includes(query) || partyIdShort.includes(query);
        });

        this.partyAreaList.innerHTML = '';
        for (const p of filteredParties) {
            const row = document.createElement('div');
            row.className = 'party-area-row';
            if (p.partyId === this.selectedAreaPartyId) row.classList.add('selected');
            row.innerHTML = `<div>Lider: ${p.leaderName}</div><div>Membros: ${p.members}/${p.maxMembers} | Lv medio: ${p.avgLevel}</div>`;
            row.addEventListener('click', () => {
                this.selectedAreaPartyId = p.partyId;
                this.renderPartyPanel();
            });
            this.partyAreaList.appendChild(row);
        }
        const selectionVisible = filteredParties.some((p) => p.partyId === this.selectedAreaPartyId);
        if (!selectionVisible) this.selectedAreaPartyId = null;
        const canRequestJoin = Boolean(this.selectedAreaPartyId) && !this.partyState;
        this.partyRequestWrap.classList.toggle('hidden', !canRequestJoin);
        this.partyRequestJoinBtn.disabled = !canRequestJoin;
        this.partyCreateWrap.classList.toggle('hidden', Boolean(this.partyState));
        this.partyCreateBtn.disabled = Boolean(this.partyState);
        this.partyInviteBtn.disabled = !Boolean(this.partyState);
    }

    renderPartyFrames() {
        const party = this.partyState;
        if (!party || !party.members || party.members.length <= 1) {
            this.partyFrames.classList.add('hidden');
            this.partyFrames.innerHTML = '';
            return;
        }

        this.partyFrames.classList.remove('hidden');
        this.partyFrames.innerHTML = '';
        for (const member of party.members) {
            if (member.playerId === this.localId) continue;
            const wrap = document.createElement('div');
            wrap.className = 'party-frame';
            const hpPercent = member.maxHp > 0 ? member.hp / member.maxHp : 0;
            wrap.innerHTML = `
                <div class="party-frame-top">
                    <div class="party-frame-avatar class-avatar class-${member.class || 'knight'}">${this.getClassIcon(member.class)}</div>
                    <div class="party-frame-meta">
                        <div class="party-frame-name">${member.role === 'leader' ? '[L] ' : ''}${member.name} Lv.${member.level}</div>
                        <div class="party-frame-hp"><div class="party-frame-hp-fill" style="width:${Math.max(0, Math.min(1, hpPercent)) * 100}%"></div></div>
                    </div>
                </div>
            `;
            this.partyFrames.appendChild(wrap);
        }
    }

    renderPartyNotifications() {
        if (this.partyNotifyExpiryTimer) {
            clearTimeout(this.partyNotifyExpiryTimer);
            this.partyNotifyExpiryTimer = null;
        }
        const now = Date.now();
        this.pendingPartyInvites = this.pendingPartyInvites.filter((it) => it.expiresAt > now);
        this.pendingPartyJoinRequests = this.pendingPartyJoinRequests.filter((it) => it.expiresAt > now);
        const hasAny = this.pendingPartyInvites.length > 0 || this.pendingPartyJoinRequests.length > 0;
        this.partyNotifications.classList.toggle('hidden', !hasAny);
        this.partyNotificationsList.innerHTML = '';
        if (!hasAny) return;

        for (const invite of this.pendingPartyInvites) {
            const row = document.createElement('div');
            row.className = 'party-notify-row';
            row.innerHTML = `<div>Convite de grupo: ${invite.fromName}</div>`;
            const actions = document.createElement('div');
            actions.className = 'party-notify-actions';
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Aceitar';
            acceptBtn.addEventListener('click', () => this.resolvePartyInvite(invite, true));
            const declineBtn = document.createElement('button');
            declineBtn.textContent = 'Recusar';
            declineBtn.addEventListener('click', () => this.resolvePartyInvite(invite, false));
            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);
            row.appendChild(actions);
            this.partyNotificationsList.appendChild(row);
        }

        for (const req of this.pendingPartyJoinRequests) {
            const row = document.createElement('div');
            row.className = 'party-notify-row';
            row.innerHTML = `<div>Solicitacao de entrada: ${req.fromName}</div>`;
            const actions = document.createElement('div');
            actions.className = 'party-notify-actions';
            const approveBtn = document.createElement('button');
            approveBtn.textContent = 'Aprovar';
            approveBtn.addEventListener('click', () => this.resolvePartyJoinRequest(req, true));
            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = 'Recusar';
            rejectBtn.addEventListener('click', () => this.resolvePartyJoinRequest(req, false));
            actions.appendChild(approveBtn);
            actions.appendChild(rejectBtn);
            row.appendChild(actions);
            this.partyNotificationsList.appendChild(row);
        }

        const nextExpiry = this.findNextPartyNotificationExpiry();
        if (nextExpiry) {
            const delay = Math.max(100, nextExpiry - Date.now() + 20);
            this.partyNotifyExpiryTimer = setTimeout(() => this.renderPartyNotifications(), delay);
        }
    }

    renderFriendsPanel() {
        const state = this.friendsState || { friends: [], incoming: [], outgoing: [] };

        this.friendsList.innerHTML = '';
        if (!state.friends.length) {
            const empty = document.createElement('div');
            empty.className = 'friend-row';
            empty.textContent = 'Sem amigos ainda.';
            this.friendsList.appendChild(empty);
        } else {
            for (const f of state.friends) {
                const row = document.createElement('div');
                row.className = 'friend-row';
                row.innerHTML = `<div>${f.name}</div><div>${f.online ? 'Online' : 'Offline'}</div>`;
                const actions = document.createElement('div');
                actions.className = 'party-member-actions';
                const selectBtn = document.createElement('button');
                selectBtn.textContent = 'Selecionar';
                selectBtn.disabled = !f.online;
                selectBtn.addEventListener('click', () => {
                    const runtimeId = String(f.playerId);
                    if (!this.players[runtimeId]) {
                        this.onSystemMessage({ text: `${f.name} nao esta visivel nesta area.` });
                        return;
                    }
                    this.selectPlayerTarget(runtimeId);
                });
                const inviteBtn = document.createElement('button');
                inviteBtn.textContent = 'Convidar';
                inviteBtn.disabled = !f.online;
                inviteBtn.addEventListener('click', () => {
                    this.network.send({ type: 'party.invite', targetName: f.name });
                });
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remover';
                removeBtn.addEventListener('click', () => this.network.send({ type: 'friend.remove', friendPlayerId: f.playerId }));
                actions.appendChild(selectBtn);
                actions.appendChild(inviteBtn);
                actions.appendChild(removeBtn);
                row.appendChild(actions);
                this.friendsList.appendChild(row);
            }
        }

        this.friendsIncomingList.innerHTML = '';
        if (!state.incoming.length) {
            const emptyIn = document.createElement('div');
            emptyIn.className = 'friend-row';
            emptyIn.textContent = 'Sem pedidos recebidos.';
            this.friendsIncomingList.appendChild(emptyIn);
        } else {
            for (const req of state.incoming) {
                const row = document.createElement('div');
                row.className = 'friend-row';
                row.innerHTML = `<div>Pedido de: ${req.fromName}</div>`;
                const actions = document.createElement('div');
                actions.className = 'party-member-actions';
                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Aceitar';
                acceptBtn.addEventListener('click', () => this.network.send({ type: 'friend.accept', requestId: req.requestId }));
                const declineBtn = document.createElement('button');
                declineBtn.textContent = 'Recusar';
                declineBtn.addEventListener('click', () => this.network.send({ type: 'friend.decline', requestId: req.requestId }));
                actions.appendChild(acceptBtn);
                actions.appendChild(declineBtn);
                row.appendChild(actions);
                this.friendsIncomingList.appendChild(row);
            }
        }

        this.friendsOutgoingList.innerHTML = '';
        if (!state.outgoing.length) {
            const emptyOut = document.createElement('div');
            emptyOut.className = 'friend-row';
            emptyOut.textContent = 'Sem pedidos enviados.';
            this.friendsOutgoingList.appendChild(emptyOut);
        } else {
            for (const req of state.outgoing) {
                const row = document.createElement('div');
                row.className = 'friend-row';
                row.textContent = `Aguardando: ${req.toName}`;
                this.friendsOutgoingList.appendChild(row);
            }
        }
    }

    renderFriendNotifications() {
        if (this.friendNotifyExpiryTimer) {
            clearTimeout(this.friendNotifyExpiryTimer);
            this.friendNotifyExpiryTimer = null;
        }

        const state = this.friendsState || { incoming: [] };
        const now = Date.now();
        const incoming = (state.incoming || []).filter((req) => Number(req.expiresAt || 0) > now);
        this.friendsNotifications.classList.toggle('hidden', incoming.length === 0);
        this.friendsNotificationsList.innerHTML = '';
        if (!incoming.length) return;

        for (const req of incoming) {
            const row = document.createElement('div');
            row.className = 'party-notify-row';
            row.innerHTML = `<div>Pedido de amizade: ${req.fromName}</div>`;
            const actions = document.createElement('div');
            actions.className = 'party-notify-actions';
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Aceitar';
            acceptBtn.addEventListener('click', () => this.network.send({ type: 'friend.accept', requestId: req.requestId }));
            const declineBtn = document.createElement('button');
            declineBtn.textContent = 'Recusar';
            declineBtn.addEventListener('click', () => this.network.send({ type: 'friend.decline', requestId: req.requestId }));
            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);
            row.appendChild(actions);
            this.friendsNotificationsList.appendChild(row);
        }

        let nextExpiry = null;
        for (const req of incoming) {
            const exp = Number(req.expiresAt || 0);
            if (!nextExpiry || exp < nextExpiry) nextExpiry = exp;
        }
        if (nextExpiry) {
            const delay = Math.max(100, nextExpiry - Date.now() + 20);
            this.friendNotifyExpiryTimer = setTimeout(() => this.renderFriendNotifications(), delay);
        }
    }

    findNextPartyNotificationExpiry() {
        let next = null;
        for (const invite of this.pendingPartyInvites) {
            if (!next || invite.expiresAt < next) next = invite.expiresAt;
        }
        for (const req of this.pendingPartyJoinRequests) {
            if (!next || req.expiresAt < next) next = req.expiresAt;
        }
        return next;
    }

    buildPartyPanelSignature(party) {
        if (!party) return 'none';
        const members = Array.isArray(party.members) ? party.members.map((m) => `${m.playerId}:${m.role}`).join('|') : '';
        return `${party.id}|${party.leaderId}|${party.maxMembers}|${members}`;
    }

    pruneExpiredPartyWaypoints(now = Date.now()) {
        this.partyWaypoints = this.partyWaypoints.filter((it) => Number(it.expiresAt) > now);
    }

    drawPlannedPathOnPreview(ctx, worldRect, sx, sy) {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        const nodes = Array.isArray(me.pathNodes) && me.pathNodes.length
            ? me.pathNodes
            : Array.isArray(this.lastMoveAck?.pathNodes)
                ? this.lastMoveAck.pathNodes
                : [];
        if (!nodes.length) return;
        const points = [{ x: me.x, y: me.y }, ...nodes];
        ctx.strokeStyle = 'rgba(123, 230, 255, 0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (const point of points) {
            const px = (point.x - worldRect.x) * sx;
            const py = (point.y - worldRect.y) * sy;
            if (!started) {
                ctx.moveTo(px, py);
                started = true;
                continue;
            }
            ctx.lineTo(px, py);
        }
        if (started) ctx.stroke();
    }

    drawDebugPathOnPreview(ctx, worldRect, sx, sy) {
        if (!this.pathDebugEnabled || this.playerRole !== 'adm') return;
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];

        for (const feature of this.mapFeatures || []) {
            if (!feature || !feature.collision) continue;
            ctx.strokeStyle = 'rgba(255, 70, 70, 0.95)';
            ctx.lineWidth = 1;
            if (feature.shape === 'rect') {
                const x = (Number(feature.x) - worldRect.x) * sx;
                const y = (Number(feature.y) - worldRect.y) * sy;
                const w = Number(feature.w) * sx;
                const h = Number(feature.h) * sy;
                ctx.strokeRect(x, y, w, h);
            } else if (feature.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(
                    (Number(feature.x) - worldRect.x) * sx,
                    (Number(feature.y) - worldRect.y) * sy,
                    Number(feature.r) * Math.min(sx, sy),
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        }

        const nodes = Array.isArray(me.pathNodes) ? me.pathNodes : [];
        for (const pt of nodes) {
            const px = (pt.x - worldRect.x) * sx;
            const py = (pt.y - worldRect.y) * sy;
            ctx.fillStyle = 'rgba(255, 90, 220, 0.95)';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.lastMoveSent) {
            const mx = (this.lastMoveSent.x - worldRect.x) * sx;
            const my = (this.lastMoveSent.y - worldRect.y) * sy;
            ctx.strokeStyle = 'rgba(80, 220, 255, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(mx - 4, my - 4, 8, 8);
        }

        ctx.fillStyle = '#ffd36f';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`NODES: ${nodes.length}`, 6, 12);
    }

    /**
     * Retorna cor de fallback por classe.
     */
    getClassColor(className) {
        if (className === 'knight') return '#00a8ff';
        if (className === 'shifter') return '#4cd137';
        if (className === 'bandit') return '#000000';
        return '#cccccc';
    }

    getClassIcon(className) {
        if (className === 'knight') return 'S';
        if (className === 'shifter') return 'M';
        if (className === 'bandit') return 'D';
        return '?';
    }

    applyClassAvatar(el, className) {
        if (!el) return;
        el.className = `class-avatar class-${className || 'knight'}`;
        el.textContent = this.getClassIcon(className);
    }

    loadMapTextureAssets() {
        const assets = {
            forest: {
                grass: '/maps/source/forest_tileset/ground_grass_details.png',
                path: '/maps/source/forest_tileset/exterior.png'
            },
            lava: {
                ground: '/maps/source/lava_tileset/PROPS ( No Animations )/Rock1/Rock1.png',
                detail: '/maps/source/lava_tileset/PROPS ( No Animations )/Rock2/Rock2.png'
            },
            undead: {
                ground: '/maps/source/undead_tileset/Details.png',
                detail: '/maps/source/undead_tileset/Ground_rocks.png',
                water: '/maps/source/undead_tileset/Water_coasts.png',
                object: '/maps/source/undead_tileset/Objects.png'
            }
        };
        for (const [theme, group] of Object.entries(assets)) {
            this.mapTextureImages[theme] = {};
            for (const [kind, src] of Object.entries(group)) {
                const img = new Image();
                img.src = src;
                this.mapTextureImages[theme][kind] = img;
            }
        }
    }

    hashCoords(col, row, salt = 0) {
        let h = ((col * 73856093) ^ (row * 19349663) ^ (salt * 83492791)) >>> 0;
        h ^= h >>> 13;
        h = Math.imul(h, 1274126177);
        return h >>> 0;
    }

    getTerrainTexture(theme, tile) {
        const bank = this.mapTextureImages?.[theme] || null;
        if (!bank) return null;
        if (theme === 'forest') {
            if (tile === 2) return bank.path || bank.grass || null;
            if (tile === 3) return bank.path || null;
            return bank.grass || bank.path || null;
        }
        if (theme === 'lava') {
            return tile === 2 ? (bank.detail || bank.ground || null) : (bank.ground || bank.detail || null);
        }
        if (theme === 'undead') {
            if (tile === 3) return bank.water || bank.detail || null;
            if (tile === 2) return bank.detail || bank.object || bank.ground || null;
            return bank.ground || bank.detail || null;
        }
        return null;
    }

    drawTileTexture(ctx, texture, screenX, screenY, size, col, row, alpha = 0.34) {
        if (!texture || !texture.complete || !texture.naturalWidth || !texture.naturalHeight) return;
        const iw = texture.naturalWidth;
        const ih = texture.naturalHeight;
        const sw = Math.max(8, Math.min(size, iw));
        const sh = Math.max(8, Math.min(size, ih));
        const hash = this.hashCoords(col, row, sw + sh);
        const maxSx = Math.max(0, iw - sw);
        const maxSy = Math.max(0, ih - sh);
        const sx = maxSx > 0 ? hash % (maxSx + 1) : 0;
        const sy = maxSy > 0 ? ((hash >>> 9) % (maxSy + 1)) : 0;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(texture, sx, sy, sw, sh, screenX, screenY, size, size);
        ctx.restore();
    }

    /**
     * Gera e mantem cache do bioma procedural de floresta.
     */
    ensureForestMap() {
        const cols = Math.max(1, Math.ceil(this.mapWidth / this.tileSize));
        const rows = Math.max(1, Math.ceil(this.mapHeight / this.tileSize));
        const theme = this.currentMapTheme || 'forest';
        if (this.mapTiles && this.mapCols === cols && this.mapRows === rows && this.mapVisualTheme === theme) return;

        this.mapCols = cols;
        this.mapRows = rows;
        this.mapVisualTheme = theme;
        this.mapTiles = new Uint8Array(cols * rows);
        this.forestDecor = [];

        const themeSeedOffset = theme === 'lava' ? 991 : theme === 'undead' ? 1777 : 0;
        const rng = this.createRng(this.forestSeed + cols * 31 + rows * 17 + themeSeedOffset);
        const cx = cols * 0.5;
        const cy = rows * 0.5;
        const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const n = this.fbm2d(x * 0.07, y * 0.07, this.forestSeed + themeSeedOffset);
                const n2 = this.fbm2d(x * 0.16 + 101, y * 0.16 + 37, this.forestSeed + 77 + themeSeedOffset);
                const pathCenterY = cy + Math.sin((x + (this.forestSeed + themeSeedOffset) * 0.01) * 0.11) * (rows * 0.14);
                const pathDist = Math.abs(y - pathCenterY);
                const radial = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;

                let type = 0; // 0=chao, 1=detalhe, 2=trilha, 3=liquido/perigo
                if (theme === 'undead') {
                    if (n < 0.2 + radial * 0.04) type = 3;
                    else if (pathDist < 1.4 + n2 * 0.9) type = 2;
                    else if (n > 0.63) type = 1;
                } else {
                    if (pathDist < 1.1 + n2 * 0.7) {
                        type = 2;
                    } else if (n < 0.24 - radial * 0.1) {
                        type = 3;
                    } else if (n > 0.68) {
                        type = 1;
                    }
                }
                this.mapTiles[i] = type;

                if (theme === 'forest') {
                    const treeChance = type === 1 ? 0.2 : type === 0 ? 0.06 : 0;
                    if (rng() < treeChance) {
                        this.forestDecor.push({
                            kind: 'tree',
                            x: x * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            y: y * this.tileSize + this.tileSize * (0.25 + rng() * 0.5),
                            size: 18 + Math.floor(rng() * 16)
                        });
                    } else if (type === 0 && rng() < 0.07) {
                        this.forestDecor.push({
                            kind: 'bush',
                            x: x * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            y: y * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            size: 8 + Math.floor(rng() * 8)
                        });
                    }
                } else if (theme === 'lava') {
                    const rockChance = type === 1 ? 0.14 : type === 0 ? 0.08 : 0;
                    if (rng() < rockChance) {
                        this.forestDecor.push({
                            kind: 'rock',
                            x: x * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            y: y * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            size: 10 + Math.floor(rng() * 12)
                        });
                    }
                } else if (theme === 'undead') {
                    if (type === 3) continue;
                    const roll = rng();
                    if (roll < 0.045) {
                        this.forestDecor.push({
                            kind: 'deadTree',
                            x: x * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            y: y * this.tileSize + this.tileSize * (0.2 + rng() * 0.65),
                            size: 16 + Math.floor(rng() * 18)
                        });
                    } else if (roll < 0.08) {
                        this.forestDecor.push({
                            kind: 'grave',
                            x: x * this.tileSize + this.tileSize * (0.25 + rng() * 0.5),
                            y: y * this.tileSize + this.tileSize * (0.25 + rng() * 0.5),
                            size: 10 + Math.floor(rng() * 12)
                        });
                    } else if (roll < 0.13) {
                        this.forestDecor.push({
                            kind: 'bone',
                            x: x * this.tileSize + this.tileSize * (0.2 + rng() * 0.6),
                            y: y * this.tileSize + this.tileSize * (0.25 + rng() * 0.5),
                            size: 8 + Math.floor(rng() * 10)
                        });
                    }
                }
            }
        }
    }

    /**
     * PRNG deterministico para gerar o mapa por seed.
     */
    createRng(seed) {
        let s = seed | 0;
        return () => {
            s = (s + 0x6d2b79f5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Noise suave combinando 3 octaves (fbm simples).
     */
    fbm2d(x, y, seed) {
        let amp = 0.5;
        let freq = 1;
        let sum = 0;
        let norm = 0;
        for (let o = 0; o < 3; o++) {
            sum += this.valueNoise2d(x * freq, y * freq, seed + o * 97) * amp;
            norm += amp;
            amp *= 0.5;
            freq *= 2;
        }
        return sum / Math.max(0.0001, norm);
    }

    valueNoise2d(x, y, seed) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const xf = x - x0;
        const yf = y - y0;

        const v00 = this.hash2d(x0, y0, seed);
        const v10 = this.hash2d(x0 + 1, y0, seed);
        const v01 = this.hash2d(x0, y0 + 1, seed);
        const v11 = this.hash2d(x0 + 1, y0 + 1, seed);

        const sx = xf * xf * (3 - 2 * xf);
        const sy = yf * yf * (3 - 2 * yf);
        const ix0 = v00 + (v10 - v00) * sx;
        const ix1 = v01 + (v11 - v01) * sx;
        return ix0 + (ix1 - ix0) * sy;
    }

    hash2d(x, y, seed) {
        let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
        h = (h ^ (h >>> 13)) | 0;
        h = Math.imul(h, 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967295;
    }

    getTileColor(tile) {
        if (this.currentMapTheme === 'undead') {
            if (tile === 3) return '#314350';
            if (tile === 2) return '#5a5144';
            if (tile === 1) return '#3f4a37';
            return '#2f372d';
        }
        if (this.currentMapTheme === 'lava') {
            if (tile === 3) return '#b5371b';
            if (tile === 2) return '#4c3d35';
            if (tile === 1) return '#5a463a';
            return '#3a312b';
        }
        if (tile === 3) return '#2f5f73';
        if (tile === 2) return '#5a4b34';
        if (tile === 1) return '#2f5a2f';
        return '#3d6e37';
    }

    drawTerrainCell(screenX, screenY, size, tile, col, row) {
        const theme = this.currentMapTheme || 'forest';
        const base = this.getTileColor(tile);
        this.ctx.fillStyle = base;
        this.ctx.fillRect(screenX, screenY, size, size);
        const texture = this.getTerrainTexture(theme, tile);
        const textureAlpha = theme === 'lava' ? 0.28 : theme === 'undead' ? 0.38 : 0.32;
        this.drawTileTexture(this.ctx, texture, screenX, screenY, size, col, row, textureAlpha);

        // Relevo simples para leitura "2.5D".
        this.ctx.fillStyle = 'rgba(255,255,255,0.07)';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY);
        this.ctx.lineTo(screenX + size, screenY);
        this.ctx.lineTo(screenX, screenY + size);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(0,0,0,0.11)';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + size, screenY);
        this.ctx.lineTo(screenX + size, screenY + size);
        this.ctx.lineTo(screenX, screenY + size);
        this.ctx.closePath();
        this.ctx.fill();

        if ((col + row) % 2 === 0) {
            this.ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + 4, screenY + size - 4);
            this.ctx.lineTo(screenX + size - 4, screenY + 4);
            this.ctx.stroke();
        }
    }

    drawMapFeatures(ctx, worldRect, sx = 1, sy = 1, previewMode = false) {
        if (!Array.isArray(this.mapFeatures) || !this.mapFeatures.length) return;
        for (const feature of this.mapFeatures) {
            const kind = String(feature.kind || '');
            const shape = String(feature.shape || '');
            let base = '#3e3e3e';
            let edge = '#202020';
            let accent = null;

            if (kind === 'water') {
                if (this.currentMapTheme === 'undead') {
                    base = '#324f5d';
                    edge = '#17262d';
                    accent = '#6ea3b6';
                } else {
                    base = '#2d6e8e';
                    edge = '#173a4f';
                    accent = '#6fa6c2';
                }
            } else if (kind === 'lava') {
                base = '#c14f1d';
                edge = '#6a250e';
                accent = '#f08f3d';
            } else if (kind === 'mountain') {
                base = this.currentMapTheme === 'lava' ? '#5b4d47' : this.currentMapTheme === 'undead' ? '#4f5046' : '#6f7769';
                edge = this.currentMapTheme === 'lava' ? '#302722' : this.currentMapTheme === 'undead' ? '#23241f' : '#3b4138';
                accent = this.currentMapTheme === 'lava' ? '#86766f' : this.currentMapTheme === 'undead' ? '#7f8174' : '#97a18c';
            } else if (kind === 'building') {
                base = this.currentMapTheme === 'lava' ? '#7a6b5a' : this.currentMapTheme === 'undead' ? '#5f5750' : '#78684e';
                edge = '#2f2921';
                accent = '#b69b76';
            } else if (kind === 'ruins') {
                base = this.currentMapTheme === 'undead' ? '#6a6762' : '#695f55';
                edge = '#312b26';
                accent = this.currentMapTheme === 'undead' ? '#a6a29a' : '#9f8f7f';
            } else if (kind === 'trees') {
                if (this.currentMapTheme === 'undead') {
                    base = '#2d352c';
                    edge = '#141912';
                    accent = '#555f53';
                } else {
                    base = '#1e4f2b';
                    edge = '#0f2a17';
                    accent = '#2f7540';
                }
            }

            ctx.fillStyle = base;
            ctx.strokeStyle = edge;
            ctx.lineWidth = previewMode ? 1 : 2;

            if (shape === 'rect') {
                const fw = Number(feature.w) || 0;
                const fh = Number(feature.h) || 0;
                const fx = (Number(feature.x) - worldRect.x) * sx;
                const fy = (Number(feature.y) - worldRect.y) * sy;
                const pw = fw * sx;
                const ph = fh * sy;
                if (pw <= 0 || ph <= 0 || fx > worldRect.w * sx + 20 || fy > worldRect.h * sy + 20 || fx + pw < -20 || fy + ph < -20) continue;
                ctx.fillRect(fx, fy, pw, ph);
                ctx.strokeRect(fx, fy, pw, ph);
                if (!accent) continue;
                ctx.fillStyle = accent;
                if (kind === 'trees') {
                    const step = Math.max(8, Math.floor(28 * sx));
                    for (let iy = fy + step / 2; iy <= fy + ph - step / 3; iy += step) {
                        for (let ix = fx + step / 2; ix <= fx + pw - step / 3; ix += step) {
                            ctx.beginPath();
                            ctx.arc(ix, iy, Math.max(2, step * 0.22), 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else {
                    ctx.fillRect(fx + pw * 0.08, fy + ph * 0.08, pw * 0.84, Math.max(2, ph * 0.1));
                }
                continue;
            }

            if (shape === 'circle') {
                const fr = Number(feature.r) || 0;
                const fx = (Number(feature.x) - worldRect.x) * sx;
                const fy = (Number(feature.y) - worldRect.y) * sy;
                const pr = fr * Math.min(sx, sy);
                if (pr <= 0 || fx > worldRect.w * sx + pr || fy > worldRect.h * sy + pr || fx + pr < -pr || fy + pr < -pr) continue;
                ctx.beginPath();
                ctx.arc(fx, fy, pr, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                if (!accent) continue;
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.arc(fx - pr * 0.22, fy - pr * 0.2, Math.max(2, pr * 0.35), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawPixelPortal(ctx, centerX, centerY, radius, pixelSize = 2) {
        const r = Math.max(3, radius);
        const px = Math.max(1, pixelSize);
        const shades = ['#2d98ff', '#1f7fe0', '#145fb8'];
        for (let y = -r; y <= r; y += px) {
            for (let x = -r; x <= r; x += px) {
                const d = Math.sqrt(x * x + y * y);
                if (d > r) continue;
                const ring = d > r * 0.68 ? 0 : d > r * 0.38 ? 1 : 2;
                ctx.fillStyle = shades[ring];
                ctx.fillRect(centerX + x, centerY + y, px, px);
            }
        }
        ctx.fillStyle = '#7fd2ff';
        ctx.fillRect(centerX - px, centerY - px, px * 2, px * 2);
    }

    drawWorldPreview(ctx, canvas, worldRect, drawCameraBox = false) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#101620';
        ctx.fillRect(0, 0, w, h);

        const tileStartCol = Math.max(0, Math.floor(worldRect.x / this.tileSize));
        const tileEndCol = Math.min(this.mapCols - 1, Math.ceil((worldRect.x + worldRect.w) / this.tileSize));
        const tileStartRow = Math.max(0, Math.floor(worldRect.y / this.tileSize));
        const tileEndRow = Math.min(this.mapRows - 1, Math.ceil((worldRect.y + worldRect.h) / this.tileSize));

        const sx = w / Math.max(1, worldRect.w);
        const sy = h / Math.max(1, worldRect.h);

        for (let row = tileStartRow; row <= tileEndRow; row++) {
            for (let col = tileStartCol; col <= tileEndCol; col++) {
                const tile = this.mapTiles[row * this.mapCols + col];
                ctx.fillStyle = this.getTileColor(tile);

                const worldX = col * this.tileSize;
                const worldY = row * this.tileSize;
                const px = (worldX - worldRect.x) * sx;
                const py = (worldY - worldRect.y) * sy;
                const pw = this.tileSize * sx;
                const ph = this.tileSize * sy;
                ctx.fillRect(px, py, pw + 0.7, ph + 0.7);
            }
        }
        this.drawMapFeatures(ctx, worldRect, sx, sy, true);

        for (const portal of this.mapPortals) {
            const cx = (portal.x + portal.w * 0.5 - worldRect.x) * sx;
            const cy = (portal.y + portal.h * 0.5 - worldRect.y) * sy;
            const radius = Math.max(4, Math.min(portal.w * sx, portal.h * sy) * 0.24);
            const visible = cx + radius >= 0 && cy + radius >= 0 && cx - radius <= w && cy - radius <= h;
            if (!visible) continue;
            this.drawPixelPortal(ctx, cx, cy, radius, Math.max(1, Math.floor(radius / 5)));
        }

        for (const id of Object.keys(this.mobs)) {
            const mob = this.mobs[id];
            if (mob.x < worldRect.x || mob.x > worldRect.x + worldRect.w || mob.y < worldRect.y || mob.y > worldRect.y + worldRect.h) continue;
            ctx.fillStyle = '#ff4757';
            ctx.beginPath();
            ctx.arc((mob.x - worldRect.x) * sx, (mob.y - worldRect.y) * sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const id of Object.keys(this.players)) {
            const p = this.players[id];
            if (p.x < worldRect.x || p.x > worldRect.x + worldRect.w || p.y < worldRect.y || p.y > worldRect.y + worldRect.h) continue;
            ctx.fillStyle = id === this.localId ? '#ffffff' : '#4da3ff';
            ctx.beginPath();
            ctx.arc((p.x - worldRect.x) * sx, (p.y - worldRect.y) * sy, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }

        this.pruneExpiredPartyWaypoints();
        for (const ping of this.partyWaypoints) {
            if (ping.mapKey !== this.currentMapKey || ping.mapId !== this.currentMapId) continue;
            if (ping.x < worldRect.x || ping.x > worldRect.x + worldRect.w || ping.y < worldRect.y || ping.y > worldRect.y + worldRect.h) continue;
            const px = (ping.x - worldRect.x) * sx;
            const py = (ping.y - worldRect.y) * sy;
            ctx.strokeStyle = '#f6d04d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px - 5, py);
            ctx.lineTo(px + 5, py);
            ctx.moveTo(px, py - 5);
            ctx.lineTo(px, py + 5);
            ctx.stroke();
            ctx.fillStyle = '#f6d04d';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(ping.fromName || 'Grupo'), px, py - 10);
        }

        this.drawPlannedPathOnPreview(ctx, worldRect, sx, sy);
        this.drawDebugPathOnPreview(ctx, worldRect, sx, sy);

        if (drawCameraBox) {
            const camX = (this.camera.x - worldRect.x) * sx;
            const camY = (this.camera.y - worldRect.y) * sy;
            const camW = (this.canvas.width / Math.max(1, worldRect.w)) * w;
            const camH = (this.canvas.height / Math.max(1, worldRect.h)) * h;
            ctx.strokeStyle = '#f1f2f6';
            ctx.lineWidth = 1;
            ctx.strokeRect(camX, camY, camW, camH);
        }

        ctx.strokeStyle = '#324055';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
    }

    /**
     * Desenha minimapa em forma de recorte local (fragmento ao redor do player).
     */
    drawMinimap() {
        const worldRect = this.getMinimapWorldRect();
        this.drawWorldPreview(this.minimapCtx, this.minimapCanvas, worldRect, false);
    }

    drawWorldMapPanel() {
        if (this.worldmapPanel.classList.contains('hidden')) return;
        const worldRect = { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight };
        this.drawWorldPreview(this.worldmapCtx, this.worldmapCanvas, worldRect, false);
    }

    /**
     * Ajusta canvas para o tamanho da janela.
     */
    resize() {
        this.canvas.width = Math.max(960, window.innerWidth || this.baseRenderWidth);
        this.canvas.height = Math.max(540, window.innerHeight || this.baseRenderHeight);
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
    }

    /**
     * Inicia loop de renderização do cliente.
     */
    startLoop() {
        const loop = () => {
            this.draw();
            requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Desenha tiles visíveis do mapa.
     */
    drawMap() {
        this.ensureForestMap();
        const cols = Math.ceil(this.canvas.width / this.tileSize) + 1;
        const rows = Math.ceil(this.canvas.height / this.tileSize) + 1;
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const maxCol = this.mapCols - 1;
        const maxRow = this.mapRows - 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const mapCol = Math.max(0, Math.min(maxCol, startCol + col));
                const mapRow = Math.max(0, Math.min(maxRow, startRow + row));
                const worldX = mapCol * this.tileSize;
                const worldY = mapRow * this.tileSize;
                const screenX = worldX - this.camera.x;
                const screenY = worldY - this.camera.y;
                const t = this.mapTiles[mapRow * this.mapCols + mapCol];
                this.drawTerrainCell(screenX, screenY, this.tileSize, t, mapCol, mapRow);
            }
        }
        const worldRect = {
            x: this.camera.x,
            y: this.camera.y,
            w: this.canvas.width,
            h: this.canvas.height
        };
        this.drawMapFeatures(this.ctx, worldRect, 1, 1, false);

        const viewLeft = this.camera.x - 80;
        const viewTop = this.camera.y - 80;
        const viewRight = this.camera.x + this.canvas.width + 80;
        const viewBottom = this.camera.y + this.canvas.height + 80;
        for (const d of this.forestDecor) {
            if (d.x < viewLeft || d.x > viewRight || d.y < viewTop || d.y > viewBottom) continue;
            const sx = d.x - this.camera.x;
            const sy = d.y - this.camera.y;
            if (d.kind === 'tree') {
                this.ctx.fillStyle = '#4b2e1c';
                this.ctx.fillRect(sx - 2, sy, 4, Math.max(8, d.size * 0.35));
                this.ctx.fillStyle = '#1e4f2c';
                this.ctx.beginPath();
                this.ctx.arc(sx, sy - d.size * 0.2, d.size * 0.52, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#27663a';
                this.ctx.beginPath();
                this.ctx.arc(sx - d.size * 0.15, sy - d.size * 0.28, d.size * 0.35, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (d.kind === 'rock') {
                this.ctx.fillStyle = '#8f7666';
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, d.size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#6b584c';
                this.ctx.beginPath();
                this.ctx.arc(sx - d.size * 0.12, sy - d.size * 0.08, d.size * 0.24, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (d.kind === 'deadTree') {
                this.ctx.fillStyle = '#4e4338';
                this.ctx.fillRect(sx - 2, sy - d.size * 0.15, 4, Math.max(7, d.size * 0.45));
                this.ctx.strokeStyle = '#766050';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(sx, sy - d.size * 0.18);
                this.ctx.lineTo(sx - d.size * 0.22, sy - d.size * 0.42);
                this.ctx.moveTo(sx, sy - d.size * 0.26);
                this.ctx.lineTo(sx + d.size * 0.26, sy - d.size * 0.5);
                this.ctx.stroke();
            } else if (d.kind === 'grave') {
                const w = Math.max(6, d.size * 0.55);
                const h = Math.max(8, d.size * 0.8);
                this.ctx.fillStyle = '#8f8f8f';
                this.ctx.fillRect(sx - w / 2, sy - h, w, h);
                this.ctx.fillStyle = '#6c6c6c';
                this.ctx.fillRect(sx - w / 2, sy - h, w, Math.max(2, h * 0.2));
            } else if (d.kind === 'bone') {
                const r = Math.max(2, d.size * 0.16);
                this.ctx.fillStyle = '#d7ceb8';
                this.ctx.fillRect(sx - d.size * 0.28, sy - r, d.size * 0.56, r * 2);
                this.ctx.beginPath();
                this.ctx.arc(sx - d.size * 0.3, sy, r, 0, Math.PI * 2);
                this.ctx.arc(sx + d.size * 0.3, sy, r, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#2b5d34';
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, d.size * 0.55, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        for (const portal of this.mapPortals) {
            const cx = portal.x + portal.w * 0.5;
            const cy = portal.y + portal.h * 0.5;
            if (cx < viewLeft || cx > viewRight || cy < viewTop || cy > viewBottom) continue;
            const sx = cx - this.camera.x;
            const sy = cy - this.camera.y;
            const radius = Math.max(8, Math.min(portal.w, portal.h) * 0.24);
            this.drawPixelPortal(this.ctx, sx, sy, radius, 3);
        }
    }

    /**
     * Desenha mobs e barras de HP.
     */
    drawMobs() {
        const now = Date.now();
        for (const id of Object.keys(this.mobs)) {
            const mob = this.mobs[id];
            let screenX = mob.x - this.camera.x;
            let screenY = mob.y - this.camera.y;
            if (mob.hitAnim && mob.hitAnim.until > now) {
                screenX += mob.hitAnim.ox;
                screenY += mob.hitAnim.oy;
            }
            const half = mob.size / 2;
            this.drawMobSprite(mob, screenX, screenY, now);

            const isHovered = this.hoveredMobId === id;
            const isSelected = this.selectedMobId === id;
            if (isHovered || isSelected) {
                this.ctx.strokeStyle = isSelected ? '#ffffff' : '#ffd32a';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(screenX - half, screenY - half, mob.size, mob.size);
            }

            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(screenX - half, screenY - half - 10, mob.size, 6);
            this.ctx.fillStyle = '#2ed573';
            this.ctx.fillRect(screenX - half, screenY - half - 10, mob.size * (mob.hp / mob.maxHp), 6);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.getMobDisplayName(mob), screenX, screenY - half - 14);
        }
    }

    getMobDisplayName(mob) {
        const kind = String(mob?.kind || 'normal');
        if (kind === 'elite') return 'Elite';
        if (kind === 'subboss') return 'Subboss';
        if (kind === 'boss') return 'Boss';
        return 'Monstro';
    }

    drawMobSprite(mob, x, y, now) {
        const pulse = 1 + Math.sin(now / 240 + (mob.x + mob.y) * 0.001) * 0.05;
        const size = mob.size * pulse;
        const half = size / 2;
        const kind = mob.kind || 'normal';

        this.ctx.fillStyle = 'rgba(0,0,0,0.24)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + half * 0.5, half * 0.55, half * 0.2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (kind === 'normal') {
            this.ctx.fillStyle = '#b71f2d';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y - half * 0.02, half * 0.5, half * 0.44, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#f06773';
            this.ctx.beginPath();
            this.ctx.arc(x - half * 0.14, y - half * 0.2, half * 0.16, 0, Math.PI * 2);
            this.ctx.fill();
            return;
        }

        if (kind === 'elite') {
            this.ctx.fillStyle = '#d06b18';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y - half * 0.04, half * 0.58, half * 0.46, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#8b3f11';
            this.ctx.fillRect(x - half * 0.46, y - half * 0.02, half * 0.92, half * 0.5);
            this.ctx.fillStyle = '#f1c27a';
            this.ctx.fillRect(x - half * 0.34, y - half * 0.55, half * 0.12, half * 0.22);
            this.ctx.fillRect(x + half * 0.22, y - half * 0.55, half * 0.12, half * 0.22);
            return;
        }

        if (kind === 'subboss') {
            this.ctx.fillStyle = '#7b3db6';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - half * 0.58);
            this.ctx.lineTo(x + half * 0.56, y - half * 0.04);
            this.ctx.lineTo(x, y + half * 0.54);
            this.ctx.lineTo(x - half * 0.56, y - half * 0.04);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.fillStyle = '#e3b8ff';
            this.ctx.fillRect(x - half * 0.08, y - half * 0.12, half * 0.16, half * 0.24);
            return;
        }

        this.ctx.fillStyle = '#151515';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - half * 0.03, half * 0.66, half * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#2f2f2f';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + half * 0.08, half * 0.5, half * 0.34, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#d62828';
        this.ctx.fillRect(x - half * 0.18, y - half * 0.14, half * 0.14, half * 0.14);
        this.ctx.fillRect(x + half * 0.04, y - half * 0.14, half * 0.14, half * 0.14);
    }

    /**
     * Desenha itens dropados no chão.
     */
    drawGroundItems() {
        for (const id of Object.keys(this.groundItems)) {
            const item = this.groundItems[id];
            const screenX = item.x - this.camera.x;
            const screenY = item.y - this.camera.y;

            this.ctx.fillStyle = '#c0392b';
            this.ctx.fillRect(screenX - 10, screenY - 8, 20, 14);
            this.ctx.strokeStyle = '#ffb3aa';
            this.ctx.strokeRect(screenX - 10, screenY - 8, 20, 14);

            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(item.name, screenX, screenY - 14);
        }
    }

    /**
     * Desenha jogadores e nomes.
     */
    drawPlayers() {
        const now = Date.now();
        for (const id of Object.keys(this.players)) {
            const p = this.players[id];
            let screenX = p.x - this.camera.x;
            let screenY = p.y - this.camera.y;
            if (p.hitAnim && p.hitAnim.until > now) {
                screenX += p.hitAnim.ox;
                screenY += p.hitAnim.oy;
            }
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const visualDx = p.x - (p.animLastX ?? p.x);
            const visualDy = p.y - (p.animLastY ?? p.y);
            const visualDist = Math.sqrt(visualDx * visualDx + visualDy * visualDy);
            const moving = dist > 0.05 || visualDist > 0.02;
            const attacking = Boolean(p.attackAnim && p.attackAnim.until > now);

            if (moving) {
                const hasServerVec = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
                const faceDx = hasServerVec ? dx : visualDx;
                const faceDy = hasServerVec ? dy : visualDy;
                if (Math.abs(faceDx) > 0.001 || Math.abs(faceDy) > 0.001) {
                    p.facing = this.resolveFacing(faceDx, faceDy);
                }
            }

            const deltaMs = now - (p.animLastAt || now);
            p.animLastAt = now;
            if (moving) p.animMs = (p.animMs || 0) + deltaMs;
            else p.animMs = 0;
            p.animLastX = p.x;
            p.animLastY = p.y;
            const attackAnimMs = attacking ? now - p.attackAnim.startedAt : null;
            const attackMode = (p.class === 'knight' || p.class === 'shifter' || p.class === 'bandit' || p.equippedWeaponName) ? 'armed' : 'unarmed';

            const frame = this.sprites.getPlayerFrame(
                p.class,
                p.facing || 's',
                moving && !attacking,
                p.animMs || 0,
                attackAnimMs,
                attackMode
            );
            if (frame.image) {
                const drawW = 50;
                const drawH = 80;
                const drawX = screenX - 20;
                const drawY = screenY - 20;
                if (frame.mirror) {
                    this.ctx.save();
                    this.ctx.translate(screenX, 0);
                    this.ctx.scale(-1, 1);
                    if (frame.source) {
                        this.ctx.drawImage(
                            frame.image,
                            frame.source.x,
                            frame.source.y,
                            frame.source.w,
                            frame.source.h,
                            -20,
                            drawY,
                            drawW,
                            drawH
                        );
                        this.drawHeadOverlay(
                            frame,
                            -20,
                            drawY,
                            drawW,
                            drawH,
                            true,
                            p.facing || 's',
                            p.animMs || 0,
                            moving && !attacking
                        );
                        if (frame.tint) {
                            this.ctx.fillStyle = frame.tint;
                            this.ctx.fillRect(-20, drawY, drawW, drawH);
                        }
                    } else {
                        this.ctx.drawImage(frame.image, -20, drawY, drawW, drawH);
                        if (frame.tint) {
                            this.ctx.fillStyle = frame.tint;
                            this.ctx.fillRect(-20, drawY, drawW, drawH);
                        }
                    }
                    this.ctx.restore();
                } else {
                    if (frame.source) {
                        this.ctx.drawImage(
                            frame.image,
                            frame.source.x,
                            frame.source.y,
                            frame.source.w,
                            frame.source.h,
                            drawX,
                            drawY,
                            drawW,
                            drawH
                        );
                        this.drawHeadOverlay(
                            frame,
                            drawX,
                            drawY,
                            drawW,
                            drawH,
                            false,
                            p.facing || 's',
                            p.animMs || 0,
                            moving && !attacking
                        );
                        if (frame.tint) {
                            this.ctx.fillStyle = frame.tint;
                            this.ctx.fillRect(drawX, drawY, drawW, drawH);
                        }
                    } else {
                        this.ctx.drawImage(frame.image, drawX, drawY, drawW, drawH);
                        if (frame.tint) {
                            this.ctx.fillStyle = frame.tint;
                            this.ctx.fillRect(drawX, drawY, drawW, drawH);
                        }
                    }
                }
            } else {
                this.drawProceduralCharacter(p, screenX, screenY, moving, attacking, now);
            }

            this.drawClassWeapon(p, screenX, screenY, moving, attacking, now);

            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 13px Arial';
            this.ctx.fillText(`${p.name} Lv.${p.level}`, screenX, screenY - 30);

            const bubble = this.chatBubbles[id];
            if (bubble && bubble.expiresAt > now) {
                const paddingX = 8;
                const bubbleY = screenY - 62;
                this.ctx.font = '12px Arial';
                const text = bubble.text.length > 28 ? `${bubble.text.slice(0, 28)}...` : bubble.text;
                const textW = this.ctx.measureText(text).width;
                const boxW = textW + paddingX * 2;
                const boxH = 22;
                const boxX = screenX - boxW / 2;
                const boxTop = bubbleY - boxH;

                this.ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
                this.ctx.strokeStyle = '#7f8fa6';
                this.ctx.lineWidth = 1;
                this.ctx.fillRect(boxX, boxTop, boxW, boxH);
                this.ctx.strokeRect(boxX, boxTop, boxW, boxH);

                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(text, screenX, boxTop + 15);
            } else if (bubble) {
                delete this.chatBubbles[id];
            }
        }
    }

    /**
     * Desenha cabeca sobre o corpo usando headAnchor do frame de corpo.
     */
    drawHeadOverlay(frame, drawX, drawY, drawW, drawH, mirrored, facing, animMs, moving) {
        if (!frame.head || !frame.source) return;
        const body = frame.source;
        const head = frame.head.source;
        const cls = frame.className || '';
        const tuning = this.headOverlayTuning[cls] || {
            scale: 0.42,
            useBodyAnchor: true,
            anchorRatioX: 0.5,
            anchorRatioY: 0.43,
            offsetXByDir: {},
            offsetYByDir: {},
            bobPx: 0
        };
        const useBodyAnchor = Boolean(tuning.useBodyAnchor);
        const anchorLocalX = useBodyAnchor && body.headAnchor ? (body.headAnchor.x - body.x) : (body.w * (tuning.anchorRatioX ?? 0.5));
        const anchorLocalY = useBodyAnchor && body.headAnchor ? (body.headAnchor.y - body.y) : (body.h * (tuning.anchorRatioY ?? 0.43));

        let headCx = drawX + (anchorLocalX / Math.max(1, body.w)) * drawW;
        if (mirrored) headCx = drawX + (drawW - (anchorLocalX / Math.max(1, body.w)) * drawW);
        const headCy = drawY + (anchorLocalY / Math.max(1, body.h)) * drawH;
        const scaleForDir = tuning.scaleByDir?.[facing] ?? tuning.scale;
        const headW = Math.max(14, Math.round(drawW * scaleForDir));
        const headH = Math.max(14, Math.round((head.h / Math.max(1, head.w)) * headW));
        const dirOffsetX = tuning.offsetXByDir?.[facing] ?? 0;
        const dirOffsetY = tuning.offsetYByDir?.[facing] ?? 0;
        let bob = 0;
        if (moving) {
            // Bob discreto sincronizado com o mesmo frame-rate da caminhada (90ms por frame).
            const step = Math.floor(animMs / 90) % 8;
            const pattern = [0, -0.35, -0.6, -0.35, 0, 0.2, 0.35, 0.2];
            bob = pattern[step] * (tuning.bobPx || 0);
        }
        const finalCx = headCx + (mirrored ? -dirOffsetX : dirOffsetX);
        const finalCy = headCy + dirOffsetY + bob;
        this.ctx.drawImage(
            frame.head.image,
            head.x,
            head.y,
            head.w,
            head.h,
            finalCx - headW / 2,
            finalCy - headH * 0.8,
            headW,
            headH
        );
    }

    getProceduralPose(player, screenX, screenY, moving, attacking, now) {
        const dir = player.facing || 's';
        const side = (dir === 'e' || dir === 'se' || dir === 'ne') ? 1 : ((dir === 'w' || dir === 'sw' || dir === 'nw') ? -1 : 0);
        const facingNorth = dir === 'n' || dir === 'ne' || dir === 'nw';
        const facingSouth = dir === 's' || dir === 'se' || dir === 'sw';
        const bob = moving ? Math.sin((player.animMs || 0) / 95) * 1.8 : 0;
        const walkPhase = Math.sin((player.animMs || 0) / 90);
        const armSwing = moving ? walkPhase * 4.6 : 0;
        const attackProgress = attacking ? Math.max(0, Math.min(1, (now - (player.attackAnim?.startedAt || now)) / 120)) : 0;
        const attackKick = attackProgress * 7;
        const leanX = side * 2;
        const torsoY = screenY + 8 + (facingNorth ? -1 : 0);
        const chestWidth = side === 0 ? 20 : 18;
        const shoulderY = torsoY + 4;
        const leftHand = {
            x: screenX - 12 + leanX - armSwing * 0.8,
            y: shoulderY + 12 - Math.abs(armSwing) * 0.15
        };
        const rightHand = {
            x: screenX + 12 + leanX + armSwing * 0.8 + (side >= 0 ? attackKick : -attackKick * 0.35),
            y: shoulderY + 12 - Math.abs(armSwing) * 0.1
        };
        return { dir, side, facingNorth, facingSouth, bob, armSwing, leanX, torsoY, shoulderY, chestWidth, attackProgress, leftHand, rightHand };
    }

    drawProceduralCharacter(player, screenX, screenY, moving, attacking, now) {
        const cls = player.class || 'knight';
        const palette = cls === 'shifter'
            ? { cloth: '#3cae36', clothDark: '#2f822c', skin: '#d9b38f', line: '#1f3d1e' }
            : cls === 'bandit'
                ? { cloth: '#323844', clothDark: '#1f242d', skin: '#d3ad88', line: '#7f8a99' }
                : { cloth: '#3375c8', clothDark: '#23518b', skin: '#d8b189', line: '#25456c' };
        const pose = this.getProceduralPose(player, screenX, screenY, moving, attacking, now);

        this.ctx.save();
        this.ctx.translate(0, pose.bob);

        this.ctx.strokeStyle = palette.line;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';

        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 6 + pose.leanX * 0.2, pose.torsoY + 22);
        this.ctx.lineTo(screenX - 8 + pose.armSwing * 0.5 + pose.leanX * 0.3, pose.torsoY + 34);
        this.ctx.moveTo(screenX + 6 + pose.leanX * 0.2, pose.torsoY + 22);
        this.ctx.lineTo(screenX + 8 - pose.armSwing * 0.5 + pose.leanX * 0.3, pose.torsoY + 34);
        this.ctx.stroke();

        // Body
        this.ctx.fillStyle = palette.cloth;
        this.ctx.fillRect(screenX - pose.chestWidth / 2 + pose.leanX, pose.torsoY - 2, pose.chestWidth, 26);
        this.ctx.fillStyle = palette.clothDark;
        this.ctx.fillRect(screenX - pose.chestWidth / 2 + pose.leanX, pose.torsoY + 14, pose.chestWidth, 10);

        // Arms
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 10 + pose.leanX, pose.shoulderY);
        this.ctx.lineTo(pose.leftHand.x, pose.leftHand.y);
        this.ctx.moveTo(screenX + 10 + pose.leanX, pose.shoulderY);
        this.ctx.lineTo(pose.rightHand.x, pose.rightHand.y);
        this.ctx.stroke();

        // Head
        this.ctx.fillStyle = palette.skin;
        this.ctx.beginPath();
        this.ctx.arc(screenX + pose.leanX * 0.5, pose.torsoY - 8, 9, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = palette.line;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Face / back cue by direction.
        if (pose.facingNorth) {
            this.ctx.fillStyle = palette.clothDark;
            this.ctx.fillRect(screenX - 7 + pose.leanX * 0.5, pose.torsoY - 14, 14, 4);
        } else {
            const eyeShiftX = pose.side * 2;
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillRect(screenX - 3 + eyeShiftX + pose.leanX * 0.5, pose.torsoY - 10, 2, 2);
            this.ctx.fillRect(screenX + 1 + eyeShiftX + pose.leanX * 0.5, pose.torsoY - 10, 2, 2);
            if (pose.facingSouth) {
                this.ctx.fillStyle = '#7f5842';
                this.ctx.fillRect(screenX - 2 + pose.leanX * 0.5, pose.torsoY - 5, 4, 1);
            }
        }

        this.ctx.restore();
    }

    drawClassWeapon(player, screenX, screenY, moving, attacking, now) {
        const pose = this.getProceduralPose(player, screenX, screenY, moving, attacking, now);
        const facingLeft = pose.side < 0;
        const handX = pose.rightHand.x;
        const handY = pose.rightHand.y;

        if (player.class === 'knight') {
            this.ctx.save();
            this.ctx.translate(handX, handY);
            this.ctx.rotate((facingLeft ? -1 : 1) * (attacking ? 0.62 : 0.24));
            this.ctx.fillStyle = '#c7d2de';
            this.ctx.fillRect(-2, -26, 4, 22);
            this.ctx.fillStyle = '#7b4f2a';
            this.ctx.fillRect(-4, -6, 8, 4);
            this.ctx.restore();
            return;
        }

        if (player.class === 'shifter') {
            this.ctx.save();
            this.ctx.translate(handX, handY + 1);
            this.ctx.rotate((facingLeft ? -1 : 1) * (attacking ? 0.38 : 0.1));
            this.ctx.fillStyle = '#5f4638';
            this.ctx.fillRect(-2, -20, 4, 18);
            this.ctx.fillStyle = '#90a4b8';
            this.ctx.fillRect(-8, -28, 16, 10);
            this.ctx.restore();
            return;
        }

        if (player.class === 'bandit') {
            const swingTick = Number(this.banditSwingTick[String(player.id)] || 0);
            const swingRight = swingTick % 2 === 0;
            const rightAlpha = !attacking || swingRight ? 1 : 0.25;
            const leftAlpha = !attacking || !swingRight ? 1 : 0.25;

            const leftHandX = pose.leftHand.x;
            const leftHandY = pose.leftHand.y;
            const rightHandX = pose.rightHand.x;
            const rightHandY = pose.rightHand.y;

            this.ctx.fillStyle = `rgba(209, 218, 227, ${leftAlpha})`;
            this.ctx.save();
            this.ctx.translate(leftHandX, leftHandY);
            this.ctx.rotate((facingLeft ? -1 : 1) * -0.28);
            this.ctx.fillRect(-1.5, -12, 3, 14);
            this.ctx.restore();

            this.ctx.fillStyle = `rgba(209, 218, 227, ${rightAlpha})`;
            this.ctx.save();
            this.ctx.translate(rightHandX, rightHandY);
            this.ctx.rotate((facingLeft ? -1 : 1) * 0.34);
            this.ctx.fillRect(-1.5, -12, 3, 14);
            this.ctx.restore();
        }
    }

    drawCombatProjectiles() {
        if (!this.combatProjectiles.length) return;
        const now = Date.now();
        const alive = [];
        for (const projectile of this.combatProjectiles) {
            if (projectile.expiresAt <= now) continue;
            const t = Math.max(0, Math.min(1, (now - projectile.startedAt) / Math.max(1, projectile.expiresAt - projectile.startedAt)));
            const worldX = projectile.fromX + (projectile.toX - projectile.fromX) * t;
            const worldY = projectile.fromY + (projectile.toY - projectile.fromY) * t;
            const sx = worldX - this.camera.x;
            const sy = worldY - this.camera.y;
            this.ctx.fillStyle = projectile.color || '#7dd3fc';
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(255,255,255,0.75)';
            this.ctx.beginPath();
            this.ctx.arc(sx - 1, sy - 1, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            alive.push(projectile);
        }
        this.combatProjectiles = alive;
    }

    drawPathDebugOverlay() {
        if (!this.pathDebugEnabled || this.playerRole !== 'adm') return;
        const me = this.localId ? this.players[this.localId] : null;
        if (!me) return;

        this.ctx.save();

        // Contorno das areas de colisao configuradas no mapa.
        for (const feature of this.mapFeatures || []) {
            if (!feature || !feature.collision) continue;
            this.ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            this.ctx.lineWidth = 2;
            if (feature.shape === 'rect') {
                this.ctx.strokeRect(
                    Number(feature.x) - this.camera.x,
                    Number(feature.y) - this.camera.y,
                    Number(feature.w),
                    Number(feature.h)
                );
            } else if (feature.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(
                    Number(feature.x) - this.camera.x,
                    Number(feature.y) - this.camera.y,
                    Number(feature.r),
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            }
        }

        // Rota planejada recebida do servidor.
        const nodes = Array.isArray(me.pathNodes) ? me.pathNodes : [];
        if (nodes.length) {
            const points = [{ x: me.x, y: me.y }, ...nodes];
            this.ctx.strokeStyle = 'rgba(255, 90, 220, 0.95)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            points.forEach((pt, idx) => {
                const sx = pt.x - this.camera.x;
                const sy = pt.y - this.camera.y;
                if (idx === 0) this.ctx.moveTo(sx, sy);
                else this.ctx.lineTo(sx, sy);
            });
            this.ctx.stroke();

            for (const pt of nodes) {
                this.ctx.fillStyle = 'rgba(255, 90, 220, 0.95)';
                this.ctx.beginPath();
                this.ctx.arc(pt.x - this.camera.x, pt.y - this.camera.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Destino do ultimo clique enviado.
        if (this.lastMoveSent) {
            this.ctx.strokeStyle = 'rgba(80, 220, 255, 0.95)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.lastMoveSent.x - this.camera.x - 6,
                this.lastMoveSent.y - this.camera.y - 6,
                12,
                12
            );
        }

        this.ctx.fillStyle = '#ffd36f';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`DEBUG PATH ON | NODES: ${nodes.length}`, this.canvas.width * 0.5, 18);
        this.ctx.restore();
    }

    updateAdminMapSettings() {
        const isAdmin = this.playerRole === 'adm';
        if (this.pathDebugSetting) this.pathDebugSetting.classList.toggle('hidden', !isAdmin);
        if (this.mobPeacefulSetting) this.mobPeacefulSetting.classList.toggle('hidden', !isAdmin);
        if (!isAdmin) {
            this.pathDebugEnabled = false;
            if (this.pathDebugToggle) this.pathDebugToggle.checked = false;
        }
    }

    /**
     * Resolve direcao em 8 sentidos a partir do vetor de movimento.
     */
    resolveFacing(dx, dy) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle >= -22.5 && angle < 22.5) return 'e';
        if (angle >= 22.5 && angle < 67.5) return 'se';
        if (angle >= 67.5 && angle < 112.5) return 's';
        if (angle >= 112.5 && angle < 157.5) return 'sw';
        if (angle >= 157.5 || angle < -157.5) return 'w';
        if (angle >= -157.5 && angle < -112.5) return 'nw';
        if (angle >= -112.5 && angle < -67.5) return 'n';
        return 'ne';
    }

    /**
     * Render principal de cada frame.
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.smoothEntities();

        if (this.localId && this.players[this.localId]) {
            const me = this.players[this.localId];
            this.camera.x = me.x - this.canvas.width / 2;
            this.camera.y = me.y - this.canvas.height / 2;
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.mapWidth - this.canvas.width));
            this.camera.y = Math.max(0, Math.min(this.camera.y, this.mapHeight - this.canvas.height));
        }
        this.updateTargetPlayerCard();

        this.drawMap();
        this.drawPathDebugOverlay();
        this.drawMobs();
        this.drawGroundItems();
        this.drawPlayers();
        this.drawCombatProjectiles();
        this.drawMinimap();
        this.drawWorldMapPanel();

        if (this.lastMoveAck) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `Move ACK(${this.lastMoveAck.reqId || '-'}) ${Math.floor(this.lastMoveAck.targetX)}, ${Math.floor(this.lastMoveAck.targetY)}`,
                14,
                this.canvas.height - 14
            );
        }

        if (this.lastMoveSent) {
            this.ctx.fillStyle = '#9ad1ff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `Move Sent(${this.lastMoveSent.reqId || '-'}) ${Math.floor(this.lastMoveSent.x)}, ${Math.floor(this.lastMoveSent.y)}`,
                14,
                this.canvas.height - 30
            );
        }
    }
}
