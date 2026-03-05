export class Network {
    /**
     * Wrapper de WebSocket do cliente com fila de mensagens pendentes.
     */
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.queue = [];
    }

    /**
     * Abre conexão WS (ou reutiliza conexão já ativa).
     */
    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.socket = new WebSocket(`ws://${window.location.host}`);

        this.socket.onopen = () => {
            while (this.queue.length > 0) {
                this.socket.send(this.queue.shift());
            }
        };

        this.socket.onmessage = (event) => {
            let message;
            try {
                message = JSON.parse(event.data);
            } catch {
                return;
            }
            this.handleMessage(message);
        };

        this.socket.onclose = () => {
            this.game.onDisconnected();
        };
    }

    /**
     * Envia payload JSON no socket ou fila caso ainda não tenha conectado.
     */
    send(payload) {
        const encoded = JSON.stringify(payload);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(encoded);
            return;
        }
        this.queue.push(encoded);
    }

    /**
     * Roteia mensagens do servidor para handlers do Game.
     */
    handleMessage(message) {
        if (message.type === 'auth_error' || message.type === 'auth_ok') {
            this.game.onAuthMessage(message);
            return;
        }

        if (message.type === 'auth_success') {
            this.game.onAuthSuccess(message);
            return;
        }

        if (message.type === 'world_state') {
            this.game.updateWorld(message);
            return;
        }

        if (message.type === 'chat_message') {
            this.game.onChatMessage(message);
            return;
        }

        if (message.type === 'move_ack') {
            this.game.onMoveAck(message);
            return;
        }

        if (message.type === 'inventory_state') {
            this.game.onInventoryState(message);
            return;
        }

        if (message.type === 'combat_hit') {
            this.game.onCombatHit(message);
            return;
        }

        if (message.type === 'system_message') {
            this.game.onSystemMessage(message);
            return;
        }

        if (message.type === 'admin_result') {
            this.game.onAdminResult(message);
        }
    }
}
