export class MenuUI {
    /**
     * Controla a UI de autenticação (abas de login/registro).
     */
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('auth-screen');
        this.status = document.getElementById('auth-status');

        this.tabLogin = document.getElementById('tab-login');
        this.tabRegister = document.getElementById('tab-register');
        this.formLogin = document.getElementById('form-login');
        this.formRegister = document.getElementById('form-register');

        this.selectClass = document.getElementById('register-class');
        this.preview = document.getElementById('class-preview');
        this.btnRegister = document.getElementById('btn-register');
        this.btnLogin = document.getElementById('btn-login');

        this.initEvents();
    }

    /**
     * Exibe mensagem de status no formulário.
     */
    setStatus(message, isError = false) {
        this.status.textContent = message || '';
        this.status.style.color = isError ? '#ff8a80' : '#f1c40f';
    }

    /**
     * Esconde a tela de autenticação após login bem-sucedido.
     */
    hide() {
        this.screen.style.display = 'none';
        document.getElementById('ui-container').style.display = 'none';
    }

    /**
     * Alterna entre aba de login e aba de registro.
     */
    setTab(mode) {
        const loginMode = mode === 'login';
        this.tabLogin.classList.toggle('active', loginMode);
        this.tabRegister.classList.toggle('active', !loginMode);
        this.formLogin.classList.toggle('hidden', !loginMode);
        this.formRegister.classList.toggle('hidden', loginMode);
        this.setStatus('');
    }

    /**
     * Conecta eventos dos botões, abas e seleção de classe.
     */
    initEvents() {
        this.tabLogin.addEventListener('click', () => this.setTab('login'));
        this.tabRegister.addEventListener('click', () => this.setTab('register'));

        this.selectClass.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'knight') this.preview.className = 'preview-knight';
            else if (val === 'shifter') this.preview.className = 'preview-shifter';
            else this.preview.className = 'preview-bandit';
        });

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
    }

    /**
     * Coleta e valida os dados da aba de registro.
     */
    collectRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const nick = document.getElementById('register-nick').value.trim();
        const selectedClass = this.selectClass.value;

        if (username.length < 3 || password.length < 3 || nick.length < 3) {
            this.setStatus('Usuario, senha e nick precisam ter ao menos 3 caracteres.', true);
            return null;
        }

        return {
            username,
            password,
            name: nick,
            class: selectedClass
        };
    }

    /**
     * Coleta e valida os dados da aba de login.
     */
    collectLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (username.length < 3 || password.length < 3) {
            this.setStatus('Preencha usuario e senha.', true);
            return null;
        }

        return { username, password };
    }
}
