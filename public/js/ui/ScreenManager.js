export class ScreenManager {
    constructor() {
        this.screens = new Map();
        this.currentId = null;
    }

    register(id, element, options = {}) {
        if (!id || !element) return;
        this.screens.set(String(id), {
            id: String(id),
            element,
            onEnter: typeof options.onEnter === 'function' ? options.onEnter : null,
            onExit: typeof options.onExit === 'function' ? options.onExit : null
        });
    }

    show(id, payload = null) {
        const key = String(id || '');
        const next = this.screens.get(key);
        if (!next) return false;

        if (this.currentId && this.currentId !== key) {
            const current = this.screens.get(this.currentId);
            if (current) {
                if (current.onExit) current.onExit(payload);
                current.element.classList.add('hidden');
                current.element.style.display = 'none';
            }
        }

        next.element.classList.remove('hidden');
        next.element.style.display = '';
        if (next.onEnter) next.onEnter(payload);
        this.currentId = key;
        return true;
    }

    hide(id = null, payload = null) {
        const key = id ? String(id) : this.currentId;
        if (!key) return false;
        const current = this.screens.get(key);
        if (!current) return false;
        if (current.onExit) current.onExit(payload);
        current.element.classList.add('hidden');
        current.element.style.display = 'none';
        if (this.currentId === key) this.currentId = null;
        return true;
    }

    getCurrentId() {
        return this.currentId;
    }
}
