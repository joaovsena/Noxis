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
        this.currentMapId = 'E1';
        this.currentMapKey = 'forest';
        this.currentMapTheme = 'forest';
        this.mapPortals = [];

        this.panel = document.getElementById('char-panel');
        this.panelBody = document.getElementById('panel-body');
        this.panelClassChip = document.getElementById('panel-class-chip');

        this.playerCard = document.getElementById('player-card');
        this.playerAvatar = document.getElementById('player-avatar');
        this.playerName = document.getElementById('player-name');
        this.playerHpFill = document.getElementById('player-hp-fill');
        this.playerHpText = document.getElementById('player-hp-text');

        this.minimapWrap = document.getElementById('minimap-wrap');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.worldmapPanel = document.getElementById('worldmap-panel');
        this.worldmapCanvas = document.getElementById('worldmap-canvas');
        this.worldmapCtx = this.worldmapCanvas.getContext('2d');
        this.worldmapClose = document.getElementById('worldmap-close');
        this.menuMap = document.getElementById('menu-map');
        this.menusWrap = document.getElementById('menus-wrap');

        this.chatWrap = document.getElementById('chat-wrap');
        this.chatLog = document.getElementById('chat-log');
        this.chatInput = document.getElementById('chat-input');
        this.chatScopeButtons = [...document.querySelectorAll('.chat-scope')];
        this.chatScope = 'local';
        this.chatToggle = document.getElementById('chat-toggle');
        this.lastMoveAck = null;
        this.lastMoveSent = null;
        this.moveReqCounter = 0;
        this.chatBubbles = {};

        this.skillbarWrap = document.getElementById('skillbar-wrap');
        this.skillBasic = document.getElementById('skill-basic');
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
        this.tooltip = document.getElementById('item-tooltip');
        this.draggingEquippedWeapon = null;
        this.charPanelHeader = document.getElementById('char-panel-header');
        this.charPanelName = document.getElementById('char-panel-name');
        this.adminPanel = document.getElementById('admin-panel');
        this.adminHeader = document.getElementById('admin-header');
        this.adminCommand = document.getElementById('admin-command');
        this.adminSend = document.getElementById('admin-send');
        this.adminResult = document.getElementById('admin-result');
        this.playerRole = 'player';
        this.statusIds = {};
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
        this.forestSeed = 133742;
        this.mapCols = 0;
        this.mapRows = 0;
        this.mapTiles = null;
        this.mapVisualTheme = '';
        this.forestDecor = [];
        this.minimapViewSize = 1850;
        this.ensureForestMap();

        this.started = false;
        this.setupEvents();
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
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.localId) return;
            const world = this.toWorldCoords(e);
            this.hoveredMobId = this.getMobAt(world.x, world.y);
        });

        const handleWorldClick = (clientX, clientY) => {
            const world = this.toWorldCoordsFromClient(clientX, clientY);
            const itemId = this.getGroundItemAt(world.x, world.y);
            if (itemId) {
                this.network.send({ type: 'pickup_item', itemId });
                return;
            }
            const mobId = this.getMobAt(world.x, world.y);

            if (mobId) {
                this.selectedMobId = mobId;
                this.network.send({ type: 'target_mob', mobId });
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
                target.closest('#worldmap-panel')
            );
        };

        const sendMoveOrTarget = (clientX, clientY) => {
            if (!this.localId) return;
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
            if (isUiBlockedTarget(t)) return;
            if (t.closest('#gameCanvas')) return;
            sendMoveOrTarget(e.clientX, e.clientY);
        });

        window.addEventListener('resize', () => this.resize());

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (e.key.toLowerCase() !== 'c') return;
            this.toggleAttributesPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (e.key.toLowerCase() !== 'b') return;
            this.toggleInventoryPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (e.key.toLowerCase() !== 'm') return;
            this.toggleWorldMapPanel();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.localId) return;
            if (e.key.toLowerCase() !== 'h') return;
            if (this.playerRole !== 'adm') return;
            this.adminPanel.classList.toggle('hidden');
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
            if (e.button !== 0) return;
            if (!this.localId) return;
            this.handleWorldMapClick(e.clientX, e.clientY);
        });
        this.worldmapClose.addEventListener('click', () => {
            this.worldmapPanel.classList.add('hidden');
        });
        this.inventorySortBtn.addEventListener('click', () => {
            if (!this.localId) return;
            this.network.send({ type: 'inventory_sort' });
        });
        this.skillBasic.addEventListener('click', () => {
            if (!this.selectedMobId) return;
            this.network.send({ type: 'target_mob', mobId: this.selectedMobId });
        });

        this.chatToggle.addEventListener('click', () => {
            const minimized = this.chatWrap.classList.toggle('minimized');
            this.chatToggle.textContent = minimized ? 'Mostrar' : 'Ocultar';
        });

        this.deleteConfirmYes.addEventListener('click', () => {
            if (this.pendingDeleteItemId) {
                this.network.send({ type: 'inventory_delete', itemId: this.pendingDeleteItemId });
            }
            this.pendingDeleteItemId = null;
            this.deleteConfirm.classList.add('hidden');
        });
        this.deleteConfirmNo.addEventListener('click', () => {
            this.pendingDeleteItemId = null;
            this.deleteConfirm.classList.add('hidden');
        });

        this.adminSend.addEventListener('click', () => {
            const command = this.adminCommand.value.trim();
            if (!command) return;
            this.network.send({ type: 'admin_command', command });
        });

        this.makeDraggable(this.panel, this.charPanelHeader);
        this.makeDraggable(this.inventoryPanel, this.inventoryHeader);
        this.makeDraggable(this.adminPanel, this.adminHeader);
    }

    /**
     * Torna um painel arrastável pela barra de título.
     */
    makeDraggable(panel, handle) {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
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
        this.panel.classList.toggle('hidden');
        this.updatePanel();
    }

    /**
     * Alterna visibilidade do inventário.
     */
    toggleInventoryPanel() {
        this.inventoryPanel.classList.toggle('hidden');
        this.renderInventory();
    }

    toggleWorldMapPanel() {
        this.worldmapPanel.classList.toggle('hidden');
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
            const help = document.getElementById('admin-help');
            help.textContent = `setstatus {id} {quantia} {jogador} | ${lines}`;
        }
        this.resize();

        if (!this.started) {
            this.started = true;
            this.startLoop();
        }
    }

    /**
     * Callback de desconexão do socket.
     */
    onDisconnected() {
        if (this.menu) this.menu.setStatus('Conexao encerrada.', true);
    }

    /**
     * Recebe confirmação do servidor para comando de movimento.
     */
    onMoveAck(message) {
        this.lastMoveAck = message;
    }

    /**
     * Recebe snapshot do inventário do servidor.
     */
    onInventoryState(message) {
        this.inventory = Array.isArray(message.inventory) ? message.inventory : [];
        this.equippedWeaponId = message.equippedWeaponId || null;
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
        m.hitAnim = { until: Date.now() + 140, ox: ux * 10, oy: uy * 10 };
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
        return {
            x: event.clientX - rect.left + this.camera.x,
            y: event.clientY - rect.top + this.camera.y
        };
    }

    /**
     * Converte clientX/clientY para coordenada do mundo.
     */
    toWorldCoordsFromClient(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left + this.camera.x,
            y: clientY - rect.top + this.camera.y
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
     * Cria estado local interpolável de um player.
     */
    createPlayerState(player) {
        return {
            ...player,
            x: player.x,
            y: player.y,
            targetX: player.x,
            targetY: player.y,
            hitAnim: null,
            attackAnim: null,
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
        if (message.mapId) {
            this.currentMapId = message.mapId;
            this.instanceSelect.value = message.mapId;
        }
        if (message.mapKey) this.currentMapKey = message.mapKey;
        if (message.mapTheme) this.currentMapTheme = message.mapTheme;
        this.mapPortals = Array.isArray(message.portals) ? message.portals : [];
        this.ensureForestMap();

        this.syncPlayers(message.players || {});
        this.syncMobs(message.mobs || []);
        this.syncGroundItems(message.groundItems || []);
        this.updatePanel();
        this.updatePlayerCard();
    }

    /**
     * Sincroniza jogadores (add/update/remove) a partir do snapshot do servidor.
     */
    syncPlayers(serverPlayers) {
        for (const id of Object.keys(this.players)) {
            if (!serverPlayers[id]) delete this.players[id];
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
            p.level = incoming.level;
            p.hp = incoming.hp;
            p.maxHp = incoming.maxHp;
            p.xp = incoming.xp;
            p.xpToNext = incoming.xpToNext;
            p.equippedWeaponName = incoming.equippedWeaponName || null;
            p.stats = incoming.stats;
            p.targetX = incoming.x;
            p.targetY = incoming.y;
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
                const itemId = e.dataTransfer.getData('text/plain');
                if (!itemId) return;
                if (this.draggingEquippedWeapon && this.draggingEquippedWeapon === itemId) {
                    this.network.send({ type: 'inventory_unequip_to_slot', itemId, toSlot: slot });
                } else {
                    this.network.send({ type: 'inventory_move', itemId, toSlot: slot });
                }
            });

            const item = bySlot.get(slot);
            if (item) {
                const itemEl = document.createElement('div');
                itemEl.className = 'inv-item';
                if (item.id === this.equippedWeaponId) itemEl.style.borderColor = '#27ae60';
                itemEl.draggable = true;
                itemEl.textContent = item.name;
                itemEl.title = `${item.name}\nPATK +${item.bonuses?.physicalAttack || 0}\nMATK +${item.bonuses?.magicAttack || 0}\nMS +${item.bonuses?.moveSpeed || 0}\nASPD +${item.bonuses?.attackSpeed || 0}%`;
                itemEl.addEventListener('dblclick', () => {
                    this.network.send({ type: 'equip_item', itemId: item.id === this.equippedWeaponId ? null : item.id });
                });
                itemEl.addEventListener('mousemove', (e) => {
                    this.showItemTooltip(item, e.clientX, e.clientY);
                });
                itemEl.addEventListener('mouseleave', () => {
                    this.tooltip.classList.add('hidden');
                });
                itemEl.addEventListener('dragstart', (e) => {
                    this.inventoryDrag = { itemId: item.id };
                    itemEl.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', item.id);
                });
                itemEl.addEventListener('dragend', (e) => {
                    itemEl.classList.remove('dragging');
                    const x = e.clientX;
                    const y = e.clientY;
                    const target = document.elementFromPoint(x, y);
                    const droppedInside = target && target.closest && target.closest('#inventory-grid');
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
    showItemTooltip(item, clientX, clientY) {
        this.tooltip.innerHTML = `
            <div><strong>${item.name}</strong></div>
            <div>PATK: +${item.bonuses?.physicalAttack || 0}</div>
            <div>MATK: +${item.bonuses?.magicAttack || 0}</div>
            <div>MSPD: +${item.bonuses?.moveSpeed || 0}</div>
            <div>ASPD: +${item.bonuses?.attackSpeed || 0}%</div>
        `;
        this.tooltip.style.left = `${clientX + 12}px`;
        this.tooltip.style.top = `${clientY + 12}px`;
        this.tooltip.classList.remove('hidden');
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

        this.panelClassChip.style.background = this.getClassColor(p.class);
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
                e.dataTransfer.setData('text/plain', equipped.id);
            };
            weaponSlot.ondragend = () => {
                this.draggingEquippedWeapon = null;
            };
        } else if (weaponSlot) {
            weaponSlot.draggable = false;
            weaponSlot.ondragstart = null;
            weaponSlot.ondragend = null;
        }

        this.panelBody.innerHTML = '';
        const lines = [
            `Nivel: ${p.level}`,
            `XP: ${p.xp}/${p.xpToNext}`,
            `HP: ${p.hp}/${p.maxHp}`,
            `PATK: ${p.stats.physicalAttack}`,
            `MATK: ${p.stats.magicAttack}`,
            `PDEF: ${p.stats.physicalDefense}`,
            `MDEF: ${p.stats.magicDefense}`,
            `MSPD: ${p.stats.moveSpeed}`,
            `ASPD: ${p.stats.attackSpeed}%`,
            `RANGE: ${p.stats.attackRange}`
        ];
        for (const line of lines) {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = line;
            this.panelBody.appendChild(div);
        }
    }

    /**
     * Atualiza card de vida/nome do jogador local.
     */
    updatePlayerCard() {
        if (!this.localId || !this.players[this.localId]) return;
        const me = this.players[this.localId];
        this.playerAvatar.style.background = this.getClassColor(me.class);
        this.playerName.textContent = me.name;
        const hpPercent = me.maxHp > 0 ? me.hp / me.maxHp : 0;
        this.playerHpFill.style.width = `${Math.max(0, Math.min(1, hpPercent)) * 100}%`;
        this.playerHpText.textContent = `HP: ${me.hp}/${me.maxHp}`;
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

        const themeSeedOffset = theme === 'lava' ? 991 : 0;
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

                let type = 0; // 0=grama, 1=folhagem, 2=trilha, 3=agua rasa
                if (pathDist < 1.1 + n2 * 0.7) {
                    type = 2;
                } else if (n < 0.24 - radial * 0.1) {
                    type = 3;
                } else if (n > 0.68) {
                    type = 1;
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
        this.drawWorldPreview(this.worldmapCtx, this.worldmapCanvas, worldRect, true);
    }

    /**
     * Ajusta canvas para o tamanho da janela.
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
                this.ctx.fillStyle = this.getTileColor(t);
                this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                this.ctx.fillStyle = 'rgba(255,255,255,0.04)';
                this.ctx.fillRect(screenX, screenY, this.tileSize, 1);
            }
        }

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

            this.ctx.fillStyle = mob.color || '#d63031';
            this.ctx.fillRect(screenX - half, screenY - half, mob.size, mob.size);

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

            if (mob.kind && mob.kind !== 'normal') {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '11px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(mob.kind.toUpperCase(), screenX, screenY - half - 14);
            }
        }
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
            const attackMode = p.equippedWeaponName ? 'armed' : 'unarmed';

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
                    } else {
                        this.ctx.drawImage(frame.image, -20, drawY, drawW, drawH);
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
                    } else {
                        this.ctx.drawImage(frame.image, drawX, drawY, drawW, drawH);
                    }
                }
            } else {
                this.ctx.fillStyle = this.getClassColor(p.class);
                this.ctx.fillRect(screenX - 20, screenY - 20, 50, 80);
                if (p.class === 'bandit') {
                    this.ctx.strokeStyle = '#999';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(screenX - 20, screenY - 20, 50, 80);
                }
            }

            if (p.equippedWeaponName) {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.fillRect(screenX + 6, screenY - 26, 12, 28);
                this.ctx.strokeStyle = '#ffb3aa';
                this.ctx.strokeRect(screenX + 6, screenY - 26, 12, 28);
            }

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

        this.drawMap();
        this.drawMobs();
        this.drawGroundItems();
        this.drawPlayers();
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
