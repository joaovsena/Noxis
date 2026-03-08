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
        this.hoveredGroundItemId = null;
        this.pendingPickup = null;
        this.pickupInteractRange = 90;
        this.groundItemHitHalfSize = 20;

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
        this.baseDevicePixelRatio = Number(window.devicePixelRatio || 1) || 1;
        this.minGameZoomScale = 0.67;
        this.maxGameZoomScale = 1.5;
        this.currentGameZoomScale = 1;

        this.panel = document.getElementById('char-panel');
        this.panelBody = document.getElementById('panel-body');
        this.panelClassChip = document.getElementById('panel-class-chip');

        this.playerCard = document.getElementById('player-card');
        this.perfHud = document.getElementById('perf-hud');
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
        this.targetNameText = document.getElementById('target-name-text');
        this.targetActionsToggle = document.getElementById('target-actions-toggle');
        this.targetActionsMenu = document.getElementById('target-actions-menu');
        this.targetInviteBtn = document.getElementById('target-invite-btn');
        this.targetFriendBtn = document.getElementById('target-friend-btn');
        this.targetClearDistance = 900;

        this.minimapWrap = document.getElementById('minimap-wrap');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.mapCodeLabel = document.getElementById('map-code-label');
        this.mapSettingsToggle = document.getElementById('map-settings-toggle');
        this.mapSettingsPanel = document.getElementById('map-settings-panel');
        this.autoAttackToggle = document.getElementById('auto-attack-toggle');
        this.pathDebugSetting = document.getElementById('path-debug-setting');
        this.pathDebugToggle = document.getElementById('path-debug-toggle');
        this.hudDebugSetting = document.getElementById('hud-debug-setting');
        this.hudDebugToggle = document.getElementById('hud-debug-toggle');
        this.hudDebugPanel = document.getElementById('hud-debug-panel');
        this.hudScaleMinInput = document.getElementById('hud-scale-min');
        this.hudScaleMaxInput = document.getElementById('hud-scale-max');
        this.hudScaleMinValue = document.getElementById('hud-scale-min-value');
        this.hudScaleMaxValue = document.getElementById('hud-scale-max-value');
        this.hudDebugResetBtn = document.getElementById('hud-debug-reset');
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
        this.chatModeMenu = document.getElementById('chat-mode-menu');
        this.chatModeOptions = [...document.querySelectorAll('.chat-mode-option')];
        this.chatLayoutOverrideMode = null;
        this.lastMoveAck = null;
        this.lastMoveSent = null;
        this.moveReqCounter = 0;
        this.autoAttackEnabled = true;
        this.localPlannedPath = [];
        this.chatBubbles = {};
        this.combatProjectiles = [];
        this.skillEffects = [];

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
        this.resetHotbarBindingsToDefault();
        this.menuAttrs = document.getElementById('menu-attrs');
        this.menuInventory = document.getElementById('menu-inventory');
        this.menuSkills = document.getElementById('menu-skills');
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
        this.skillsPanel = document.getElementById('skills-panel');
        this.skillsHeader = document.getElementById('skills-header');
        this.skillsTabHoly = document.getElementById('skills-tab-holy');
        this.skillsTabBlood = document.getElementById('skills-tab-blood');
        this.skillsPointsLabel = document.getElementById('skills-points-label');
        this.skillsTreeWrap = document.getElementById('skills-tree-wrap');
        this.skillsAutoSlot = document.getElementById('skills-auto-slot');
        this.skillsModularGrid = document.getElementById('skills-modular-grid');
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
            str: 0,
            int: 0,
            dex: 0,
            vit: 0
        };
        this.skillStateStorageKey = 'noxis.skillTree.v1';
        this.skillTreeTab = 'buildA';
        this.skillTreeNodes = this.buildSkillTreeNodes();
        this.selectedAutoAttackSkillId = 'class_primary';
        this.modularSkillIds = [];
        this.loadSkillStateFromStorage();
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
        this.tiledMapLayouts = {};
        this.tiledMapLoadState = {};
        this.tiledTilesets = {};
        this.tiledTilesetLoadState = {};
        this.tiledRenderCache = {};
        this.forestDecor = [];
        this.minimapViewSize = 1850;
        this.minimapLastDrawAt = 0;
        this.worldmapLastDrawAt = 0;
        this.minimapDrawIntervalMs = 120;
        this.worldmapDrawIntervalMs = 140;
        this.fpsWindowStartAt = 0;
        this.fpsFrameCount = 0;
        this.fpsValue = 0;
        this.networkPingMs = null;
        this.perfHudLastPaintAt = 0;
        this.perfHudPaintIntervalMs = 250;
        this.perfHudDirty = true;
        this.loadTiledMapLayout('A1');
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
        this.updateSkillInjections();
        this.setupEvents();
        this.renderHotbar();
        this.renderSkillsPanel();
        this.updateGroundItemCursor();
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
            this.hoveredGroundItemId = this.getGroundItemAt(world.x, world.y);
            this.updateGroundItemCursor();
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredGroundItemId = null;
            this.updateGroundItemCursor();
        });

        const handleWorldClick = (clientX, clientY) => {
            if (this.isDead) return;
            const world = this.toWorldCoordsFromClient(clientX, clientY);
            const itemId = this.getGroundItemAt(world.x, world.y) || this.getNearestGroundItemAt(world.x, world.y, 32);
            if (itemId) {
                this.tryPickupGroundItem(itemId);
                return;
            }
            this.cancelPendingPickup();
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
                target.closest('#skills-panel') ||
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
                this.selectedMobId = null;
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
            if (e.key.toLowerCase() !== 'v') return;
            this.toggleSkillsPanel();
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
            if (e.code !== 'Space') return;
            e.preventDefault();
            this.tryPickupNearestGroundItem();
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
        if (this.menuSkills) {
            this.menuSkills.addEventListener('click', () => {
                if (!this.localId) return;
                this.toggleSkillsPanel();
            });
        }
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
            btn.addEventListener('dragend', (e) => {
                btn.classList.remove('hovered');
                const key = String(btn.dataset.key || '').toLowerCase();
                if (!key) return;
                const droppedOver = document.elementFromPoint(e.clientX, e.clientY);
                if (droppedOver?.closest('#skillbar-wrap')) return;
                this.hotbarBindings[key] = null;
                this.persistHotbarBindings();
                this.renderHotbar();
            });
            btn.addEventListener('mousemove', (e) => {
                const key = String(btn.dataset.key || '').toLowerCase();
                if (!key) return;
                const binding = this.hotbarBindings[key];
                if (binding?.type === 'action' && binding.actionId === 'skill_cast' && binding.skillId) {
                    const node = this.getSkillNodeById(String(binding.skillId));
                    if (node) {
                        const level = this.getSkillNodeLevel(node.id);
                        this.openSkillTooltip(node, level, e.clientX, e.clientY, 'hotbar_skill_hover');
                        return;
                    }
                }
                const item = this.findHotbarBindingItem(binding);
                if (!item) return;
                this.openItemTooltip(item, e.clientX, e.clientY, 'hotbar_hover', {
                    placement: 'top-right',
                    anchorElement: btn
                });
            });
            btn.addEventListener('mouseleave', () => {
                this.scheduleTooltipClose();
            });
        });
        if (this.skillsTabHoly) {
            this.skillsTabHoly.addEventListener('click', () => {
                this.skillTreeTab = 'buildA';
                this.renderSkillsPanel();
            });
        }
        if (this.skillsTabBlood) {
            this.skillsTabBlood.addEventListener('click', () => {
                this.skillTreeTab = 'buildB';
                this.renderSkillsPanel();
            });
        }
        if (this.skillsTreeWrap) {
            this.skillsTreeWrap.addEventListener('pointerdown', (e) => {
                const targetEl = e.target && e.target.nodeType === 3
                    ? e.target.parentElement
                    : e.target;
                const learnBtn = targetEl && typeof targetEl.closest === 'function'
                    ? targetEl.closest('.skills-learn-btn')
                    : null;
                if (!learnBtn) return;
                e.preventDefault();
                e.stopPropagation();
                const nodeId = String(learnBtn.dataset.nodeId || '');
                if (!nodeId) return;
                this.tryLearnSkillNode(nodeId);
            });
        }
        if (this.skillsAutoSlot) {
            this.skillsAutoSlot.addEventListener('click', () => {
                this.cycleAutoAttackSkill();
            });
        }

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
        if (this.hudDebugToggle) {
            this.hudDebugToggle.addEventListener('change', () => {
                if (this.playerRole !== 'adm') {
                    this.hudDebugToggle.checked = false;
                    return;
                }
                this.updateHudDebugPanelUI();
                this.updateHudLayout();
            });
        }
        if (this.hudScaleMinInput) {
            this.hudScaleMinInput.addEventListener('input', () => {
                this.updateHudDebugPanelUI();
                this.updateHudLayout();
            });
        }
        if (this.hudScaleMaxInput) {
            this.hudScaleMaxInput.addEventListener('input', () => {
                this.updateHudDebugPanelUI();
                this.updateHudLayout();
            });
        }
        if (this.hudDebugResetBtn) {
            this.hudDebugResetBtn.addEventListener('click', () => {
                if (this.hudScaleMinInput) this.hudScaleMinInput.value = '84';
                if (this.hudScaleMaxInput) this.hudScaleMaxInput.value = '106';
                if (this.hudDebugToggle) this.hudDebugToggle.checked = false;
                this.updateHudDebugPanelUI();
                this.updateHudLayout();
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

        this.chatToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.chatModeMenu) this.chatModeMenu.classList.toggle('hidden');
        });
        this.chatModeOptions.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const mode = String(btn.dataset.mode || 'expanded');
                this.chatLayoutOverrideMode = mode === 'compact' || mode === 'mini' ? mode : 'expanded';
                if (this.chatModeMenu) this.chatModeMenu.classList.add('hidden');
                this.updateHudLayout();
            });
        });
        window.addEventListener('click', (e) => {
            const target = e.target;
            if (!this.chatModeMenu || this.chatModeMenu.classList.contains('hidden')) return;
            const insideChat = target && typeof target.closest === 'function' && target.closest('#chat-wrap');
            if (!insideChat) this.chatModeMenu.classList.add('hidden');
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
        this.makeDraggable(this.skillsPanel, this.skillsHeader, true);
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

    toggleSkillsPanel() {
        this.closeAllTooltips('ui_window_focus_changed');
        this.skillsPanel.classList.toggle('hidden');
        this.renderSkillsPanel();
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
        this.cancelPendingPickup();
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

    sendCharacterCreate(payload) {
        this.network.send({ type: 'character_create', ...payload });
        if (this.menu) this.menu.setStatus('Criando personagem...');
    }

    sendCharacterEnter(slot) {
        this.network.send({ type: 'character_enter', slot: Number(slot) });
        if (this.menu) this.menu.setStatus('Entrando no mundo...');
    }

    /**
     * Exibe mensagens de autenticação na UI.
     */
    onAuthMessage(message) {
        if (this.menu) this.menu.setStatus(message.message, message.type === 'auth_error');
    }

    onCharacterRequired(message) {
        if (!this.menu) return;
        this.menu.showCharacterRequired(message.message || 'Crie seu personagem para continuar.');
    }

    onCharacterSelect(message) {
        if (!this.menu) return;
        this.menu.showCharacterSelect(message);
    }

    /**
     * Finaliza login no cliente e habilita HUD/jogo.
     */
    onAuthSuccess(message) {
        this.resetSessionUiState();
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
        if (this.perfHud) this.perfHud.classList.remove('hidden');
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
        this.minimapLastDrawAt = 0;
        this.worldmapLastDrawAt = 0;
        this.fpsWindowStartAt = 0;
        this.fpsFrameCount = 0;
        this.fpsValue = 0;
        this.perfHudDirty = true;
        this.refreshPerformanceHud(true);

        if (!this.started) {
            this.started = true;
            this.startLoop();
        }
        this.network.send({ type: 'friend.list' });
        this.renderPartyPanel();
        this.renderPartyFrames();
        this.renderPartyNotifications();
        this.applyHotbarBindings(message.hotbarBindings);
        this.renderHotbar();
        this.renderSkillsPanel();
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
        this.onPingUpdated(null);
        this.friendsState = { friends: [], incoming: [], outgoing: [] };
        this.resetPendingStatAllocation();
        this.isDead = false;
        this.pendingPickup = null;
        this.hoveredGroundItemId = null;
        this.skillEffects = [];
        this.resetHotbarBindingsToDefault();
        this.updateGroundItemCursor();
        this.reviveOverlay.classList.add('hidden');
        this.clearPlayerTarget();
        this.renderPartyPanel();
        this.renderPartyFrames();
        this.renderPartyNotifications();
        this.renderFriendsPanel();
        this.renderFriendNotifications();
        this.localId = null;
        this.canvas.style.display = 'none';
        if (this.perfHud) this.perfHud.classList.add('hidden');
        this.fpsWindowStartAt = 0;
        this.fpsFrameCount = 0;
        this.fpsValue = 0;
        this.perfHudDirty = true;
        this.playerCard.classList.add('hidden');
        this.minimapWrap.classList.add('hidden');
        this.chatWrap.classList.add('hidden');
        this.skillbarWrap.classList.add('hidden');
        this.menusWrap.classList.add('hidden');
        if (this.menu) {
            this.menu.showLogin();
            this.menu.setStatus('Conexao encerrada.', true);
        }
    }

    onPingUpdated(pingMs) {
        this.networkPingMs = Number.isFinite(Number(pingMs)) ? Math.max(0, Number(pingMs)) : null;
        this.perfHudDirty = true;
        this.refreshPerformanceHud(true);
    }

    resetSessionUiState() {
        this.players = {};
        this.mobs = {};
        this.groundItems = {};
        this.inventory = [];
        this.equippedWeaponId = null;
        this.selectedMobId = null;
        this.selectedPlayerId = null;
        this.pendingPickup = null;
        this.hoveredGroundItemId = null;
        this.skillEffects = [];
        this.closeAllTooltips('session_reset');
        this.resetHotbarBindingsToDefault();
        try {
            if (window?.localStorage) {
                window.localStorage.removeItem('noxis.hotbarBindings.v1');
            }
        } catch {
            // noop
        }
    }

    /**
     * Recebe confirmação do servidor para comando de movimento.
     */
    onMoveAck(message) {
        this.lastMoveAck = message;
        if (!this.localId || !this.players[this.localId]) return;
        this.players[this.localId].pathNodes = Array.isArray(message.pathNodes) ? message.pathNodes : [];
    }

    /**
     * Recebe snapshot do inventário do servidor.
     */
    onInventoryState(message) {
        this.closeAllTooltips('inventory_state_commit');
        this.inventory = Array.isArray(message.inventory) ? message.inventory : [];
        this.equippedWeaponId = message.equippedWeaponId || null;
        this.syncLocalEquippedWeaponName();
        this.updateSkillInjections();
        this.pruneInvalidHotbarItems();
        this.renderHotbar();
        this.renderSkillsPanel();
        this.renderInventory();
        this.updatePanel();
    }

    onHotbarState(message) {
        if (!this.localId) return;
        this.applyHotbarBindings(message?.bindings);
        this.renderHotbar();
    }

    syncLocalEquippedWeaponName() {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        const equipped = this.inventory.find((it) => String(it.id) === String(this.equippedWeaponId || ''));
        me.equippedWeaponName = equipped ? equipped.name : null;
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

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            p.facing = this.resolveFacing(dx, dy);
        }

        p.hitAnim = { until: Date.now() + 120, ox: ux * 8, oy: uy * 8 };
        p.attackAnim = { startedAt: Date.now(), until: Date.now() + 420 };
        if (p.class === 'bandit' || p.class === 'assassin' || p.class === 'archer') this.banditSwingTick[String(p.id)] = (this.banditSwingTick[String(p.id)] || 0) + 1;
        if (p.class === 'shifter' || p.class === 'druid') {
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
            const dx = Number(message.targetX ?? (target ? target.x : attacker.x)) - Number(message.attackerX ?? attacker.x);
            const dy = Number(message.targetY ?? (target ? target.y : attacker.y)) - Number(message.attackerY ?? attacker.y);
            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                attacker.facing = this.resolveFacing(dx, dy);
            }
            attacker.attackAnim = { startedAt: Date.now(), until: Date.now() + 300 };
            if (attacker.class === 'bandit' || attacker.class === 'assassin' || attacker.class === 'archer') this.banditSwingTick[String(attacker.id)] = (this.banditSwingTick[String(attacker.id)] || 0) + 1;
            if (attacker.class === 'shifter' || attacker.class === 'druid') {
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

    onSkillEffect(message) {
        const now = Date.now();
        const x = Number(message?.x);
        const y = Number(message?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        this.skillEffects.push({
            x,
            y,
            effectKey: String(message?.effectKey || 'skill'),
            startedAt: now,
            expiresAt: now + 700
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
        me.skillLevels = message.skillLevels && typeof message.skillLevels === 'object' ? message.skillLevels : (me.skillLevels || {});
        me.skillPointsAvailable = Number.isFinite(Number(message.skillPointsAvailable)) ? Math.max(0, Number(message.skillPointsAvailable)) : Number(me.skillPointsAvailable || 0);
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
        this.updateSkillInjections();
        this.renderSkillsPanel();
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
        const renderX = (event.clientX - rect.left) * sx + this.camera.x;
        const renderY = (event.clientY - rect.top) * sy + this.camera.y;
        return this.renderToWorldCoords(renderX, renderY);
    }

    /**
     * Converte clientX/clientY para coordenada do mundo.
     */
    toWorldCoordsFromClient(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / Math.max(1, rect.width);
        const sy = this.canvas.height / Math.max(1, rect.height);
        const renderX = (clientX - rect.left) * sx + this.camera.x;
        const renderY = (clientY - rect.top) * sy + this.camera.y;
        return this.renderToWorldCoords(renderX, renderY);
    }

    getMinimapWorldRect() {
        const me = this.localId ? this.players[this.localId] : null;
        const viewSize = Math.max(700, Math.min(this.minimapViewSize, Math.min(this.mapWidth, this.mapHeight)));
        if (!me) {
            return { x: 0, y: 0, w: viewSize, h: viewSize };
        }
        const focus = this.worldToRenderCoords(me.x, me.y);
        const half = viewSize / 2;
        return {
            x: Math.max(0, Math.min(this.mapWidth - viewSize, focus.x - half)),
            y: Math.max(0, Math.min(this.mapHeight - viewSize, focus.y - half)),
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
        const renderX = worldRect.x + nx * worldRect.w;
        const renderY = worldRect.y + ny * worldRect.h;
        return this.renderToWorldCoords(renderX, renderY);
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
            if (Math.abs(x - it.x) <= this.groundItemHitHalfSize && Math.abs(y - it.y) <= this.groundItemHitHalfSize) {
                return id;
            }
        }
        return null;
    }

    getNearestGroundItemAt(x, y, maxDistance = 32) {
        let nearestId = null;
        let nearestDistSq = maxDistance * maxDistance;
        for (const id of Object.keys(this.groundItems)) {
            const it = this.groundItems[id];
            if (!it) continue;
            const dx = Number(x) - Number(it.x);
            const dy = Number(y) - Number(it.y);
            const d2 = dx * dx + dy * dy;
            if (d2 <= nearestDistSq) {
                nearestDistSq = d2;
                nearestId = id;
            }
        }
        return nearestId;
    }

    updateGroundItemCursor() {
        if (!this.canvas) return;
        this.canvas.style.cursor = this.hoveredGroundItemId ? 'grab' : 'default';
    }

    cancelPendingPickup() {
        this.pendingPickup = null;
    }

    tryPickupGroundItem(itemId) {
        if (!itemId) return;
        if (!this.localId || !this.players[this.localId]) return;
        const item = this.groundItems[itemId];
        if (!item) return;
        const now = Date.now();
        this.pendingPickup = {
            itemId: String(itemId),
            targetX: Number(item.x),
            targetY: Number(item.y),
            lastTryAt: 0,
            lastMoveAt: 0,
            createdAt: now
        };
        const me = this.players[this.localId];
        const inRange = Math.hypot(Number(item.x) - Number(me.x), Number(item.y) - Number(me.y)) <= this.pickupInteractRange;
        if (inRange) {
            this.pendingPickup.lastTryAt = now;
            this.network.send({ type: 'pickup_item', itemId: String(itemId) });
            return;
        }
        const reqId = `m-${++this.moveReqCounter}-${Date.now()}`;
        this.network.send({ type: 'move', reqId, x: Number(item.x), y: Number(item.y) });
        this.lastMoveSent = { reqId, x: Number(item.x), y: Number(item.y), at: Date.now() };
        this.pendingPickup.lastMoveAt = now;
    }

    processPendingPickup() {
        if (!this.pendingPickup) return;
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        const pendingItem = this.groundItems[this.pendingPickup.itemId];
        if (!pendingItem) {
            this.pendingPickup = null;
            return;
        }

        const now = Date.now();
        if (now - Number(this.pendingPickup.createdAt || 0) > 10000) {
            this.pendingPickup = null;
            return;
        }

        const dist = Math.hypot(Number(pendingItem.x) - Number(me.x), Number(pendingItem.y) - Number(me.y));
        if (dist <= this.pickupInteractRange) {
            if (now - Number(this.pendingPickup.lastTryAt || 0) < 180) return;
            this.pendingPickup.lastTryAt = now;
            this.network.send({ type: 'pickup_item', itemId: this.pendingPickup.itemId });
            return;
        }

        if (now - Number(this.pendingPickup.lastMoveAt || 0) < 350) return;
        const reqId = `m-${++this.moveReqCounter}-${now}`;
        this.network.send({ type: 'move', reqId, x: Number(pendingItem.x), y: Number(pendingItem.y) });
        this.lastMoveSent = { reqId, x: Number(pendingItem.x), y: Number(pendingItem.y), at: now };
        this.pendingPickup.lastMoveAt = now;
    }

    tryPickupNearestGroundItem() {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];

        if (this.pendingPickup) {
            const pendingItem = this.groundItems[this.pendingPickup.itemId];
            if (pendingItem) {
                const pendingDist = Math.hypot(Number(pendingItem.x) - Number(me.x), Number(pendingItem.y) - Number(me.y));
                if (pendingDist <= this.pickupInteractRange) {
                    this.network.send({ type: 'pickup_item', itemId: this.pendingPickup.itemId });
                    return;
                }
            }
        }

        const nearby = [];
        for (const id of Object.keys(this.groundItems)) {
            const item = this.groundItems[id];
            if (!item) continue;
            const dist = Math.hypot(Number(item.x) - Number(me.x), Number(item.y) - Number(me.y));
            if (dist <= this.pickupInteractRange) nearby.push(id);
        }
        if (!nearby.length) return;
        const randomIndex = Math.floor(Math.random() * nearby.length);
        const itemId = nearby[randomIndex];
        this.network.send({ type: 'pickup_item', itemId });
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
            if (targetMode !== 'group' && targetMode !== 'evil') return { ok: false, reason: 'Modo Grupo so ataca jogadores nos modos Grupo ou Mal.' };
            return { ok: true };
        }
        if (mode === 'evil') {
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
            const allowed = this.canStartPvpAgainstTarget(me, target, true);
            if (!allowed.ok) continue;
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

    buildSkillTreeNodes() {
        const byClass = {
            knight: {
                buildA: {
                    label: 'Bastiao',
                    skills: [
                        ['war_bastion_escudo_fe', 'Escudo da Fe'],
                        ['war_bastion_muralha', 'Muralha'],
                        ['war_bastion_renovacao', 'Renovacao'],
                        ['war_bastion_inabalavel', 'Inabalavel'],
                        ['war_bastion_impacto_sismico', 'Impacto Sismico']
                    ]
                },
                buildB: {
                    label: 'Carrasco',
                    skills: [
                        ['war_carrasco_frenesi', 'Frenesi'],
                        ['war_carrasco_lacerar', 'Lacerar'],
                        ['war_carrasco_ira', 'Ira'],
                        ['war_carrasco_golpe_sacrificio', 'Golpe Sacrificio'],
                        ['war_carrasco_aniquilacao', 'Aniquilacao']
                    ]
                }
            },
            archer: {
                buildA: {
                    label: 'Patrulheiro',
                    skills: [
                        ['arc_patrulheiro_tiro_ofuscante', 'Tiro Ofuscante'],
                        ['arc_patrulheiro_foco_distante', 'Foco Distante'],
                        ['arc_patrulheiro_abrolhos', 'Abrolhos'],
                        ['arc_patrulheiro_salva_flechas', 'Salva de Flechas'],
                        ['arc_patrulheiro_passo_vento', 'Passo de Vento']
                    ]
                },
                buildB: {
                    label: 'Franco',
                    skills: [
                        ['arc_franco_flecha_debilitante', 'Flecha Debilitante'],
                        ['arc_franco_ponteira_envenenada', 'Ponteira Envenenada'],
                        ['arc_franco_olho_aguia', 'Olho de Aguia'],
                        ['arc_franco_disparo_perfurante', 'Disparo Perfurante'],
                        ['arc_franco_tiro_misericordia', 'Tiro Misericordia']
                    ]
                }
            },
            druid: {
                buildA: {
                    label: 'Preservador',
                    skills: [
                        ['dru_preservador_florescer', 'Florescer'],
                        ['dru_preservador_casca_ferro', 'Casca de Ferro'],
                        ['dru_preservador_emaranhado', 'Emaranhado'],
                        ['dru_preservador_prece_natureza', 'Prece Natureza'],
                        ['dru_preservador_avatar_espiritual', 'Avatar Espiritual']
                    ]
                },
                buildB: {
                    label: 'Primal',
                    skills: [
                        ['dru_primal_espinhos', 'Espinhos'],
                        ['dru_primal_enxame', 'Enxame'],
                        ['dru_primal_patada_sombria', 'Patada Sombria'],
                        ['dru_primal_nevoa_obscura', 'Nevoa Obscura'],
                        ['dru_primal_invocacao_primal', 'Invocacao Primal']
                    ]
                }
            },
            assassin: {
                buildA: {
                    label: 'Agil',
                    skills: [
                        ['ass_agil_reflexos', 'Reflexos'],
                        ['ass_agil_contra_ataque', 'Contra-Ataque'],
                        ['ass_agil_passo_fantasma', 'Passo Fantasma'],
                        ['ass_agil_golpe_nervos', 'Golpe de Nervos'],
                        ['ass_agil_miragem', 'Miragem']
                    ]
                },
                buildB: {
                    label: 'Letal',
                    skills: [
                        ['ass_letal_expor_fraqueza', 'Expor Fraqueza'],
                        ['ass_letal_ocultar', 'Ocultar'],
                        ['ass_letal_emboscada', 'Emboscada'],
                        ['ass_letal_bomba_fumaca', 'Bomba de Fumaca'],
                        ['ass_letal_sentenca', 'Sentenca']
                    ]
                }
            }
        };

        const out = [];
        for (const [classId, classDef] of Object.entries(byClass)) {
            const leftX = 14;
            const rightX = 48;
            const yStart = 8;
            const yStep = 18;
            classDef.buildA.skills.forEach((row, idx) => {
                out.push({
                    id: row[0],
                    classId,
                    buildKey: 'buildA',
                    buildLabel: classDef.buildA.label,
                    label: row[1],
                    x: leftX,
                    y: yStart + idx * yStep,
                    prereq: idx > 0 ? classDef.buildA.skills[idx - 1][0] : null,
                    maxPoints: 5,
                    autoEligible: true
                });
            });
            classDef.buildB.skills.forEach((row, idx) => {
                out.push({
                    id: row[0],
                    classId,
                    buildKey: 'buildB',
                    buildLabel: classDef.buildB.label,
                    label: row[1],
                    x: rightX,
                    y: yStart + idx * yStep,
                    prereq: idx > 0 ? classDef.buildB.skills[idx - 1][0] : null,
                    maxPoints: 5,
                    autoEligible: true
                });
            });
        }
        return out;
    }

    getCurrentSkillClassId() {
        if (!this.localId || !this.players[this.localId]) return 'knight';
        const raw = String(this.players[this.localId].class || 'knight');
        if (raw === 'bandit') return 'assassin';
        if (raw === 'shifter') return 'druid';
        return raw;
    }

    loadSkillStateFromStorage() {
        try {
            if (!window || !window.localStorage) return;
            const raw = window.localStorage.getItem(this.skillStateStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            this.selectedAutoAttackSkillId = typeof parsed.autoAttackSkillId === 'string' && parsed.autoAttackSkillId
                ? parsed.autoAttackSkillId
                : 'class_primary';
        } catch {
            // noop
        }
    }

    persistSkillStateToStorage() {
        try {
            if (!window || !window.localStorage) return;
            window.localStorage.setItem(this.skillStateStorageKey, JSON.stringify({
                autoAttackSkillId: this.selectedAutoAttackSkillId
            }));
        } catch {
            // noop
        }
    }

    getLocalSkillLevels() {
        if (!this.localId || !this.players[this.localId]) return {};
        const raw = this.players[this.localId].skillLevels;
        if (!raw || typeof raw !== 'object') return {};
        return raw;
    }

    getSkillPointsAvailable() {
        if (!this.localId || !this.players[this.localId]) return 0;
        const me = this.players[this.localId];
        const provided = Number(me.skillPointsAvailable);
        if (Number.isFinite(provided)) return Math.max(0, Math.floor(provided));
        const level = Math.max(1, Math.floor(Number(me.level || 1)));
        const levels = this.getLocalSkillLevels();
        const spent = Object.values(levels).reduce((sum, raw) => sum + Math.max(0, Math.min(5, Math.floor(Number(raw || 0)))), 0);
        return Math.max(0, (level - 1) - spent);
    }

    getSkillNodeById(nodeId) {
        return this.skillTreeNodes.find((node) => node.id === nodeId) || null;
    }

    isSkillNodeLearned(nodeId) {
        const levels = this.getLocalSkillLevels();
        return Number(levels[nodeId] || 0) > 0;
    }

    getSkillNodeLevel(nodeId) {
        const levels = this.getLocalSkillLevels();
        return Math.max(0, Math.min(5, Number(levels[nodeId] || 0)));
    }

    canLearnSkillNode(node) {
        if (!node) return { ok: false, reason: 'Habilidade invalida.' };
        const current = this.getSkillNodeLevel(node.id);
        if (current >= Number(node.maxPoints || 1)) return { ok: false, reason: 'Nivel maximo atingido.' };
        if (node.prereq) {
            const prereqLevel = this.getSkillNodeLevel(node.prereq);
            if (prereqLevel < 1) return { ok: false, reason: 'Aprenda o pre-requisito antes desta habilidade.' };
        }
        if (this.getSkillPointsAvailable() <= 0) return { ok: false, reason: 'Sem pontos de habilidade disponiveis.' };
        return { ok: true };
    }

    tryLearnSkillNode(nodeId) {
        const node = this.getSkillNodeById(nodeId);
        const allowed = this.canLearnSkillNode(node);
        if (!allowed.ok) {
            if (allowed.reason) this.onSystemMessage({ text: allowed.reason });
            return;
        }
        this.network.send({ type: 'skill.learn', skillId: node.id });
    }

    getSkillTooltipMeta(skillId) {
        const catalog = {
            war_bastion_escudo_fe: { name: 'Selo da Fe', mana: '20', cd: 'Passiva', desc: 'Impregna a armadura com energia divina.', effects: ['Aumenta PDEF/MDEF em 5%.', 'Aumenta PDEF/MDEF em 10%.', 'Aumenta PDEF/MDEF em 15%.', 'Aumenta PDEF/MDEF em 20%.', 'Aumenta PDEF/MDEF em 25%.'] },
            war_bastion_muralha: { name: 'Muralha', mana: '45', cd: '15s', desc: 'Ergue uma barreira de luz frontal.', effects: ['Reflete 5% do dano recebido.', 'Reflete 10% do dano recebido.', 'Reflete 15% do dano recebido.', 'Reflete 20% do dano recebido.', 'Reflete 25% do dano recebido.'] },
            war_bastion_renovacao: { name: 'Renovacao', mana: '60', cd: '30s', desc: 'Canaliza vitalidade para curar feridas.', effects: ['Recupera 2% do HP max por segundo.', 'Recupera 4% do HP max por segundo.', 'Recupera 6% do HP max por segundo.', 'Recupera 8% do HP max por segundo.', 'Recupera 10% do HP max por segundo.'] },
            war_bastion_inabalavel: { name: 'Inabalavel', mana: '100', cd: '60s', desc: 'Torna o corpo duro como aco.', effects: ['Reduz dano em 50% por 10s.', 'Reduz dano em 60% por 10s.', 'Reduz dano em 70% por 10s.', 'Reduz dano em 80% por 10s.', 'Reduz dano em 90% por 10s.'] },
            war_bastion_impacto_sismico: { name: 'Impacto Sismico', mana: '80', cd: '25s', desc: 'Golpeia o chao com forca tectonica.', effects: ['Atordoa inimigos em area por 1s.', 'Atordoa inimigos em area por 1.6s.', 'Atordoa inimigos em area por 2.2s.', 'Atordoa inimigos em area por 2.8s.', 'Atordoa inimigos em area por 3.5s.'] },
            war_carrasco_frenesi: { name: 'Frenesi', mana: '15', cd: 'Passiva', desc: 'O cheiro de sangue aumenta sua regeneracao.', effects: ['Roubo de Vida: 3%.', 'Roubo de Vida: 6%.', 'Roubo de Vida: 9%.', 'Roubo de Vida: 12%.', 'Roubo de Vida: 15%.'] },
            war_carrasco_lacerar: { name: 'Lacerar', mana: '40', cd: '8s', desc: 'Um corte que deixa feridas abertas.', effects: ['Sangramento: 10% do PATK por 5s.', 'Sangramento: 20% do PATK por 5s.', 'Sangramento: 30% do PATK por 5s.', 'Sangramento: 40% do PATK por 5s.', 'Sangramento: 50% do PATK por 5s.'] },
            war_carrasco_ira: { name: 'Ira', mana: '50', cd: '40s', desc: 'Entra em estado de furia berserker.', effects: ['ATK +10%.', 'ATK +20%.', 'ATK +30%.', 'ATK +40%.', 'ATK +50%.'] },
            war_carrasco_golpe_sacrificio: { name: 'Sacrificio', mana: '30', cd: '20s', desc: 'Troca vitalidade por precisao letal.', effects: ['Consome 10% HP e ganha 20% de critico.', 'Consome 10% HP e ganha 40% de critico.', 'Consome 10% HP e ganha 60% de critico.', 'Consome 10% HP e ganha 80% de critico.', 'Consome 10% HP e ganha 100% de critico.'] },
            war_carrasco_aniquilacao: { name: 'Aniquilacao', mana: '120', cd: '50s', desc: 'Golpe devastador focado em finalizar o alvo.', effects: ['Dano fisico de 200%.', 'Dano fisico de 275%.', 'Dano fisico de 350%.', 'Dano fisico de 425%.', 'Dano fisico de 500%.'] },
            arc_patrulheiro_tiro_ofuscante: { name: 'Tiro Ofuscante', mana: '30', cd: '12s', desc: 'Dispara uma flecha de luz que cega o oponente.', effects: ['Reduz precisao inimiga em 10%.', 'Reduz precisao inimiga em 20%.', 'Reduz precisao inimiga em 30%.', 'Reduz precisao inimiga em 40%.', 'Reduz precisao inimiga em 50%.'] },
            arc_patrulheiro_foco_distante: { name: 'Foco Distante', mana: '10', cd: 'Passiva', desc: 'Concentracao extrema para tiros de longa distancia.', effects: ['+50 de alcance.', '+100 de alcance.', '+150 de alcance.', '+200 de alcance.', '+250 de alcance.'] },
            arc_patrulheiro_abrolhos: { name: 'Abrolhos', mana: '40', cd: '18s', desc: 'Espalha armadilhas de espinhos no solo.', effects: ['Prende por 1s.', 'Prende por 1.8s.', 'Prende por 2.6s.', 'Prende por 3.3s.', 'Prende por 4s.'] },
            arc_patrulheiro_salva_flechas: { name: 'Salva de Flechas', mana: '75', cd: '22s', desc: 'Chuva de flechas em uma area circular.', effects: ['Dano em area: 120%.', 'Dano em area: 165%.', 'Dano em area: 210%.', 'Dano em area: 255%.', 'Dano em area: 300%.'] },
            arc_patrulheiro_passo_vento: { name: 'Passo de Vento', mana: '55', cd: '35s', desc: 'Invoca as correntes de ar para mover-se rapido.', effects: ['Velocidade +10%.', 'Velocidade +18%.', 'Velocidade +26%.', 'Velocidade +33%.', 'Velocidade +40%.'] },
            arc_franco_flecha_debilitante: { name: 'Flecha Debilitante', mana: '35', cd: '10s', desc: 'Flecha banhada em toxinas que impedem a cura.', effects: ['Reduz cura recebida em 20%.', 'Reduz cura recebida em 35%.', 'Reduz cura recebida em 50%.', 'Reduz cura recebida em 65%.', 'Reduz cura recebida em 80%.'] },
            arc_franco_ponteira_envenenada: { name: 'Ponteira Envenenada', mana: '20', cd: 'Passiva', desc: 'Seus ataques basicos aplicam veneno.', effects: ['Veneno: 5% por segundo.', 'Veneno: 10% por segundo.', 'Veneno: 15% por segundo.', 'Veneno: 20% por segundo.', 'Veneno: 25% por segundo.'] },
            arc_franco_olho_aguia: { name: 'Olho de Aguia', mana: '45', cd: '30s', desc: 'Identifica pontos fracos na armadura inimiga.', effects: ['Critico +5%.', 'Critico +11%.', 'Critico +17%.', 'Critico +23%.', 'Critico +30%.'] },
            arc_franco_disparo_perfurante: { name: 'Disparo Perfurante', mana: '65', cd: '15s', desc: 'Disparo potente que atravessa alvos em linha.', effects: ['Atravessa 2 alvos.', 'Atravessa 3 alvos.', 'Atravessa 4 alvos.', 'Atravessa 6 alvos.', 'Atravessa alvos ilimitados.'] },
            arc_franco_tiro_misericordia: { name: 'Tiro de Misericordia', mana: '100', cd: '45s', desc: 'Execucao a distancia para alvos com baixo HP.', effects: ['Dano de 150%.', 'Dano de 225%.', 'Dano de 300%.', 'Dano de 375%.', 'Dano de 450%.'] },
            dru_preservador_florescer: { name: 'Florescer', mana: '40', cd: '5s', desc: 'Faz a flora florescer instantaneamente no aliado.', effects: ['Cura 100 de HP.', 'Cura 350 de HP.', 'Cura 600 de HP.', 'Cura 900 de HP.', 'Cura 1200 de HP.'] },
            dru_preservador_casca_ferro: { name: 'Casca de Ferro', mana: '50', cd: '20s', desc: 'Endurece a pele do aliado como tronco de carvalho.', effects: ['Defesa +10%.', 'Defesa +19%.', 'Defesa +28%.', 'Defesa +36%.', 'Defesa +45%.'] },
            dru_preservador_emaranhado: { name: 'Emaranhado', mana: '45', cd: '15s', desc: 'Raizes emergem para impedir a fuga inimiga.', effects: ['Lentidao de 20%.', 'Lentidao de 35%.', 'Lentidao de 50%.', 'Lentidao de 70%.', 'Imobilizacao total.'] },
            dru_preservador_prece_natureza: { name: 'Prece da Natureza', mana: '90', cd: '40s', desc: 'Uma onda de energia vital emana do Druida.', effects: ['Cura AoE de 5% do HP.', 'Cura AoE de 10% do HP.', 'Cura AoE de 15% do HP.', 'Cura AoE de 20% do HP.', 'Cura AoE de 25% do HP.'] },
            dru_preservador_avatar_espiritual: { name: 'Avatar Espiritual', mana: '110', cd: '60s', desc: 'Sintoniza-se com o plano espiritual.', effects: ['Reduz custo de Mana em 10%.', 'Reduz custo de Mana em 20%.', 'Reduz custo de Mana em 30%.', 'Reduz custo de Mana em 40%.', 'Reduz custo de Mana em 50%.'] },
            dru_primal_espinhos: { name: 'Espinhos', mana: '30', cd: 'Passiva', desc: 'Protege-se com espinhos magicos.', effects: ['Devolve 5% do dano magico.', 'Devolve 10% do dano magico.', 'Devolve 15% do dano magico.', 'Devolve 20% do dano magico.', 'Devolve 25% do dano magico.'] },
            dru_primal_enxame: { name: 'Enxame', mana: '55', cd: '12s', desc: 'Insetos magicos drenam a energia do alvo.', effects: ['Drena 10 MP por segundo.', 'Drena 30 MP por segundo.', 'Drena 50 MP por segundo.', 'Drena 75 MP por segundo.', 'Drena 100 MP por segundo.'] },
            dru_primal_patada_sombria: { name: 'Patada Sombria', mana: '40', cd: '6s', desc: 'Invoca o poder de uma fera ancestral.', effects: ['Dano magico de 130%.', 'Dano magico de 177%.', 'Dano magico de 225%.', 'Dano magico de 272%.', 'Dano magico de 320%.'] },
            dru_primal_nevoa_obscura: { name: 'Nevoa Obscura', mana: '70', cd: '25s', desc: 'Cria um microclima de nevoa impenetravel.', effects: ['-10% de visao inimiga.', '-22% de visao inimiga.', '-35% de visao inimiga.', '-47% de visao inimiga.', '-60% de visao inimiga.'] },
            dru_primal_invocacao_primal: { name: 'Invocacao Primal', mana: '130', cd: '90s', desc: 'Invoca um companheiro animal para lutar.', effects: ['Pet causa 20% do ATK do Druida.', 'Pet causa 35% do ATK do Druida.', 'Pet causa 50% do ATK do Druida.', 'Pet causa 65% do ATK do Druida.', 'Pet causa 80% do ATK do Druida.'] },
            ass_agil_reflexos: { name: 'Reflexos', mana: '10', cd: 'Passiva', desc: 'Seus sentidos estao em constante alerta.', effects: ['Esquiva +5%.', 'Esquiva +11%.', 'Esquiva +17%.', 'Esquiva +23%.', 'Esquiva +30%.'] },
            ass_agil_contra_ataque: { name: 'Contra-Ataque', mana: '25', cd: '8s', desc: 'Aproveita a falha do inimigo para golpear.', effects: ['Multiplicador de dano 1.2x apos esquiva.', 'Multiplicador de dano 1.5x apos esquiva.', 'Multiplicador de dano 1.8x apos esquiva.', 'Multiplicador de dano 2.1x apos esquiva.', 'Multiplicador de dano 2.5x apos esquiva.'] },
            ass_agil_passo_fantasma: { name: 'Passo Fantasma', mana: '40', cd: '12s', desc: 'Move-se instantaneamente pelas sombras.', effects: ['Alcance de 3 tiles.', 'Alcance de 4 tiles.', 'Alcance de 5 tiles.', 'Alcance de 6 tiles.', 'Alcance de 8 tiles.'] },
            ass_agil_golpe_nervos: { name: 'Golpe de Nervos', mana: '50', cd: '15s', desc: 'Ataca pontos vitais que bloqueiam a fala.', effects: ['Silencio por 1s.', 'Silencio por 1.8s.', 'Silencio por 2.6s.', 'Silencio por 3.3s.', 'Silencio por 4s.'] },
            ass_agil_miragem: { name: 'Miragem', mana: '90', cd: '40s', desc: 'Cria ilusoes de si mesmo ao atacar.', effects: ['Clones causam 10% de dano adicional.', 'Clones causam 18% de dano adicional.', 'Clones causam 25% de dano adicional.', 'Clones causam 33% de dano adicional.', 'Clones causam 40% de dano adicional.'] },
            ass_letal_expor_fraqueza: { name: 'Expor Fraqueza', mana: '30', cd: '10s', desc: 'Identifica a brecha na guarda do alvo.', effects: ['Alvo recebe +10% de dano.', 'Alvo recebe +18% de dano.', 'Alvo recebe +26% de dano.', 'Alvo recebe +33% de dano.', 'Alvo recebe +40% de dano.'] },
            ass_letal_ocultar: { name: 'Ocultar', mana: '60', cd: '25s', desc: 'Torna-se invisivel a olho nu.', effects: ['Invisibilidade por 5s.', 'Invisibilidade por 10s.', 'Invisibilidade por 15s.', 'Invisibilidade por 22s.', 'Invisibilidade por 30s.'] },
            ass_letal_emboscada: { name: 'Emboscada', mana: '70', cd: '20s', desc: 'Ataque critico devastador a partir das sombras.', effects: ['Dano de 200% se invisivel.', 'Dano de 275% se invisivel.', 'Dano de 350% se invisivel.', 'Dano de 425% se invisivel.', 'Dano de 500% se invisivel.'] },
            ass_letal_bomba_fumaca: { name: 'Bomba de Fumaca', mana: '45', cd: '30s', desc: 'Joga uma bomba de fumaca para confundir oponentes.', effects: ['Reduz precisao inimiga em 20%.', 'Reduz precisao inimiga em 35%.', 'Reduz precisao inimiga em 50%.', 'Reduz precisao inimiga em 65%.', 'Reduz precisao inimiga em 80%.'] },
            ass_letal_sentenca: { name: 'Sentenca', mana: '120', cd: '50s', desc: 'Marca o alvo para a morte iminente.', effects: ['Dano adicional apos 3s: 15% do HP perdido.', 'Dano adicional apos 3s: 22.5% do HP perdido.', 'Dano adicional apos 3s: 30% do HP perdido.', 'Dano adicional apos 3s: 37.5% do HP perdido.', 'Dano adicional apos 3s: 45% do HP perdido.'] }
        };
        return catalog[String(skillId || '')] || null;
    }

    getSkillNodeIcon(node) {
        const meta = this.getSkillTooltipMeta(String(node?.id || ''));
        const rawName = String(meta?.name || node?.label || 'SK').trim();
        const compact = rawName
            .split(/\s+/)
            .map((part) => part[0] || '')
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return compact || 'SK';
    }

    openSkillTooltip(node, level, clientX, clientY, reason = 'skill_hover') {
        this.cancelTooltipTimers();
        const meta = this.getSkillTooltipMeta(String(node?.id || ''));
        const safeName = this.escapeHtml(String(meta?.name || node?.label || 'Habilidade'));
        const maxPoints = Math.max(1, Number(node?.maxPoints || 5));
        const safeLevel = Math.max(0, Math.min(maxPoints, Number(level || 0)));
        const effectText = this.escapeHtml(
            meta?.effects?.[Math.max(0, safeLevel - 1)] || meta?.effects?.[0] || 'Sem efeito configurado.'
        );
        const mana = this.escapeHtml(String(meta?.mana || '-'));
        const cd = this.escapeHtml(String(meta?.cd || '-'));
        const desc = this.escapeHtml(String(meta?.desc || ''));
        this.tooltipState.activeTooltipId = `skill:${String(node?.id || '')}`;
        this.tooltipState.lastOpenReason = reason;
        this.tooltip.style.width = '320px';
        this.tooltip.innerHTML = `
            <div><strong>${safeName}</strong></div>
            <div>Nivel: ${safeLevel}/${maxPoints}</div>
            <div>Mana: ${mana} | CD: ${cd}</div>
            <div>${desc}</div>
            <div>${effectText}</div>
        `;
        this.positionTooltip(clientX, clientY);
        this.tooltip.classList.remove('hidden');
    }

    getAutoAttackSkillDefinition(skillId) {
        if (!skillId || skillId === 'class_primary') return { id: 'class_primary', label: 'Atk Basico', source: 'base' };
        const node = this.getSkillNodeById(skillId);
        if (node && this.isSkillNodeLearned(node.id)) return { id: node.id, label: node.label, source: 'tree', classId: node.classId };
        if (this.modularSkillIds.includes(skillId)) {
            if (skillId === 'mod_fire_wing') return { id: 'mod_fire_wing', label: 'Asa de Fogo', source: 'mod' };
            return { id: skillId, label: 'Habilidade Mod.', source: 'mod' };
        }
        return null;
    }

    getAvailableAutoAttackSkills() {
        const result = [{ id: 'class_primary', label: 'Atk Basico', source: 'base' }];
        const currentClass = this.getCurrentSkillClassId();
        for (const node of this.skillTreeNodes) {
            if (node.classId !== currentClass) continue;
            if (!node.autoEligible || !this.isSkillNodeLearned(node.id)) continue;
            result.push({ id: node.id, label: node.label, source: 'tree' });
        }
        for (const skillId of this.modularSkillIds) {
            const existing = result.find((it) => it.id === skillId);
            if (existing) continue;
            if (skillId === 'mod_fire_wing') result.push({ id: skillId, label: 'Asa de Fogo', source: 'mod' });
            else result.push({ id: skillId, label: 'Habilidade Mod.', source: 'mod' });
        }
        return result;
    }

    cycleAutoAttackSkill() {
        const options = this.getAvailableAutoAttackSkills();
        if (!options.length) return;
        const currentIndex = options.findIndex((it) => it.id === this.selectedAutoAttackSkillId);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;
        this.selectedAutoAttackSkillId = options[nextIndex].id;
        this.persistSkillStateToStorage();
        this.renderSkillsPanel();
        this.renderHotbar();
    }

    triggerConfiguredAutoAttack() {
        const selected = this.getAutoAttackSkillDefinition(this.selectedAutoAttackSkillId);
        if (!selected || selected.id === 'class_primary') {
            this.triggerPrimaryAttack();
            return;
        }
        if (this.selectedPlayerId && this.players[this.selectedPlayerId]) {
            this.triggerPrimaryAttack();
            return;
        }
        if (!this.selectedMobId || !this.mobs[this.selectedMobId]) {
            this.onSystemMessage({ text: 'Selecione um alvo com a tecla \'.' });
            return;
        }
        this.network.send({
            type: 'skill.cast',
            skillId: selected.id,
            targetMobId: this.selectedMobId || null,
            targetPlayerId: null
        });
    }

    getInjectedSkillsFromItem(item) {
        if (!item) return [];
        const haystack = `${String(item.name || '')} ${String(item.type || '')}`.toLowerCase();
        const injected = [];
        if (haystack.includes('asa de fogo')) injected.push('mod_fire_wing');
        return injected;
    }

    updateSkillInjections() {
        const equippedItems = [];
        const equippedWeapon = this.inventory.find((it) => String(it.id) === String(this.equippedWeaponId || ''));
        if (equippedWeapon) equippedItems.push(equippedWeapon);
        for (const item of this.inventory) {
            if (item && item.equipped === true) equippedItems.push(item);
        }
        const injected = equippedItems.flatMap((item) => this.getInjectedSkillsFromItem(item));
        this.modularSkillIds = [...new Set(injected)];
        const stillValid = this.getAvailableAutoAttackSkills().some((it) => it.id === this.selectedAutoAttackSkillId);
        if (!stillValid) this.selectedAutoAttackSkillId = 'class_primary';
        this.persistSkillStateToStorage();
    }

    renderSkillsPanel() {
        if (!this.skillsPanel || !this.skillsTreeWrap || !this.skillsPointsLabel) return;
        const classId = this.getCurrentSkillClassId();
        const classNodes = this.skillTreeNodes.filter((node) => node.classId === classId);
        const buildALabel = classNodes.find((node) => node.buildKey === 'buildA')?.buildLabel || 'Build A';
        const buildBLabel = classNodes.find((node) => node.buildKey === 'buildB')?.buildLabel || 'Build B';
        if (this.skillTreeTab !== 'buildA' && this.skillTreeTab !== 'buildB') this.skillTreeTab = 'buildA';
        if (this.skillsTabHoly) {
            this.skillsTabHoly.textContent = buildALabel;
            this.skillsTabHoly.classList.toggle('active', this.skillTreeTab === 'buildA');
        }
        if (this.skillsTabBlood) {
            this.skillsTabBlood.textContent = buildBLabel;
            this.skillsTabBlood.classList.toggle('active', this.skillTreeTab === 'buildB');
        }
        this.skillsPointsLabel.textContent = `Pont. Hab.: ${this.getSkillPointsAvailable()}`;

        const nodes = classNodes.filter((node) => node.buildKey === this.skillTreeTab);
        this.skillsTreeWrap.innerHTML = '';
        const treeWidth = Math.max(320, Number(this.skillsTreeWrap.clientWidth || 0));
        const nodeHeightPx = 58;
        const nodeGapPx = 26;
        const startTopPx = 16;
        const sidePaddingPx = 10;
        const nodePositions = new Map();

        nodes.forEach((node, idx) => {
            const rawLeft = Math.round((Number(node.x || 0) / 100) * treeWidth);
            const left = Math.max(sidePaddingPx, Math.min(treeWidth - nodeHeightPx - sidePaddingPx, rawLeft));
            const top = startTopPx + idx * (nodeHeightPx + nodeGapPx);
            nodePositions.set(node.id, { left, top });
        });

        const contentHeight = nodes.length
            ? startTopPx + (nodes.length - 1) * (nodeHeightPx + nodeGapPx) + nodeHeightPx + 16
            : 360;
        this.skillsTreeWrap.style.setProperty('--skills-tree-content-height', `${Math.max(360, contentHeight)}px`);

        for (const node of nodes) {
            if (!node.prereq) continue;
            const fromNode = nodes.find((it) => it.id === node.prereq);
            if (!fromNode) continue;
            const fromPos = nodePositions.get(fromNode.id);
            const toPos = nodePositions.get(node.id);
            if (!fromPos || !toPos) continue;
            const link = document.createElement('div');
            link.className = 'skills-link';
            const x = fromPos.left + 27;
            const y = fromPos.top + nodeHeightPx;
            const height = Math.max(8, toPos.top - fromPos.top - nodeHeightPx + 2);
            link.style.left = `${x}px`;
            link.style.top = `${y}px`;
            link.style.width = '4px';
            link.style.height = `${height}px`;
            this.skillsTreeWrap.appendChild(link);
        }

        for (const node of nodes) {
            const level = this.getSkillNodeLevel(node.id);
            const prereqLevel = node.prereq ? this.getSkillNodeLevel(node.prereq) : 0;
            const prereqMet = !node.prereq || prereqLevel >= 1;
            const canLearn = prereqMet && this.getSkillPointsAvailable() > 0 && level < Number(node.maxPoints || 1);
            const btn = document.createElement('div');
            btn.className = 'skills-node';
            btn.dataset.nodeId = node.id;
            if (!prereqMet) btn.classList.add('locked');
            if (level > 0) btn.classList.add('learned');
            if (canLearn) btn.classList.add('available');
            const pos = nodePositions.get(node.id) || { left: sidePaddingPx, top: startTopPx };
            btn.style.left = `${pos.left}px`;
            btn.style.top = `${pos.top}px`;
            const shortLabel = node.label
                .replace('Sagrado', 'Sag.')
                .replace('Sombrio', 'Som.')
                .replace('Lamina', 'Lam.')
                .replace('Golpe', 'Gol.');
            const iconText = this.getSkillNodeIcon(node);
            btn.classList.add(node.buildKey === 'buildA' ? 'build-a' : 'build-b');
            const iconEl = document.createElement('span');
            iconEl.className = 'skill-icon';
            iconEl.textContent = iconText;
            const nameEl = document.createElement('span');
            nameEl.className = 'skill-name';
            nameEl.textContent = shortLabel;
            const lvlEl = document.createElement('span');
            lvlEl.className = 'lvl';
            lvlEl.textContent = `${level}/${node.maxPoints || 1}`;
            const plusEl = document.createElement('button');
            plusEl.type = 'button';
            plusEl.className = 'plus skills-learn-btn';
            plusEl.dataset.nodeId = node.id;
            plusEl.setAttribute('aria-label', `Aprender ${node.label}`);
            plusEl.textContent = '+';
            btn.appendChild(iconEl);
            btn.appendChild(nameEl);
            btn.appendChild(lvlEl);
            btn.appendChild(plusEl);
            btn.title = `${node.label} (${level}/${node.maxPoints || 1})`;
            btn.addEventListener('mouseenter', (e) => {
                this.openSkillTooltip(node, level, e.clientX, e.clientY, 'skill_hover');
            });
            btn.addEventListener('mousemove', (e) => {
                this.openSkillTooltip(node, level, e.clientX, e.clientY, 'skill_hover');
            });
            btn.addEventListener('mouseleave', () => {
                this.scheduleTooltipClose();
            });
            btn.draggable = level > 0;
            if (btn.draggable) {
                btn.addEventListener('dragstart', (e) => {
                    this.writeDragPayload(e.dataTransfer, {
                        source: 'skilltree',
                        skillId: node.id,
                        skillName: node.label
                    });
                });
            }
            this.skillsTreeWrap.appendChild(btn);
        }

        if (this.skillsAutoSlot) {
            const selected = this.getAutoAttackSkillDefinition(this.selectedAutoAttackSkillId) || { label: 'Atk Basico' };
            this.skillsAutoSlot.textContent = selected.label;
            this.skillsAutoSlot.title = 'Clique para alternar o auto-attack';
        }

        if (this.skillsModularGrid) {
            this.skillsModularGrid.innerHTML = '';
            const labels = this.modularSkillIds.map((id) => (id === 'mod_fire_wing' ? 'Asa de Fogo' : 'Hab. Mod.'));
            const maxSlots = 12;
            for (let i = 0; i < maxSlots; i++) {
                const slot = document.createElement('div');
                slot.className = 'skills-mod-slot';
                const label = labels[i] || '';
                if (label) {
                    slot.classList.add('filled');
                    slot.textContent = label;
                }
                this.skillsModularGrid.appendChild(slot);
            }
        }
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
            this.triggerConfiguredAutoAttack();
            return;
        }
        if (binding.type === 'action' && binding.actionId === 'skill_cast' && binding.skillId) {
            if (!this.selectedMobId || !this.mobs[this.selectedMobId]) {
                this.onSystemMessage({ text: 'Selecione um mob para usar a habilidade.' });
                return;
            }
            this.network.send({
                type: 'skill.cast',
                skillId: String(binding.skillId),
                targetMobId: this.selectedMobId
            });
            return;
        }
        if (binding.type === 'item') {
            let item = this.inventory.find((it) => String(it.id) === String(binding.itemId));
            if (!item && binding.itemType) {
                item = this.inventory.find((it) => String(it.type || '') === String(binding.itemType));
                if (item) {
                    this.hotbarBindings[key] = { ...binding, itemId: String(item.id), itemName: item.name || binding.itemName };
                    this.persistHotbarBindings();
                }
            }
            if (!item) {
                return;
            }
            if (String(item.type || '') === 'weapon') {
                this.network.send({ type: 'equip_req', itemId: item.id });
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
        if (binding.type === 'action' && binding.actionId === 'skill_cast' && binding.skillId) {
            return {
                type: 'action',
                actionId: 'skill_cast',
                skillId: String(binding.skillId),
                skillName: binding.skillName ? String(binding.skillName) : 'Skill'
            };
        }
        if (binding.type === 'item' && (binding.itemId || binding.itemType)) {
            return {
                type: 'item',
                itemId: binding.itemId ? String(binding.itemId) : '',
                itemType: binding.itemType ? String(binding.itemType) : '',
                itemName: binding.itemName ? String(binding.itemName) : ''
            };
        }
        return null;
    }

    getHotbarSkillLabel(name) {
        const safe = String(name || 'Habilidade').trim();
        if (safe.length <= 18) return safe;
        return `${safe.slice(0, 15).trim()}...`;
    }

    renderHotbar() {
        this.skillButtons.forEach((btn) => {
            const key = String(btn.dataset.key || '').toLowerCase();
            const binding = this.hotbarBindings[key] || null;
            const keyLabel = String(btn.dataset.key || '').toUpperCase();
            let icon = '';
            let title = keyLabel;
            let quantity = null;
            let iconCssClass = 'slot-icon';
            btn.classList.remove('slot-kind-action', 'slot-kind-item', 'slot-kind-empty', 'slot-icon-attack', 'slot-icon-potion', 'slot-ghosted');

            if (binding?.type === 'action' && binding.actionId === 'basic_attack') {
                icon = 'ATK';
                const autoSkill = this.getAutoAttackSkillDefinition(this.selectedAutoAttackSkillId);
                title = autoSkill ? `Auto: ${autoSkill.label}` : 'Ataque Basico';
                btn.classList.add('slot-kind-action', 'slot-icon-attack');
            } else if (binding?.type === 'action' && binding.actionId === 'skill_cast') {
                const node = binding.skillId ? this.getSkillNodeById(String(binding.skillId)) : null;
                const skillName = String(binding.skillName || node?.label || 'Habilidade');
                icon = this.getHotbarSkillLabel(skillName);
                title = skillName;
                iconCssClass = 'slot-icon slot-icon-skill';
                btn.classList.add('slot-kind-action');
            } else if (binding?.type === 'item') {
                let item = this.inventory.find((it) => String(it.id) === String(binding.itemId));
                const trackedType = String(binding.itemType || item?.type || '');
                const trackedName = String(binding.itemName || item?.name || 'Item');
                const isStackableType = trackedType === 'potion_hp';
                if (isStackableType) {
                    const quantityByType = this.inventory
                        .filter((it) => String(it.type || '') === trackedType)
                        .reduce((sum, it) => sum + Math.max(1, Math.floor(Number(it.quantity || 1))), 0);
                    quantity = quantityByType;
                } else {
                    quantity = null;
                }

                if (!item && trackedType) {
                    item = this.inventory.find((it) => String(it.type || '') === trackedType);
                    if (item) {
                        this.hotbarBindings[key] = { ...binding, itemId: String(item.id), itemName: item.name || trackedName, itemType: trackedType };
                        this.persistHotbarBindings();
                    }
                }

                icon = trackedType === 'potion_hp' ? 'HP' : trackedType === 'weapon' ? 'WP' : 'IT';
                title = trackedName;
                btn.classList.add('slot-kind-item');
                if (trackedType === 'potion_hp') btn.classList.add('slot-icon-potion');
                if (!item || (isStackableType && quantity <= 0)) {
                    if (isStackableType) title = `${trackedName} (sem estoque)`;
                    btn.classList.add('slot-ghosted');
                }
            } else {
                btn.classList.add('slot-kind-empty');
            }

            btn.draggable = Boolean(binding);
            btn.title = title;
            const qtyMarkup = Number.isFinite(Number(quantity)) && Number(quantity) > 0
                ? `<span class="slot-qty">${Number(quantity)}</span>`
                : '';
            btn.innerHTML = `<span class="${iconCssClass}">${icon}</span><span class="slot-key">${keyLabel}</span>${qtyMarkup}`;
        });
    }

    pruneInvalidHotbarItems() {
        const itemIds = new Set(this.inventory.map((it) => String(it.id)));
        let changed = false;
        for (const key of Object.keys(this.hotbarBindings)) {
            const binding = this.hotbarBindings[key];
            if (!binding || binding.type !== 'item') continue;
            const existing = this.inventory.find((it) => String(it.id) === String(binding.itemId || ''));
            if (existing && (!binding.itemType || !binding.itemName)) {
                this.hotbarBindings[key] = {
                    ...binding,
                    itemType: String(existing.type || binding.itemType || ''),
                    itemName: String(existing.name || binding.itemName || 'Item')
                };
                changed = true;
            }
            const isPotionGhost = String(binding.itemType || '') === 'potion_hp';
            if (!itemIds.has(String(binding.itemId || '')) && !isPotionGhost) {
                this.hotbarBindings[key] = null;
                changed = true;
            }
        }
        if (changed) this.persistHotbarBindings();
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
            this.persistHotbarBindings();
            this.renderHotbar();
            return;
        }

        if (payload.source === 'skilltree' && payload.skillId) {
            const currentTarget = this.hotbarBindings[targetKey];
            if (currentTarget?.type === 'action' && currentTarget.actionId === 'basic_attack') {
                this.onSystemMessage({ text: 'Mova o Ataque Basico para outro slot antes de colocar habilidade aqui.' });
                return;
            }
            this.hotbarBindings[targetKey] = {
                type: 'action',
                actionId: 'skill_cast',
                skillId: String(payload.skillId),
                skillName: String(payload.skillName || 'Habilidade')
            };
            this.persistHotbarBindings();
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
        this.hotbarBindings[targetKey] = {
            type: 'item',
            itemId,
            itemType: String(item.type || ''),
            itemName: String(item.name || 'Item')
        };
        this.persistHotbarBindings();
        this.renderHotbar();
    }

    findHotbarBindingItem(binding) {
        if (!binding || binding.type !== 'item') return null;
        let item = this.inventory.find((it) => String(it.id) === String(binding.itemId || ''));
        if (!item && binding.itemType) {
            item = this.inventory.find((it) => String(it.type || '') === String(binding.itemType));
        }
        return item || null;
    }

    resetHotbarBindingsToDefault() {
        for (const key of Object.keys(this.hotbarBindings || {})) {
            this.hotbarBindings[key] = null;
        }
        this.hotbarBindings['1'] = { type: 'action', actionId: 'basic_attack' };
    }

    applyHotbarBindings(rawBindings) {
        this.resetHotbarBindingsToDefault();
        const source = rawBindings && typeof rawBindings === 'object' ? rawBindings : {};
        for (const key of Object.keys(this.hotbarBindings || {})) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            this.hotbarBindings[key] = this.normalizeHotbarBinding(source[key]);
        }
        if (!this.hotbarBindings['1']) {
            this.hotbarBindings['1'] = { type: 'action', actionId: 'basic_attack' };
        }
    }

    persistHotbarBindings() {
        if (!this.localId) return;
        const payload = {};
        for (const key of Object.keys(this.hotbarBindings || {})) {
            payload[key] = this.normalizeHotbarBinding(this.hotbarBindings[key]);
        }
        this.network.send({ type: 'hotbar.set', bindings: payload });
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
            str: toInt(source.str ?? source.for ?? source.physicalAttack),
            int: toInt(source.int ?? source.magicAttack),
            dex: toInt(source.dex ?? source.des ?? source.magicDefense),
            vit: toInt(source.vit ?? source.physicalDefense)
        };
    }

    resetPendingStatAllocation() {
        this.statAllocationPending = {
            str: 0,
            int: 0,
            dex: 0,
            vit: 0
        };
    }

    getPendingStatAllocationTotal() {
        return Number(this.statAllocationPending.str || 0)
            + Number(this.statAllocationPending.int || 0)
            + Number(this.statAllocationPending.dex || 0)
            + Number(this.statAllocationPending.vit || 0);
    }

    getPendingStatAllocationCost(baseAllocated = null) {
        const base = this.normalizeAllocatedStats(baseAllocated || {});
        const threshold = 150;
        let cost = 0;
        for (const key of ['str', 'int', 'dex', 'vit']) {
            const start = Number(base[key] || 0);
            const add = Number(this.statAllocationPending[key] || 0);
            for (let i = 0; i < add; i++) {
                const idx = start + i;
                cost += idx >= threshold ? 2 : 1;
            }
        }
        return cost;
    }

    /**
     * Cria estado local interpolável de um player.
     */
    createPlayerState(player) {
        const normalizedAllocated = this.normalizeAllocatedStats(player.allocatedStats);
        const unspentPoints = Number.isFinite(Number(player.unspentPoints)) ? Math.max(0, Number(player.unspentPoints)) : 0;
        const skillLevels = player.skillLevels && typeof player.skillLevels === 'object' ? player.skillLevels : {};
        const skillPointsAvailable = Number.isFinite(Number(player.skillPointsAvailable)) ? Math.max(0, Number(player.skillPointsAvailable)) : 0;
        return {
            ...player,
            pvpMode: player.pvpMode === 'evil' ? 'evil' : player.pvpMode === 'group' ? 'group' : 'peace',
            dead: Boolean(player.dead),
            allocatedStats: normalizedAllocated,
            skillLevels,
            skillPointsAvailable,
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
        if (this.currentMapCode) this.loadTiledMapLayout(this.currentMapCode);
        this.ensureForestMap();

        this.syncPlayers(message.players || {});
        this.syncMobs(message.mobs || []);
        this.syncGroundItems(message.groundItems || []);
        this.updatePlayerCard();
        this.updateTargetPlayerCard();
    }

    hasTiledLayout(mapCode = this.currentMapCode) {
        const code = String(mapCode || '').toUpperCase();
        return Boolean(this.tiledMapLayouts && this.tiledMapLayouts[code]);
    }

    hasTiledTileset(mapCode = this.currentMapCode) {
        const code = String(mapCode || '').toUpperCase();
        return Boolean(this.tiledTilesets && this.tiledTilesets[code] && this.tiledTilesets[code].tileImagesById);
    }

    shouldRenderTiledMap() {
        return this.currentMapCode === 'A1' && this.hasTiledLayout('A1') && this.hasTiledTileset('A1');
    }

    isIsometricMap() {
        const layout = this.tiledMapLayouts?.A1;
        return this.currentMapCode === 'A1' && String(layout?.orientation || '').toLowerCase() === 'isometric';
    }

    getIsoProjectionConfig() {
        const layout = this.tiledMapLayouts?.A1;
        if (!layout || !this.isIsometricMap()) return null;
        const mapW = Math.max(1, Number(layout.width || 1));
        const mapH = Math.max(1, Number(layout.height || 1));
        const tileW = Math.max(1, Number(layout.tilewidth || 1));
        const tileH = Math.max(1, Number(layout.tileheight || 1));
        const halfW = tileW / 2;
        const halfH = tileH / 2;
        const span = Math.max(1, mapW + mapH - 2);
        const isoW = span * halfW;
        const isoH = span * halfH;
        const scale = Math.min(this.mapWidth / Math.max(1, isoW), this.mapHeight / Math.max(1, isoH));
        const projectedW = isoW * scale;
        const projectedH = isoH * scale;
        const offsetX = (this.mapWidth - projectedW) * 0.5;
        const offsetY = (this.mapHeight - projectedH) * 0.5;
        return {
            mapW,
            mapH,
            tileW,
            tileH,
            halfW,
            halfH,
            scale,
            offsetX,
            offsetY
        };
    }

    worldToRenderCoords(worldX, worldY) {
        if (!this.isIsometricMap()) return { x: worldX, y: worldY };
        const cfg = this.getIsoProjectionConfig();
        if (!cfg) return { x: worldX, y: worldY };
        const nx = (Math.max(0, Math.min(this.mapWidth, Number(worldX || 0))) / Math.max(1, this.mapWidth)) * Math.max(1, cfg.mapW - 1);
        const ny = (Math.max(0, Math.min(this.mapHeight, Number(worldY || 0))) / Math.max(1, this.mapHeight)) * Math.max(1, cfg.mapH - 1);
        const isoX = (nx - ny) * cfg.halfW;
        const isoY = (nx + ny) * cfg.halfH;
        const minIsoX = -(Math.max(1, cfg.mapH - 1) * cfg.halfW);
        return {
            x: (isoX - minIsoX) * cfg.scale + cfg.offsetX,
            y: isoY * cfg.scale + cfg.offsetY
        };
    }

    renderToWorldCoords(renderX, renderY) {
        if (!this.isIsometricMap()) {
            return {
                x: Math.max(0, Math.min(this.mapWidth, Number(renderX || 0))),
                y: Math.max(0, Math.min(this.mapHeight, Number(renderY || 0)))
            };
        }
        const cfg = this.getIsoProjectionConfig();
        if (!cfg) {
            return {
                x: Math.max(0, Math.min(this.mapWidth, Number(renderX || 0))),
                y: Math.max(0, Math.min(this.mapHeight, Number(renderY || 0)))
            };
        }
        const minIsoX = -(Math.max(1, cfg.mapH - 1) * cfg.halfW);
        const isoX = ((Number(renderX || 0) - cfg.offsetX) / Math.max(0.0001, cfg.scale)) + minIsoX;
        const isoY = (Number(renderY || 0) - cfg.offsetY) / Math.max(0.0001, cfg.scale);
        const nx = (isoY / Math.max(0.0001, cfg.halfH) + isoX / Math.max(0.0001, cfg.halfW)) * 0.5;
        const ny = (isoY / Math.max(0.0001, cfg.halfH) - isoX / Math.max(0.0001, cfg.halfW)) * 0.5;
        return {
            x: Math.max(0, Math.min(this.mapWidth, (nx / Math.max(1, cfg.mapW - 1)) * this.mapWidth)),
            y: Math.max(0, Math.min(this.mapHeight, (ny / Math.max(1, cfg.mapH - 1)) * this.mapHeight))
        };
    }

    async loadTiledMapLayout(mapCode = this.currentMapCode) {
        const code = String(mapCode || '').toUpperCase();
        if (!code || this.tiledMapLayouts[code]) return;
        if (this.tiledMapLoadState[code] === 'loading' || this.tiledMapLoadState[code] === 'failed') return;
        if (code !== 'A1') return;

        this.tiledMapLoadState[code] = 'loading';
        try {
            const response = await fetch(`/maps/${code}/a1.tmj`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`http_${response.status}`);
            const tmj = await response.json();
            const width = Math.max(1, Math.floor(Number(tmj?.width || 0)));
            const height = Math.max(1, Math.floor(Number(tmj?.height || 0)));
            const tilewidth = Math.max(1, Number(tmj?.tilewidth || 1));
            const tileheight = Math.max(1, Number(tmj?.tileheight || 1));
            const orientation = String(tmj?.orientation || '');
            const layers = Array.isArray(tmj?.layers)
                ? tmj.layers.filter((layer) => layer?.type === 'tilelayer' && Array.isArray(layer?.data))
                : [];
            const tilesets = Array.isArray(tmj?.tilesets) ? tmj.tilesets : [];
            if (!width || !height || !layers.length) throw new Error('invalid_tmj');

            this.tiledMapLayouts[code] = { width, height, tilewidth, tileheight, orientation, layers, tilesets };
            await this.loadTiledTilesetForMap(code, tmj, '/maps/A1/a1.tmj');
            delete this.tiledRenderCache[code];
            this.tiledMapLoadState[code] = 'ready';
            if (this.currentMapCode === code) {
                this.mapTiles = null;
                this.ensureForestMap();
            }
        } catch {
            this.tiledMapLoadState[code] = 'failed';
        }
    }

    async loadTiledTilesetForMap(mapCode, tmj, tmjUrl) {
        const code = String(mapCode || '').toUpperCase();
        if (this.tiledTilesetLoadState[code] === 'loading' || this.tiledTilesetLoadState[code] === 'ready') return;
        const tsRef = Array.isArray(tmj?.tilesets) ? tmj.tilesets[0] : null;
        const source = String(tsRef?.source || '');
        if (!source) return;

        this.tiledTilesetLoadState[code] = 'loading';
        try {
            const tsxUrl = new URL(source, `https://noxis.local${tmjUrl}`).pathname;
            const response = await fetch(tsxUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`http_${response.status}`);
            const tsx = await response.text();
            const parsedTileset = this.parseTsxTileImages(tsx);
            this.tiledTilesets[code] = {
                ...parsedTileset,
                firstgid: Math.max(1, Number(tsRef?.firstgid || 1))
            };
            delete this.tiledRenderCache[code];
            this.tiledTilesetLoadState[code] = 'ready';
        } catch {
            this.tiledTilesetLoadState[code] = 'failed';
        }
    }

    parseTsxTileImages(tsxText) {
        const out = {};
        const text = String(tsxText || '');
        const tileOffsetMatch = text.match(/<tileoffset\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const tilesetTileWidthMatch = text.match(/tilewidth="(\d+)"/);
        const tilesetTileHeightMatch = text.match(/tileheight="(\d+)"/);
        const tileoffsetX = tileOffsetMatch ? Number(tileOffsetMatch[1] || 0) : 0;
        const tileoffsetY = tileOffsetMatch ? Number(tileOffsetMatch[2] || 0) : 0;
        const tilesetTileWidth = tilesetTileWidthMatch ? Number(tilesetTileWidthMatch[1] || 1) : 1;
        const tilesetTileHeight = tilesetTileHeightMatch ? Number(tilesetTileHeightMatch[1] || 1) : 1;
        const tileBlockRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
        let match = tileBlockRegex.exec(text);
        while (match) {
            const localId = Math.floor(Number(match[1]));
            const block = String(match[0] || '');
            const imageMatch = block.match(/<image\s+source="([^"]+)"/);
            if (imageMatch && imageMatch[1]) {
                const source = String(imageMatch[1]);
                const basename = source.split('/').pop()?.split('\\').pop();
                if (basename) {
                    const img = new Image();
                    img.src = `/maps/tileset/a1/${basename}`;
                    img.onload = () => { delete this.tiledRenderCache.A1; };
                    out[localId] = img;
                }
            }
            match = tileBlockRegex.exec(text);
        }
        return { tileImagesById: out, tileoffsetX, tileoffsetY, tilesetTileWidth, tilesetTileHeight };
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
            p.skillLevels = incoming.skillLevels && typeof incoming.skillLevels === 'object' ? incoming.skillLevels : (p.skillLevels || {});
            p.skillPointsAvailable = Number.isFinite(Number(incoming.skillPointsAvailable)) ? Math.max(0, Number(incoming.skillPointsAvailable)) : Number(p.skillPointsAvailable || 0);
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
        if (this.hoveredGroundItemId && !this.groundItems[this.hoveredGroundItemId]) {
            this.hoveredGroundItemId = null;
            this.updateGroundItemCursor();
        }
        if (this.pendingPickup && !this.groundItems[this.pendingPickup.itemId]) {
            this.pendingPickup = null;
        }
    }

    /**
     * Renderiza lista do inventário com ação de equipar/remover.
     */
    renderInventory() {
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
                } else if (String(item.type || '') === 'skill_reset_hourglass') {
                    itemEl.title = `${item.name}\nReseta todas as habilidades aprendidas e devolve os pontos.\nQtd: ${quantity}`;
                } else {
                    itemEl.title = `${item.name}\nPATK +${item.bonuses?.physicalAttack || 0}\nMATK +${item.bonuses?.magicAttack || 0}\nMS +${item.bonuses?.moveSpeed || 0}\nASPD +${item.bonuses?.attackSpeed || 0}%`;
                }
                itemEl.addEventListener('dblclick', () => {
                    if (String(item.type || '') === 'weapon') {
                        this.closeAllTooltips('item_equipped');
                        this.network.send({ type: 'equip_req', itemId: item.id === this.equippedWeaponId ? null : item.id });
                        return;
                    }
                    this.network.send({ type: 'item.use', itemId: item.id });
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
    openItemTooltip(item, clientX, clientY, reason = 'hover', options = null) {
        this.cancelTooltipTimers();
        this.tooltipState.activeTooltipId = item.id;
        this.tooltipState.lastOpenReason = reason;
        this.tooltip.style.width = '220px';
        if (String(item.type || '') === 'potion_hp') {
            const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
            this.tooltip.innerHTML = `
                <div><strong>${item.name}</strong></div>
                <div>Consumivel</div>
                <div>Restaura 50% do HP</div>
                <div>Qtd: ${quantity}</div>
            `;
        } else if (String(item.type || '') === 'skill_reset_hourglass') {
            const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
            this.tooltip.innerHTML = `
                <div><strong>${item.name}</strong></div>
                <div>Consumivel</div>
                <div>Reseta todas as habilidades aprendidas</div>
                <div>Devolve todos os pontos gastos</div>
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
        this.positionTooltip(clientX, clientY, options);
        this.tooltip.classList.remove('hidden');
    }

    positionTooltip(clientX, clientY, options = null) {
        const cfg = options && typeof options === 'object' ? options : {};
        const margin = 8;

        this.tooltip.classList.remove('hidden');
        this.tooltip.style.visibility = 'hidden';
        const rect = this.tooltip.getBoundingClientRect();

        let left = Number(clientX || 0) + 12;
        let top = Number(clientY || 0) + 12;
        if (cfg.placement === 'top-right' && cfg.anchorElement?.getBoundingClientRect) {
            const anchorRect = cfg.anchorElement.getBoundingClientRect();
            left = anchorRect.right + 8;
            top = anchorRect.top - rect.height - 8;
        }

        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
        left = Math.max(margin, Math.min(left, maxLeft));
        top = Math.max(margin, Math.min(top, maxTop));

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.visibility = 'visible';
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
        this.tooltip.style.visibility = 'visible';
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
        if (!this.localId || !this.players[this.localId]) return;
        const p = this.players[this.localId];
        const equippedFromInventory = this.inventory.find((it) => String(it.id) === String(this.equippedWeaponId || ''));
        const equippedWeaponName = equippedFromInventory ? equippedFromInventory.name : null;

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
        if (equippedWeaponName && weaponSlot) {
            weaponSlot.classList.add('filled');
            weaponSlot.textContent = equippedWeaponName;
            weaponSlot.draggable = true;
            weaponSlot.ondblclick = () => {
                this.network.send({ type: 'equip_req', itemId: null });
            };
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
            weaponSlot.ondblclick = null;
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
                this.network.send({ type: 'equip_req', itemId });
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
                this.network.send({ type: 'equip_req', itemId });
            };
        }

        this.panelBody.innerHTML = '';
        const baseRows = [
            `Nivel: ${p.level}`,
            `XP: ${p.xp}/${p.xpToNext}`,
            `HP: ${p.hp}/${p.maxHp}`
        ];
        const summaryGrid = document.createElement('div');
        summaryGrid.className = 'char-summary-grid';
        for (const line of baseRows) {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = line;
            summaryGrid.appendChild(div);
        }
        this.panelBody.appendChild(summaryGrid);

        const pendingCost = this.getPendingStatAllocationCost(p.allocatedStats);
        const remainingPoints = Math.max(0, Number(p.unspentPoints || 0) - pendingCost);
        const unspentLine = document.createElement('div');
        unspentLine.className = 'line stat-points-line';
        unspentLine.textContent = `Pontos disponiveis: ${remainingPoints}`;
        this.panelBody.appendChild(unspentLine);

        const statsLayout = document.createElement('div');
        statsLayout.className = 'char-stats-layout';
        const baseCol = document.createElement('div');
        baseCol.className = 'char-stats-col char-stats-col-base';
        const combatCol = document.createElement('div');
        combatCol.className = 'char-stats-col char-stats-col-combat';

        const baseTitle = document.createElement('div');
        baseTitle.className = 'line stat-col-title';
        baseTitle.textContent = 'Atributos Base';
        baseCol.appendChild(baseTitle);

        const combatTitle = document.createElement('div');
        combatTitle.className = 'line stat-col-title';
        combatTitle.textContent = 'Atributos de Combate';
        combatCol.appendChild(combatTitle);

        const statRows = [
            { key: 'str', label: 'FOR', value: Number(p.stats.str || 0), derived: `PATK +${(Number(p.stats.str || 0) * 2).toFixed(0)} | PDEF +${(Number(p.stats.str || 0) * 0.5).toFixed(1)}` },
            { key: 'int', label: 'INT', value: Number(p.stats.int || 0), derived: `MATK +${(Number(p.stats.int || 0) * 3).toFixed(0)} | MDEF +${(Number(p.stats.int || 0) * 0.8).toFixed(1)}` },
            { key: 'dex', label: 'DES', value: Number(p.stats.dex || 0), derived: `ACC +${(Number(p.stats.dex || 0) * 1.5).toFixed(1)} | EVA +${(Number(p.stats.dex || 0) * 0.8).toFixed(1)}` },
            { key: 'vit', label: 'VIT', value: Number(p.stats.vit || 0), derived: `HP +${(Number(p.stats.vit || 0) * 15).toFixed(0)} | PDEF +${(Number(p.stats.vit || 0) * 1.2).toFixed(1)}` }
        ];
        for (const row of statRows) {
            const wrap = document.createElement('div');
            wrap.className = 'line stat-row';

            const pending = Number(this.statAllocationPending[row.key] || 0);
            const previewValue = row.value + pending;
            const valueLabel = document.createElement('span');
            valueLabel.textContent = `${row.label}: ${previewValue}`;
            valueLabel.title = row.derived;
            wrap.appendChild(valueLabel);

            const controls = document.createElement('div');
            controls.className = 'stat-controls';
            const shouldRenderControls = remainingPoints > 0 || pending > 0;
            if (shouldRenderControls) {
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
                    const currentRemaining = Math.max(0, Number(me.unspentPoints || 0) - this.getPendingStatAllocationCost(me.allocatedStats));
                    if (currentRemaining <= 0) return;
                    const baseValue = Number(this.normalizeAllocatedStats(me.allocatedStats)[row.key] || 0);
                    const pendingValue = Number(this.statAllocationPending[row.key] || 0);
                    const nextCost = (baseValue + pendingValue) >= 150 ? 2 : 1;
                    if (currentRemaining < nextCost) return;
                    this.statAllocationPending[row.key] = Number(this.statAllocationPending[row.key] || 0) + 1;
                    this.updatePanel();
                });
                controls.appendChild(addBtn);
                wrap.appendChild(controls);
            }
            baseCol.appendChild(wrap);
        }

        const pendingStr = Number(this.statAllocationPending.str || 0);
        const pendingInt = Number(this.statAllocationPending.int || 0);
        const pendingDex = Number(this.statAllocationPending.dex || 0);
        const pendingVit = Number(this.statAllocationPending.vit || 0);
        const previewCombat = {
            physicalAttack: Number(p.stats.physicalAttack || 0) + pendingStr * 2,
            magicAttack: Number(p.stats.magicAttack || 0) + pendingInt * 3,
            physicalDefense: Number(p.stats.physicalDefense || 0) + pendingStr * 0.5 + pendingVit * 1.2,
            magicDefense: Number(p.stats.magicDefense || 0) + pendingInt * 0.8 + pendingVit * 0.5,
            maxHp: Number(p.stats.maxHp || p.maxHp || 0) + pendingVit * 15,
            accuracy: Number(p.stats.accuracy || 0) + pendingDex * 1.5,
            evasion: Number(p.stats.evasion || 0) + pendingDex * 0.8,
            criticalChance: Number(p.stats.criticalChance || 0) + pendingDex * 0.0002
        };

        const extraRows = [
            `PATK: ${Math.floor(previewCombat.physicalAttack)}`,
            `MATK: ${Math.floor(previewCombat.magicAttack)}`,
            `PDEF: ${previewCombat.physicalDefense.toFixed(1)}`,
            `MDEF: ${previewCombat.magicDefense.toFixed(1)}`,
            `MAXHP: ${Math.floor(previewCombat.maxHp)}`,
            `ACC: ${previewCombat.accuracy.toFixed(1)}`,
            `EVA: ${previewCombat.evasion.toFixed(1)}`,
            `CRIT: ${(previewCombat.criticalChance * 100).toFixed(2)}%`,
            `LUCK: ${Number(p.stats.luck || 0).toFixed(1)}`,
            `MSPD: ${p.stats.moveSpeed}`,
            `ASPD: ${p.stats.attackSpeed}%`,
            `RANGE: ${p.stats.attackRange}`
        ];
        for (const line of extraRows) {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = line;
            combatCol.appendChild(div);
        }

        statsLayout.appendChild(baseCol);
        statsLayout.appendChild(combatCol);
        this.panelBody.appendChild(statsLayout);

        const applyWrap = document.createElement('div');
        applyWrap.className = 'line stat-actions';
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = 'Aplicar';
        const pendingTotal = this.getPendingStatAllocationTotal();
        const pendingSpendCost = this.getPendingStatAllocationCost(p.allocatedStats);
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
            const costHint = document.createElement('span');
            costHint.textContent = `Custo: ${pendingSpendCost}`;
            applyWrap.appendChild(costHint);
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

    getMobKindColor(kind) {
        const k = String(kind || 'normal');
        if (k === 'boss') return '#111111';
        if (k === 'subboss') return '#8e44ad';
        if (k === 'elite') return '#e67e22';
        return '#d63031';
    }

    pruneTargetByDistance() {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        const maxDistance = Number(this.targetClearDistance || 900);
        if (this.selectedMobId && this.mobs[this.selectedMobId]) {
            const mob = this.mobs[this.selectedMobId];
            const dist = Math.hypot(Number(mob.x) - Number(me.x), Number(mob.y) - Number(me.y));
            if (dist > maxDistance) {
                this.selectedMobId = null;
                this.network.send({ type: 'combat.clearTarget' });
            }
        }
        if (this.selectedPlayerId && this.players[this.selectedPlayerId]) {
            const target = this.players[this.selectedPlayerId];
            const dist = Math.hypot(Number(target.x) - Number(me.x), Number(target.y) - Number(me.y));
            if (dist > maxDistance) {
                this.clearPlayerTarget();
                this.network.send({ type: 'combat.clearTarget' });
            }
        }
    }

    updateTargetPlayerCard() {
        if (this.selectedMobId && this.mobs[this.selectedMobId]) {
            const mob = this.mobs[this.selectedMobId];
            const hpPercent = Number(mob.maxHp || 0) > 0 ? Number(mob.hp || 0) / Number(mob.maxHp || 1) : 0;
            this.targetPlayerAvatar.className = 'target-mob-avatar';
            this.targetPlayerAvatar.textContent = 'M';
            this.targetPlayerAvatar.style.background = this.getMobKindColor(mob.kind);
            if (this.targetNameText) {
                const mobLevel = Number.isFinite(Number(mob.level)) ? Number(mob.level) : 1;
                this.targetNameText.textContent = `${this.getMobDisplayName(mob)} Lv.${mobLevel}`;
            }
            this.targetPlayerHpFill.style.width = `${Math.max(0, Math.min(1, hpPercent)) * 100}%`;
            this.targetActionsToggle.classList.add('hidden');
            this.targetActionsMenu.classList.add('hidden');
            this.targetPlayerCard.classList.remove('hidden');
            return;
        }

        if (!this.selectedPlayerId || !this.players[this.selectedPlayerId]) {
            this.targetPlayerCard.classList.add('hidden');
            return;
        }
        const target = this.players[this.selectedPlayerId];
        const hpPercent = target.maxHp > 0 ? target.hp / target.maxHp : 0;
        this.applyClassAvatar(this.targetPlayerAvatar, target.class);
        this.targetPlayerAvatar.style.background = '';
        if (this.targetNameText) this.targetNameText.textContent = `${target.name} Lv.${target.level}`;
        this.targetPlayerHpFill.style.width = `${Math.max(0, Math.min(1, hpPercent)) * 100}%`;
        this.targetActionsToggle.classList.remove('hidden');

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
        const nodes = Array.isArray(me.pathNodes) ? me.pathNodes : [];
        if (!nodes.length) return;
        const points = [{ x: me.x, y: me.y }, ...nodes];
        this.drawPolyline(ctx, points, 'rgba(123, 230, 255, 0.95)', 2, (point) => ({
            x: (this.worldToRenderCoords(point.x, point.y).x - worldRect.x) * sx,
            y: (this.worldToRenderCoords(point.x, point.y).y - worldRect.y) * sy
        }));
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
                const projected = this.worldToRenderCoords(Number(feature.x), Number(feature.y));
                const x = (projected.x - worldRect.x) * sx;
                const y = (projected.y - worldRect.y) * sy;
                const w = Number(feature.w) * sx;
                const h = Number(feature.h) * sy;
                ctx.strokeRect(x, y, w, h);
            } else if (feature.shape === 'circle') {
                const projected = this.worldToRenderCoords(Number(feature.x), Number(feature.y));
                ctx.beginPath();
                ctx.arc(
                    (projected.x - worldRect.x) * sx,
                    (projected.y - worldRect.y) * sy,
                    Number(feature.r) * Math.min(sx, sy),
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        }

        const nodes = Array.isArray(me.pathNodes) ? me.pathNodes : [];
        if (nodes.length) {
            const points = [{ x: me.x, y: me.y }, ...nodes];
            this.drawPolyline(ctx, points, 'rgba(255, 90, 220, 0.95)', 1.5, (point) => ({
                x: (this.worldToRenderCoords(point.x, point.y).x - worldRect.x) * sx,
                y: (this.worldToRenderCoords(point.x, point.y).y - worldRect.y) * sy
            }));
        }

        if (this.lastMoveSent) {
            const projected = this.worldToRenderCoords(this.lastMoveSent.x, this.lastMoveSent.y);
            const mx = (projected.x - worldRect.x) * sx;
            const my = (projected.y - worldRect.y) * sy;
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
        if (className === 'druid' || className === 'shifter') return '#4cd137';
        if (className === 'archer') return '#f39c12';
        if (className === 'assassin' || className === 'bandit') return '#000000';
        return '#cccccc';
    }

    getClassIcon(className) {
        if (className === 'knight') return 'S';
        if (className === 'druid' || className === 'shifter') return 'M';
        if (className === 'archer') return 'A';
        if (className === 'assassin' || className === 'bandit') return 'D';
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

        if (this.currentMapCode === 'A1' && this.hasTiledLayout('A1')) {
            const tiled = this.tiledMapLayouts.A1;
            this.mapCols = cols;
            this.mapRows = rows;
            this.mapVisualTheme = theme;
            this.mapTiles = this.buildTilesFromTiledLayout(tiled, cols, rows);
            this.forestDecor = [];
            return;
        }

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
        if (this.currentMapCode === 'A1' && this.hasTiledLayout('A1')) return;
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

        const sx = w / Math.max(1, worldRect.w);
        const sy = h / Math.max(1, worldRect.h);
        if (this.shouldRenderTiledMap()) {
            this.drawTiledTerrain(ctx, worldRect, sx, sy);
        } else {
            const tileStartCol = Math.max(0, Math.floor(worldRect.x / this.tileSize));
            const tileEndCol = Math.min(this.mapCols - 1, Math.ceil((worldRect.x + worldRect.w) / this.tileSize));
            const tileStartRow = Math.max(0, Math.floor(worldRect.y / this.tileSize));
            const tileEndRow = Math.min(this.mapRows - 1, Math.ceil((worldRect.y + worldRect.h) / this.tileSize));

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
        }
        this.drawMapFeatures(ctx, worldRect, sx, sy, true);

        for (const portal of this.mapPortals) {
            const projected = this.worldToRenderCoords(portal.x + portal.w * 0.5, portal.y + portal.h * 0.5);
            const cx = (projected.x - worldRect.x) * sx;
            const cy = (projected.y - worldRect.y) * sy;
            const radius = Math.max(4, Math.min(portal.w * sx, portal.h * sy) * 0.24);
            const visible = cx + radius >= 0 && cy + radius >= 0 && cx - radius <= w && cy - radius <= h;
            if (!visible) continue;
            this.drawPixelPortal(ctx, cx, cy, radius, Math.max(1, Math.floor(radius / 5)));
        }

        for (const id of Object.keys(this.mobs)) {
            const mob = this.mobs[id];
            const projected = this.worldToRenderCoords(mob.x, mob.y);
            if (projected.x < worldRect.x || projected.x > worldRect.x + worldRect.w || projected.y < worldRect.y || projected.y > worldRect.y + worldRect.h) continue;
            const kind = String(mob.kind || 'normal');
            ctx.fillStyle = kind === 'boss'
                ? '#111111'
                : kind === 'subboss'
                    ? '#8e44ad'
                        : kind === 'elite'
                            ? '#e67e22'
                            : '#d63031';
            ctx.beginPath();
            ctx.arc((projected.x - worldRect.x) * sx, (projected.y - worldRect.y) * sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const id of Object.keys(this.players)) {
            const p = this.players[id];
            const projected = this.worldToRenderCoords(p.x, p.y);
            if (projected.x < worldRect.x || projected.x > worldRect.x + worldRect.w || projected.y < worldRect.y || projected.y > worldRect.y + worldRect.h) continue;
            ctx.fillStyle = id === this.localId ? '#ffffff' : '#4da3ff';
            ctx.beginPath();
            ctx.arc((projected.x - worldRect.x) * sx, (projected.y - worldRect.y) * sy, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }

        this.pruneExpiredPartyWaypoints();
        for (const ping of this.partyWaypoints) {
            if (ping.mapKey !== this.currentMapKey || ping.mapId !== this.currentMapId) continue;
            const projected = this.worldToRenderCoords(ping.x, ping.y);
            if (projected.x < worldRect.x || projected.x > worldRect.x + worldRect.w || projected.y < worldRect.y || projected.y > worldRect.y + worldRect.h) continue;
            const px = (projected.x - worldRect.x) * sx;
            const py = (projected.y - worldRect.y) * sy;
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
    drawMinimap(now = performance.now()) {
        if (now - this.minimapLastDrawAt < this.minimapDrawIntervalMs) return;
        this.minimapLastDrawAt = now;
        const worldRect = this.getMinimapWorldRect();
        this.drawWorldPreview(this.minimapCtx, this.minimapCanvas, worldRect, false);
    }

    drawWorldMapPanel(now = performance.now()) {
        if (this.worldmapPanel.classList.contains('hidden')) return;
        if (now - this.worldmapLastDrawAt < this.worldmapDrawIntervalMs) return;
        this.worldmapLastDrawAt = now;
        const worldRect = { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight };
        this.drawWorldPreview(this.worldmapCtx, this.worldmapCanvas, worldRect, false);
    }

    /**
     * Ajusta canvas para o tamanho da janela.
     */
    resize() {
        const viewportW = Math.max(320, Number(window.innerWidth || this.baseRenderWidth || 1366));
        const viewportH = Math.max(240, Number(window.innerHeight || this.baseRenderHeight || 768));
        const rawZoomScale = this.getRawBrowserZoomScale();
        const clampedZoomScale = this.getClampedGameZoomScale();
        this.currentGameZoomScale = clampedZoomScale;

        // Dentro do intervalo [67%, 150%], mantém o comportamento normal.
        // Fora do intervalo, compensa o zoom para congelar a expansão/contração do mapa.
        const freezeFactor = rawZoomScale / Math.max(0.0001, clampedZoomScale);
        this.canvas.width = Math.max(960, Math.floor(viewportW * freezeFactor));
        this.canvas.height = Math.max(540, Math.floor(viewportH * freezeFactor));
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.updateHudLayout();
    }

    getRawBrowserZoomScale() {
        const baseDpr = Number(this.baseDevicePixelRatio || 1);
        const currentDpr = Number(window.devicePixelRatio || 1);
        if (!Number.isFinite(baseDpr) || baseDpr <= 0) return 1;
        if (!Number.isFinite(currentDpr) || currentDpr <= 0) return 1;
        return currentDpr / baseDpr;
    }

    getClampedGameZoomScale() {
        const raw = this.getRawBrowserZoomScale();
        return Math.max(this.minGameZoomScale, Math.min(this.maxGameZoomScale, raw));
    }

    isHudElementVisible(el) {
        if (!el) return false;
        if (el.classList?.contains('hidden')) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    rectsOverlap(a, b) {
        if (!a || !b) return false;
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    nudgeBottom(el, deltaPx) {
        if (!el || deltaPx <= 0) return;
        const current = Number.parseFloat(window.getComputedStyle(el).bottom) || 0;
        el.style.bottom = `${Math.max(0, current + deltaPx)}px`;
    }

    nudgeBottomByInline(el, deltaPx) {
        if (!el || deltaPx <= 0) return;
        const currentInline = Number.parseFloat(String(el.style.bottom || '0')) || 0;
        el.style.bottom = `${Math.max(0, currentInline + deltaPx)}px`;
    }

    nudgeTop(el, deltaPx) {
        if (!el || deltaPx <= 0) return;
        const current = Number.parseFloat(window.getComputedStyle(el).top) || 0;
        el.style.top = `${Math.max(0, current + deltaPx)}px`;
    }

    resolveHudCollisions() {
        const gap = 10;
        const card = this.playerCard;
        const minimap = this.minimapWrap;
        const chat = this.chatWrap;
        const skillbar = this.skillbarWrap;
        const menus = this.menusWrap;

        // Reset ajustes dinâmicos antes de calcular novamente.
        if (card) card.style.top = '';
        if (minimap) minimap.style.top = '';
        if (chat) chat.style.bottom = '';
        if (skillbar) skillbar.style.bottom = '';
        if (menus) menus.style.bottom = '';

        if (this.isHudElementVisible(card) && this.isHudElementVisible(minimap)) {
            const cardRect = card.getBoundingClientRect();
            const mapRect = minimap.getBoundingClientRect();
            if (this.rectsOverlap(cardRect, mapRect)) {
                this.nudgeTop(minimap, Math.ceil(cardRect.bottom - mapRect.top) + gap);
            }
        }

        if (this.isHudElementVisible(chat) && this.isHudElementVisible(skillbar)) {
            const chatRect = chat.getBoundingClientRect();
            const skillRect = skillbar.getBoundingClientRect();
            if (this.rectsOverlap(chatRect, skillRect)) {
                this.nudgeBottom(chat, Math.ceil(chatRect.bottom - skillRect.top) + gap);
            }
        }

        if (this.isHudElementVisible(menus) && this.isHudElementVisible(skillbar)) {
            const menuRect = menus.getBoundingClientRect();
            const skillRect = skillbar.getBoundingClientRect();
            if (this.rectsOverlap(menuRect, skillRect)) {
                this.nudgeBottomByInline(skillbar, Math.ceil(menuRect.bottom - skillRect.top) + gap);
            }
        }

        if (this.isHudElementVisible(chat) && this.isHudElementVisible(menus)) {
            const chatRect = chat.getBoundingClientRect();
            const menuRect = menus.getBoundingClientRect();
            if (this.rectsOverlap(chatRect, menuRect)) {
                this.nudgeBottom(menus, Math.ceil(chatRect.bottom - menuRect.top) + gap);
            }
        }
    }

    buildTilesFromTiledLayout(layout, targetCols, targetRows) {
        const srcW = Math.max(1, Number(layout?.width || 1));
        const srcH = Math.max(1, Number(layout?.height || 1));
        const layers = Array.isArray(layout?.layers) ? layout.layers : [];
        const out = new Uint8Array(targetCols * targetRows);

        for (let y = 0; y < targetRows; y++) {
            for (let x = 0; x < targetCols; x++) {
                const sx = Math.max(0, Math.min(srcW - 1, Math.floor((x / Math.max(1, targetCols - 1)) * (srcW - 1))));
                const sy = Math.max(0, Math.min(srcH - 1, Math.floor((y / Math.max(1, targetRows - 1)) * (srcH - 1))));
                const srcIndex = sy * srcW + sx;

                let depth = 0;
                for (let i = 0; i < layers.length; i++) {
                    const data = layers[i]?.data;
                    if (!data) continue;
                    if (Number(data[srcIndex] || 0) > 0) depth += 1;
                }

                let tileType = 0;
                if (depth >= 4) tileType = 1;
                else if (depth >= 2) tileType = 2;
                else if (depth >= 1) tileType = 0;
                out[y * targetCols + x] = tileType;
            }
        }

        return out;
    }

    drawTiledTerrain(ctx, worldRect, sx = 1, sy = 1) {
        const cache = this.ensureTiledRenderCache('A1');
        if (!cache || !cache.canvas) return false;
        const srcX = Math.max(0, Math.floor(worldRect.x));
        const srcY = Math.max(0, Math.floor(worldRect.y));
        const srcW = Math.max(1, Math.min(cache.canvas.width - srcX, Math.ceil(worldRect.w)));
        const srcH = Math.max(1, Math.min(cache.canvas.height - srcY, Math.ceil(worldRect.h)));
        ctx.drawImage(cache.canvas, srcX, srcY, srcW, srcH, 0, 0, srcW * sx, srcH * sy);
        return true;
    }

    isoGridToRenderCoords(col, row, cfg = this.getIsoProjectionConfig()) {
        if (!cfg) return { x: 0, y: 0 };
        const isoX = (col - row) * cfg.halfW;
        const isoY = (col + row) * cfg.halfH;
        const minIsoX = -(Math.max(1, cfg.mapH - 1) * cfg.halfW);
        return {
            x: (isoX - minIsoX) * cfg.scale + cfg.offsetX,
            y: isoY * cfg.scale + cfg.offsetY
        };
    }

    ensureTiledRenderCache(mapCode = this.currentMapCode) {
        const code = String(mapCode || '').toUpperCase();
        if (!this.shouldRenderTiledMap() || code !== 'A1') return null;
        const cached = this.tiledRenderCache[code];
        if (cached?.ready && cached.canvas) return cached;

        const layout = this.tiledMapLayouts[code];
        const tileset = this.tiledTilesets[code];
        const cfg = this.getIsoProjectionConfig();
        if (!layout || !tileset || !cfg) return null;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(this.mapWidth));
        canvas.height = Math.max(1, Math.ceil(this.mapHeight));
        const cctx = canvas.getContext('2d');
        cctx.imageSmoothingEnabled = false;

        const mapW = Math.max(1, Number(layout.width || 1));
        const mapH = Math.max(1, Number(layout.height || 1));
        const firstgid = Math.max(1, Number(tileset.firstgid || 1));
        const gidMask = 0x1fffffff;
        const layers = Array.isArray(layout.layers) ? layout.layers : [];
        const tileImagesById = tileset.tileImagesById || {};
        const tileImageList = Object.values(tileImagesById);
        if (!tileImageList.length) return null;
        const allReady = tileImageList.every((img) => img && img.complete && img.naturalWidth && img.naturalHeight);
        if (!allReady) return null;
        const tileoffsetX = Number(tileset.tileoffsetX || 0);
        const tileoffsetY = Number(tileset.tileoffsetY || 0);
        const tilesetTileWidth = Math.max(1, Number(tileset.tilesetTileWidth || layout.tilewidth || 1));
        const tilesetTileHeight = Math.max(1, Number(tileset.tilesetTileHeight || layout.tileheight || 1));
        const spriteScale = cfg.scale * (Number(layout.tilewidth || tilesetTileWidth) / Math.max(1, tilesetTileWidth));

        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            const layer = layers[layerIndex];
            if (layer && layer.visible === false) continue;
            const data = layer?.data;
            if (!Array.isArray(data)) continue;
            const opacity = Math.max(0, Math.min(1, Number(layer?.opacity ?? 1)));
            if (opacity <= 0) continue;
            cctx.save();
            cctx.globalAlpha = opacity;
            const layerOffsetX = Number(layer?.offsetx || 0) * cfg.scale;
            const layerOffsetY = Number(layer?.offsety || 0) * cfg.scale;

            for (let row = 0; row < mapH; row++) {
                for (let col = 0; col < mapW; col++) {
                    const idx = row * mapW + col;
                    const raw = Number(data[idx] || 0) >>> 0;
                    if (!raw) continue;
                    const gid = raw & gidMask;
                    if (!gid || gid < firstgid) continue;
                    const localId = gid - firstgid;
                    const img = tileImagesById[localId];
                    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) continue;

                    const projected = this.isoGridToRenderCoords(col, row, cfg);
                    const drawW = img.naturalWidth * spriteScale;
                    const drawH = img.naturalHeight * spriteScale;
                    const offsetX = tileoffsetX * spriteScale;
                    const offsetY = tileoffsetY * spriteScale;
                    const dx = projected.x - drawW * 0.5 + offsetX + layerOffsetX;
                    const dy = projected.y - drawH + (tilesetTileHeight * spriteScale) + offsetY + layerOffsetY;
                    cctx.drawImage(img, dx, dy, drawW, drawH);
                }
            }
            cctx.restore();
        }

        this.tiledRenderCache[code] = { ready: true, canvas };
        return this.tiledRenderCache[code];
    }

    updateHudLayout() {
        const w = Number(window.innerWidth || this.baseRenderWidth || 1366);
        const h = Number(window.innerHeight || this.baseRenderHeight || 768);
        const rawZoomScale = this.getRawBrowserZoomScale();
        const clampedZoomScale = this.getClampedGameZoomScale();
        const freezeFactor = rawZoomScale / Math.max(0.0001, clampedZoomScale);
        const layoutW = w * freezeFactor;
        const layoutH = h * freezeFactor;
        const baseScale = Math.min(layoutW / 1920, layoutH / 1080);
        const usingDebug = this.playerRole === 'adm' && Boolean(this.hudDebugToggle?.checked);
        const minRaw = Number(this.hudScaleMinInput?.value || 84) / 100;
        const maxRaw = Number(this.hudScaleMaxInput?.value || 106) / 100;
        const safeMin = Math.max(0.7, Math.min(1.1, minRaw));
        const safeMaxBase = Math.max(0.9, Math.min(1.4, maxRaw));
        const safeMax = Math.max(safeMin + 0.02, safeMaxBase);
        const hudScale = usingDebug
            ? Math.max(safeMin, Math.min(safeMax, baseScale))
            : Math.max(0.84, Math.min(1.06, baseScale));
        document.documentElement.style.setProperty('--hud-scale', hudScale.toFixed(3));
        document.documentElement.style.setProperty('--hud-gap', `${Math.max(10, Math.floor(Math.min(layoutW, layoutH) * 0.016))}px`);

        document.body.classList.toggle('hud-compact', layoutW < 1500 || layoutH < 900);
        document.body.classList.toggle('hud-ultra-compact', layoutW < 1280 || layoutH < 760);

        const hudZoomComp = 1 / Math.max(0.0001, clampedZoomScale);
        this.applyHudZoomComp(hudZoomComp);
        this.applyAdaptiveChatMode(layoutW, layoutH);

        this.resolveHudCollisions();
    }

    applyHudZoomComp(scale) {
        const safe = Math.max(0.6, Math.min(1.6, Number(scale || 1)));
        const zoomValue = safe.toFixed(3);
        const targets = [
            this.playerCard,
            this.targetPlayerCard,
            this.minimapWrap,
            this.chatWrap,
            this.skillbarWrap,
            this.menusWrap,
            this.partyFrames,
            this.partyNotifications,
            this.friendsNotifications
        ];
        for (const el of targets) {
            if (!el || !el.style) continue;
            el.style.zoom = zoomValue;
        }
    }

    updateHudDebugPanelUI() {
        const isAdmin = this.playerRole === 'adm';
        const enabled = isAdmin && Boolean(this.hudDebugToggle?.checked);
        if (this.hudDebugPanel) this.hudDebugPanel.classList.toggle('hidden', !enabled);
        if (this.hudScaleMinValue && this.hudScaleMinInput) this.hudScaleMinValue.textContent = `${this.hudScaleMinInput.value}%`;
        if (this.hudScaleMaxValue && this.hudScaleMaxInput) this.hudScaleMaxValue.textContent = `${this.hudScaleMaxInput.value}%`;
    }

    deriveAutoChatLayoutMode(layoutW, layoutH) {
        if (layoutW < 1280 || layoutH < 760) return 'mini';
        if (layoutW < 1500 || layoutH < 900) return 'compact';
        return 'expanded';
    }

    setChatLayoutMode(mode) {
        if (!this.chatWrap) return;
        const safeMode = mode === 'mini' || mode === 'compact' ? mode : 'expanded';
        this.chatWrap.classList.toggle('chat-compact', safeMode === 'compact');
        this.chatWrap.classList.toggle('chat-mini', safeMode === 'mini');
        // Mantem compatibilidade com o estilo antigo.
        this.chatWrap.classList.toggle('minimized', safeMode === 'mini');
        if (this.chatToggle) {
            const label = safeMode === 'mini' ? 'Mini' : safeMode === 'compact' ? 'Compacto' : 'Completo';
            this.chatToggle.textContent = `Chat: ${label}`;
        }
        if (Array.isArray(this.chatModeOptions)) {
            this.chatModeOptions.forEach((btn) => {
                const modeKey = String(btn.dataset.mode || '');
                btn.classList.toggle('active', modeKey === safeMode);
            });
        }
    }

    cycleChatLayoutMode() {
        const current = this.chatWrap?.classList?.contains('chat-mini')
            ? 'mini'
            : this.chatWrap?.classList?.contains('chat-compact')
                ? 'compact'
                : 'expanded';
        const next = current === 'expanded' ? 'compact' : current === 'compact' ? 'mini' : 'expanded';
        this.chatLayoutOverrideMode = next;
        this.setChatLayoutMode(next);
    }

    applyAdaptiveChatMode(layoutW, layoutH) {
        if (!this.chatWrap) return;
        const autoMode = this.deriveAutoChatLayoutMode(layoutW, layoutH);
        const forced = this.chatLayoutOverrideMode || null;
        const mode = forced || autoMode;
        this.setChatLayoutMode(mode);
    }

    /**
     * Inicia loop de renderização do cliente.
     */
    startLoop() {
        const loop = (now) => {
            this.draw(Number(now || performance.now()));
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updatePerformanceMetrics(now) {
        if (!Number.isFinite(now)) return;
        if (!this.fpsWindowStartAt) {
            this.fpsWindowStartAt = now;
            this.fpsFrameCount = 0;
        }
        this.fpsFrameCount += 1;
        const elapsed = now - this.fpsWindowStartAt;
        if (elapsed < 500) return;
        this.fpsValue = Math.round((this.fpsFrameCount * 1000) / Math.max(1, elapsed));
        this.fpsWindowStartAt = now;
        this.fpsFrameCount = 0;
        this.perfHudDirty = true;
    }

    refreshPerformanceHud(force = false, now = performance.now()) {
        if (!this.perfHud) return;
        if (!this.localId) {
            this.perfHud.classList.add('hidden');
            return;
        }
        this.perfHud.classList.remove('hidden');
        const due = now - this.perfHudLastPaintAt >= this.perfHudPaintIntervalMs;
        if (!force && !this.perfHudDirty && !due) return;
        const fpsLabel = Number.isFinite(Number(this.fpsValue)) && this.fpsValue > 0 ? String(this.fpsValue) : '--';
        const pingLabel = Number.isFinite(Number(this.networkPingMs)) ? `${Math.round(Number(this.networkPingMs))}ms` : '--';
        this.perfHud.textContent = `FPS ${fpsLabel} | Ping ${pingLabel}`;
        this.perfHudLastPaintAt = now;
        this.perfHudDirty = false;
    }

    /**
     * Desenha tiles visíveis do mapa.
     */
    drawMap() {
        this.ensureForestMap();
        if (this.shouldRenderTiledMap()) {
            const worldRect = {
                x: this.camera.x,
                y: this.camera.y,
                w: this.canvas.width,
                h: this.canvas.height
            };
            const rendered = this.drawTiledTerrain(this.ctx, worldRect, 1, 1);
            if (rendered) {
                this.drawMapFeatures(this.ctx, worldRect, 1, 1, false);
                for (const portal of this.mapPortals) {
                    const projected = this.worldToRenderCoords(portal.x + portal.w * 0.5, portal.y + portal.h * 0.5);
                    const sx = projected.x - this.camera.x;
                    const sy = projected.y - this.camera.y;
                    const radius = Math.max(8, Math.min(portal.w, portal.h) * 0.24);
                    this.drawPixelPortal(this.ctx, sx, sy, radius, 3);
                }
                return;
            }
        }
        const cols = Math.ceil(this.canvas.width / this.tileSize) + 1;
        const rows = Math.ceil(this.canvas.height / this.tileSize) + 1;
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const maxCol = this.mapCols - 1;
        const maxRow = this.mapRows - 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const rawCol = startCol + col;
                const rawRow = startRow + row;
                const mapCol = Math.max(0, Math.min(maxCol, rawCol));
                const mapRow = Math.max(0, Math.min(maxRow, rawRow));
                const screenX = rawCol * this.tileSize - this.camera.x;
                const screenY = rawRow * this.tileSize - this.camera.y;
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
            const portalPos = this.worldToRenderCoords(cx, cy);
            if (portalPos.x < viewLeft || portalPos.x > viewRight || portalPos.y < viewTop || portalPos.y > viewBottom) continue;
            const sx = portalPos.x - this.camera.x;
            const sy = portalPos.y - this.camera.y;
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
            const projected = this.worldToRenderCoords(mob.x, mob.y);
            let screenX = projected.x - this.camera.x;
            let screenY = projected.y - this.camera.y;
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
            const projected = this.worldToRenderCoords(item.x, item.y);
            const screenX = projected.x - this.camera.x;
            const screenY = projected.y - this.camera.y;

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
            const projected = this.worldToRenderCoords(p.x, p.y);
            let screenX = projected.x - this.camera.x;
            let screenY = projected.y - this.camera.y;
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
            p.animMs = (p.animMs || 0) + deltaMs;
            p.animLastX = p.x;
            p.animLastY = p.y;
            const attackAnimMs = attacking ? now - p.attackAnim.startedAt : null;
            const hasWeaponVisual = Boolean(this.getEquippedWeaponVisualKey(p));
            const attackMode = hasWeaponVisual ? 'armed' : 'unarmed';

            const frame = this.sprites.getPlayerFrame(
                p.class,
                p.facing || 's',
                moving && !attacking,
                p.animMs || 0,
                attackAnimMs,
                attackMode
            );
            const usesLayeredFrame = Boolean(frame && Array.isArray(frame.layers) && frame.layers.length > 0);
            if (usesLayeredFrame) {
                this.drawLayeredPlayerFrame(frame, screenX, screenY);
            } else if (frame.image) {
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

            // Weapon visuals are now fully driven by paperdoll layers (pONE pages).

            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 13px Arial';
            const nameY = usesLayeredFrame ? (screenY - 56) : (screenY - 30);
            this.ctx.fillText(`${p.name} Lv.${p.level}`, screenX, nameY);

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

    drawLayeredPlayerFrame(frame, screenX, screenY) {
        const drawW = 112;
        const drawH = 148;
        const drawX = screenX - Math.floor(drawW / 2);
        const drawY = screenY - 88;
        const layers = frame.layers || [];
        if (!layers.length) return;

        if (frame.mirror) {
            this.ctx.save();
            this.ctx.translate(screenX, 0);
            this.ctx.scale(-1, 1);
            for (const layer of layers) {
                if (!layer?.image || !layer?.source) continue;
                this.ctx.drawImage(
                    layer.image,
                    layer.source.x,
                    layer.source.y,
                    layer.source.w,
                    layer.source.h,
                    -Math.floor(drawW / 2),
                    drawY,
                    drawW,
                    drawH
                );
            }
            if (frame.tint) {
                this.ctx.fillStyle = frame.tint;
                this.ctx.fillRect(-Math.floor(drawW / 2), drawY, drawW, drawH);
            }
            this.ctx.restore();
            return;
        }

        for (const layer of layers) {
            if (!layer?.image || !layer?.source) continue;
            this.ctx.drawImage(
                layer.image,
                layer.source.x,
                layer.source.y,
                layer.source.w,
                layer.source.h,
                drawX,
                drawY,
                drawW,
                drawH
            );
        }
        if (frame.tint) {
            this.ctx.fillStyle = frame.tint;
            this.ctx.fillRect(drawX, drawY, drawW, drawH);
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

    getEquippedWeaponVisualKey(player) {
        const name = String(player?.equippedWeaponName || '').trim().toLowerCase();
        if (!name) return null;
        if (name.includes('arma de rubi')) return 'rubi_blade';
        if (name.includes('arma teste')) return 'teste_blade';
        return 'generic_blade';
    }

    drawEquippedWeaponSprite(player, screenX, screenY, moving, attacking, now) {
        const weaponKey = this.getEquippedWeaponVisualKey(player);
        if (!weaponKey) return;
        const pose = this.getProceduralPose(player, screenX, screenY, moving, attacking, now);
        const facingLeft = pose.side < 0;
        const handX = pose.rightHand.x;
        const handY = pose.rightHand.y;

        this.ctx.save();
        this.ctx.translate(handX, handY);
        this.ctx.rotate((facingLeft ? -1 : 1) * (attacking ? 0.62 : 0.24));
        if (weaponKey === 'rubi_blade') {
            this.ctx.fillStyle = '#f6d8dd';
            this.ctx.fillRect(-2, -25, 4, 20);
            this.ctx.fillStyle = '#b0173c';
            this.ctx.fillRect(-3, -28, 6, 6);
            this.ctx.fillStyle = '#5a3328';
            this.ctx.fillRect(-4, -7, 8, 4);
            this.ctx.fillStyle = '#8a5b47';
            this.ctx.fillRect(-1, -3, 2, 5);
        } else {
            this.ctx.fillStyle = '#c7d2de';
            this.ctx.fillRect(-2, -26, 4, 22);
            this.ctx.fillStyle = '#7b4f2a';
            this.ctx.fillRect(-4, -6, 8, 4);
        }
        this.ctx.restore();
    }

    drawSkillEffects() {
        if (!this.skillEffects.length) return;
        const now = Date.now();
        const alive = [];
        for (const fx of this.skillEffects) {
            if (Number(fx.expiresAt || 0) <= now) continue;
            const life = Math.max(0, Math.min(1, (now - fx.startedAt) / Math.max(1, fx.expiresAt - fx.startedAt)));
            const alpha = 1 - life;
            const radius = 18 + life * 28;
            const projected = this.worldToRenderCoords(fx.x, fx.y);
            const sx = projected.x - this.camera.x;
            const sy = projected.y - this.camera.y;
            let color = '120,190,255';
            const key = String(fx.effectKey || '');
            if (key.startsWith('war_')) color = '230,180,80';
            else if (key.startsWith('arc_')) color = '170,230,255';
            else if (key.startsWith('dru_')) color = '120,245,160';
            else if (key.startsWith('ass_')) color = '195,120,255';
            else if (key.startsWith('mod_')) color = '255,145,80';

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(${color}, ${Math.max(0.15, alpha * 0.8)})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = `rgba(${color}, ${Math.max(0.08, alpha * 0.22)})`;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, Math.max(8, radius * 0.42), 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            alive.push(fx);
        }
        this.skillEffects = alive;
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
            const projected = this.worldToRenderCoords(worldX, worldY);
            const sx = projected.x - this.camera.x;
            const sy = projected.y - this.camera.y;
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
        if (!(this.currentMapCode === 'A1' && this.hasTiledLayout('A1'))) {
            for (const feature of this.mapFeatures || []) {
                if (!feature || !feature.collision) continue;
                this.ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
                this.ctx.lineWidth = 2;
                if (feature.shape === 'rect') {
                this.ctx.strokeRect(
                    this.worldToRenderCoords(Number(feature.x), Number(feature.y)).x - this.camera.x,
                    this.worldToRenderCoords(Number(feature.x), Number(feature.y)).y - this.camera.y,
                    Number(feature.w),
                    Number(feature.h)
                );
            } else if (feature.shape === 'circle') {
                const projected = this.worldToRenderCoords(Number(feature.x), Number(feature.y));
                this.ctx.beginPath();
                this.ctx.arc(
                    projected.x - this.camera.x,
                    projected.y - this.camera.y,
                    Number(feature.r),
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
                }
            }
        }

        // Rota planejada recebida do servidor.
        const nodes = Array.isArray(me.pathNodes) ? me.pathNodes : [];
        if (nodes.length) {
            const points = [{ x: me.x, y: me.y }, ...nodes];
            this.drawPolyline(this.ctx, points, 'rgba(255, 90, 220, 0.95)', 3, (pt) => ({
                x: this.worldToRenderCoords(pt.x, pt.y).x - this.camera.x,
                y: this.worldToRenderCoords(pt.x, pt.y).y - this.camera.y
            }));
        }

        // Destino do ultimo clique enviado.
        if (this.lastMoveSent) {
            this.ctx.strokeStyle = 'rgba(80, 220, 255, 0.95)';
            this.ctx.lineWidth = 2;
            const projected = this.worldToRenderCoords(this.lastMoveSent.x, this.lastMoveSent.y);
            this.ctx.strokeRect(
                projected.x - this.camera.x - 6,
                projected.y - this.camera.y - 6,
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
        if (this.hudDebugSetting) this.hudDebugSetting.classList.toggle('hidden', !isAdmin);
        if (this.mobPeacefulSetting) this.mobPeacefulSetting.classList.toggle('hidden', !isAdmin);
        if (!isAdmin) {
            this.pathDebugEnabled = false;
            if (this.pathDebugToggle) this.pathDebugToggle.checked = false;
            if (this.hudDebugToggle) this.hudDebugToggle.checked = false;
            if (this.hudDebugPanel) this.hudDebugPanel.classList.add('hidden');
        }
        this.updateHudDebugPanelUI();
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
    draw(now = performance.now()) {
        this.updatePerformanceMetrics(now);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.smoothEntities();
        this.processPendingPickup();

        if (this.localId && this.players[this.localId]) {
            const me = this.players[this.localId];
            const focus = this.worldToRenderCoords(me.x, me.y);
            this.camera.x = focus.x - this.canvas.width / 2;
            this.camera.y = focus.y - this.canvas.height / 2;
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.mapWidth - this.canvas.width));
            this.camera.y = Math.max(0, Math.min(this.camera.y, this.mapHeight - this.canvas.height));
        }
        this.pruneTargetByDistance();
        this.updateTargetPlayerCard();

        this.drawMap();
        this.drawPathDebugOverlay();
        this.drawMobs();
        this.drawGroundItems();
        this.drawPlayers();
        this.drawSkillEffects();
        this.drawCombatProjectiles();
        this.drawMinimap(now);
        this.drawWorldMapPanel(now);
        this.refreshPerformanceHud(false, now);

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

    drawPolyline(ctx, points, color, width, transform = null) {
        if (!ctx || !Array.isArray(points) || points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let i = 0; i < points.length - 1; i++) {
            const a = transform ? transform(points[i]) : points[i];
            const b = transform ? transform(points[i + 1]) : points[i + 1];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }
}
