import { ScreenManager } from './ScreenManager.js';

export class MenuUI {
    constructor(game) {
        this.game = game;
        this.uiContainer = document.getElementById('ui-container');
        this.screen = document.getElementById('auth-screen');
        this.status = document.getElementById('auth-status');

        this.screenLoginRegister = document.getElementById('screen-login-register');
        this.screenCharacterSelect = document.getElementById('screen-character-select');
        this.screenCharacterCreate = document.getElementById('screen-character-create');

        this.tabLogin = document.getElementById('tab-login');
        this.tabRegister = document.getElementById('tab-register');
        this.formLogin = document.getElementById('form-login');
        this.formRegister = document.getElementById('form-register');
        this.btnLogin = document.getElementById('btn-login');
        this.btnRegister = document.getElementById('btn-register');

        this.slotButtons = [
            document.getElementById('character-slot-0'),
            document.getElementById('character-slot-1'),
            document.getElementById('character-slot-2')
        ];
        this.characterSummary = document.getElementById('character-summary');
        this.btnCharacterEnter = document.getElementById('btn-character-enter');
        this.btnCharacterCreateFromSelect = document.getElementById('btn-character-create-from-select');
        this.btnCharacterBackLogin = document.getElementById('btn-character-back-login');

        this.createCharName = document.getElementById('create-char-name');
        this.createCharClass = document.getElementById('create-char-class');
        this.createCharGender = document.getElementById('create-char-gender');
        this.createCharPreview = document.getElementById('create-char-preview');
        this.btnCharacterCreate = document.getElementById('btn-character-create');
        this.btnCharacterCreateBack = document.getElementById('btn-character-create-back');
        this.preview = document.getElementById('class-preview');

        this.rootManager = new ScreenManager();
        this.flowManager = new ScreenManager();
        this.authModeManager = new ScreenManager();

        this.authMode = 'login';
        this.characterSlots = [null, null, null];
        this.selectedSlot = null;
        this.maxSlots = 3;

        this.rootManager.register('auth', this.screen);
        this.flowManager.register('login_register', this.screenLoginRegister);
        this.flowManager.register('character_select', this.screenCharacterSelect);
        this.flowManager.register('character_create', this.screenCharacterCreate);
        this.authModeManager.register('login', this.formLogin);
        this.authModeManager.register('register', this.formRegister);

        this.initEvents();
        this.showLogin();
    }

    setStatus(message, isError = false) {
        this.status.textContent = message || '';
        this.status.style.color = isError ? '#ff8a80' : '#f1c40f';
    }

    hide() {
        this.rootManager.hide('auth');
        this.uiContainer.style.display = 'none';
    }

    show() {
        this.uiContainer.style.display = '';
        this.rootManager.show('auth');
    }

    showLogin() {
        this.show();
        this.flowManager.show('login_register');
        this.setTab(this.authMode || 'login');
    }

    setTab(mode) {
        const loginMode = mode === 'login';
        this.authMode = loginMode ? 'login' : 'register';
        this.tabLogin.classList.toggle('active', loginMode);
        this.tabRegister.classList.toggle('active', !loginMode);
        this.authModeManager.show(this.authMode);
        this.setStatus('');
    }

    showCharacterRequired(message) {
        this.showCharacterCreate();
        if (message) this.setStatus(message, false);
    }

    showCharacterSelect(payload = {}) {
        this.characterSlots = Array.isArray(payload.slots) ? payload.slots.slice(0, 3) : [null, null, null];
        while (this.characterSlots.length < 3) this.characterSlots.push(null);
        this.maxSlots = Number.isInteger(Number(payload.maxSlots)) ? Math.max(1, Number(payload.maxSlots)) : 3;
        this.selectedSlot = this.findFirstFilledSlot();
        this.flowManager.show('character_select');
        this.renderCharacterSlots();
        this.setStatus('');
    }

    showCharacterCreate() {
        this.createCharName.value = '';
        this.createCharClass.value = this.createCharClass.value || 'knight';
        this.createCharGender.value = this.createCharGender.value || 'male';
        this.updateCreatePreview();
        this.flowManager.show('character_create');
    }

    initEvents() {
        this.tabLogin.addEventListener('click', () => this.setTab('login'));
        this.tabRegister.addEventListener('click', () => this.setTab('register'));

        this.btnRegister.addEventListener('click', () => {
            const payload = this.collectRegister();
            if (!payload) return;
            this.game.sendRegister(payload);
        });

        this.btnLogin.addEventListener('click', () => {
            const payload = this.collectLogin();
            if (!payload) return;
            this.game.sendLogin(payload);
        });

        this.slotButtons.forEach((button, slotIndex) => {
            if (!button) return;
            button.addEventListener('click', () => {
                this.selectedSlot = slotIndex;
                this.renderCharacterSlots();
            });
        });

        this.btnCharacterEnter.addEventListener('click', () => {
            if (this.selectedSlot == null || !this.characterSlots[this.selectedSlot]) {
                this.setStatus('Selecione um slot com personagem.', true);
                return;
            }
            this.game.sendCharacterEnter(this.selectedSlot);
        });

        this.btnCharacterCreateFromSelect.addEventListener('click', () => this.showCharacterCreate());
        if (this.btnCharacterBackLogin) {
            this.btnCharacterBackLogin.addEventListener('click', () => this.game.backToLoginFromCharacterSelect());
        }
        this.btnCharacterCreate.addEventListener('click', () => {
            const payload = this.collectCharacterCreate();
            if (!payload) return;
            this.game.sendCharacterCreate(payload);
        });
        this.btnCharacterCreateBack.addEventListener('click', () => this.showCharacterSelect({ slots: this.characterSlots }));
        this.createCharClass.addEventListener('change', () => this.updateCreatePreview());
        this.createCharGender.addEventListener('change', () => this.updateCreatePreview());
    }

    collectLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if (username.length < 3 || password.length < 3) {
            this.setStatus('Preencha usuario e senha.', true);
            return null;
        }
        return { username, password };
    }

    collectRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        if (username.length < 3 || password.length < 3) {
            this.setStatus('Usuario e senha precisam ter ao menos 3 caracteres.', true);
            return null;
        }
        return { username, password };
    }

    collectCharacterCreate() {
        const name = String(this.createCharName.value || '').trim();
        const selectedClass = String(this.createCharClass.value || 'knight');
        const gender = String(this.createCharGender.value || 'male');
        const validName = /^[a-zA-Z0-9_ ]{3,12}$/;
        if (!validName.test(name)) {
            this.setStatus('Nome invalido. Use 3-12 caracteres (letras, numeros, espaco ou _).', true);
            return null;
        }
        return {
            name: name.replace(/\s+/g, ' '),
            class: selectedClass,
            gender
        };
    }

    findFirstFilledSlot() {
        const idx = this.characterSlots.findIndex((slot) => slot);
        return idx >= 0 ? idx : null;
    }

    renderCharacterSlots() {
        const filledCount = this.characterSlots.filter((slot) => Boolean(slot)).length;
        const canCreate = filledCount < this.maxSlots;
        this.slotButtons.forEach((button, idx) => {
            if (!button) return;
            const slot = this.characterSlots[idx];
            const isUnavailableSlot = idx >= this.maxSlots;
            button.classList.toggle('selected', this.selectedSlot === idx);
            button.classList.toggle('empty', !slot);
            button.disabled = isUnavailableSlot;
            if (!slot) {
                if (isUnavailableSlot) {
                    button.innerHTML = `<span class="slot-title">Slot ${idx + 1}</span><span class="slot-line">Indisponivel</span>`;
                } else {
                    button.innerHTML = `<span class="slot-title">Slot ${idx + 1}</span><span class="slot-line">Vazio</span>`;
                }
                return;
            }
            const className = this.classLabel(slot.class);
            button.innerHTML = `<span class="slot-title">${slot.name || 'Sem nome'}</span><span class="slot-line">${className} Lv.${slot.level || 1}</span>`;
        });

        const selected = this.selectedSlot == null ? null : this.characterSlots[this.selectedSlot];
        this.btnCharacterEnter.disabled = !selected;
        if (!selected) {
            this.characterSummary.textContent = 'Selecione um slot com personagem ou crie um novo.';
        } else {
            this.characterSummary.textContent = `Selecionado: ${selected.name} (${this.classLabel(selected.class)}) Nivel ${selected.level || 1}.`;
        }

        this.btnCharacterCreateFromSelect.disabled = !canCreate;
        if (!canCreate) {
            this.btnCharacterCreateFromSelect.title = `Limite atingido (${this.maxSlots} personagem por conta).`;
            if (!selected) this.characterSummary.textContent = `Limite de ${this.maxSlots} personagem por conta atingido.`;
        } else {
            this.btnCharacterCreateFromSelect.title = '';
        }
    }

    updateCreatePreview() {
        const selectedClass = String(this.createCharClass.value || 'knight');
        const gender = String(this.createCharGender.value || 'male');
        this.applyPreviewClass(selectedClass);
        this.createCharPreview.textContent = `Classe ${this.classLabel(selectedClass)} | Sexo ${gender === 'female' ? 'Feminino' : 'Masculino'}.`;
    }

    classLabel(classId) {
        const normalized = String(classId || '').toLowerCase();
        if (normalized === 'archer') return 'Arqueiro';
        if (normalized === 'druid') return 'Druida';
        if (normalized === 'assassin') return 'Assassino';
        return 'Cavaleiro';
    }

    applyPreviewClass(className) {
        const valid = ['knight', 'archer', 'druid', 'assassin', 'shifter', 'bandit'];
        const safe = valid.includes(className) ? className : 'knight';
        const icon = safe === 'knight'
            ? 'K'
            : (safe === 'archer'
                ? 'A'
                : (safe === 'druid' || safe === 'shifter' ? 'D' : 'S'));
        this.preview.className = `class-avatar preview-avatar class-${safe}`;
        this.preview.textContent = icon;
    }
}
