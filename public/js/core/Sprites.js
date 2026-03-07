export class Sprites {
    /**
     * Gerencia sprites de jogadores em modo atlas e fallback por imagem unica.
     */
    constructor() {
        this.playerSprites = {};
        this.atlasByClass = {};
        this.paperdollByClass = {};
        this.pendingAtlasJson = {};
        this.pendingAtlasImage = {};

        // Fallback removido - arquivos não existem. Use apenas atlas configurado.

        this.loadPaperdollForClass('archer', 'v00');
        this.loadPaperdollForClass('knight', 'v01');
        this.loadPaperdollForClass('druid', 'v09');
        this.loadPaperdollForClass('assassin', 'v10');
    }

    getClassTint(className) {
        if (className === 'druid' || className === 'shifter') return 'rgba(75, 209, 55, 0.24)';
        if (className === 'archer') return 'rgba(229, 151, 34, 0.24)';
        if (className === 'assassin' || className === 'bandit') return 'rgba(35, 35, 42, 0.34)';
        return null;
    }

    /**
     * Carrega sprite unico (fallback).
     */
    loadPlayerSprite(className, src) {
        const img = new Image();
        img.onload = () => {
            this.playerSprites[className] = img;
        };
        img.onerror = () => {};
        img.src = src;
    }

    /**
     * Inicia carregamento de atlas + json de frames.
     */
    loadAtlas(className, imageSrc, jsonSrc, animationMap, headImageSrc = null, headJsonSrc = null, headAnimationMap = null) {
        const img = new Image();
        img.onload = () => {
            this.pendingAtlasImage[className] = img;
            this.tryBuildAtlas(className, animationMap, headAnimationMap);
        };
        img.onerror = () => {};
        img.src = imageSrc;

        fetch(jsonSrc)
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (!json) return;
                this.pendingAtlasJson[className] = json;
                this.tryBuildAtlas(className, animationMap, headAnimationMap);
            })
            .catch(() => {});

        if (headImageSrc && headJsonSrc) {
            const headImg = new Image();
            headImg.onload = () => {
                this.pendingAtlasImage[`${className}__head`] = headImg;
                this.tryBuildAtlas(className, animationMap, headAnimationMap);
            };
            headImg.onerror = () => {};
            headImg.src = headImageSrc;

            fetch(headJsonSrc)
                .then((res) => (res.ok ? res.json() : null))
                .then((json) => {
                    if (!json) return;
                    this.pendingAtlasJson[`${className}__head`] = json;
                    this.tryBuildAtlas(className, animationMap, headAnimationMap);
                })
                .catch(() => {});
        }
    }

    /**
     * Monta estrutura interna do atlas quando png e json estiverem carregados.
     */
    tryBuildAtlas(className, animationMap, headAnimationMap = null) {
        const img = this.pendingAtlasImage[className];
        const json = this.pendingAtlasJson[className];
        if (!img || !json) return;
        const hasHead = Boolean(headAnimationMap);
        if (hasHead) {
            const headImg = this.pendingAtlasImage[`${className}__head`];
            const headJson = this.pendingAtlasJson[`${className}__head`];
            if (!headImg || !headJson) return;
        }

        const frameByName = {};
        const frames = Array.isArray(json.frames) ? json.frames : [];
        for (const f of frames) {
            if (!f || !f.name) continue;
            frameByName[f.name] = {
                x: f.x,
                y: f.y,
                w: f.w,
                h: f.h,
                headAnchor: f.headAnchor || null
            };
        }

        const animations = {};
        for (const key of Object.keys(animationMap)) {
            const value = animationMap[key];
            if (Array.isArray(value)) {
                animations[key] = value.map((name) => frameByName[name]).filter(Boolean);
            } else {
                animations[key] = frameByName[value] || null;
            }
        }

        let headAtlas = null;
        if (hasHead) {
            const headImg = this.pendingAtlasImage[`${className}__head`];
            const headJson = this.pendingAtlasJson[`${className}__head`];
            const headFrameByName = {};
            const headFrames = Array.isArray(headJson.frames) ? headJson.frames : [];
            for (const f of headFrames) {
                if (!f || !f.name) continue;
                headFrameByName[f.name] = { x: f.x, y: f.y, w: f.w, h: f.h };
            }
            const headAnimations = {};
            for (const key of Object.keys(headAnimationMap)) {
                const value = headAnimationMap[key];
                if (Array.isArray(value)) {
                    headAnimations[key] = value.map((name) => headFrameByName[name]).filter(Boolean);
                } else {
                    headAnimations[key] = headFrameByName[value] || null;
                }
            }
            headAtlas = { image: headImg, animations: headAnimations };
        }

        this.atlasByClass[className] = {
            image: img,
            animations,
            headAtlas
        };
    }

    /**
     * Retorna frame para desenhar (atlas recortado ou imagem unica).
     */
    getPlayerFrame(className, facing, moving, animTimeMs, attackAnimMs = null, attackMode = 'unarmed') {
        const normalizedClass = this.normalizeClassName(className);
        const paperdollFrame = this.getPaperdollFrame(normalizedClass, facing, moving, animTimeMs, attackAnimMs, attackMode);
        if (paperdollFrame) return paperdollFrame;

        const atlas = this.atlasByClass[normalizedClass];
        if (atlas) {
            const frame = this.getAtlasFrame(normalizedClass, atlas, facing, moving, animTimeMs, attackAnimMs, attackMode);
            frame.tint = this.getClassTint(normalizedClass);
            return frame;
        }

        return { className: normalizedClass, image: this.getPlayerSprite(normalizedClass), mirror: false, source: null, head: null, tint: this.getClassTint(normalizedClass) };
    }

    /**
     * Resolve animacao do atlas por direcao, com espelhamento para lado leste.
     */
    getAtlasFrame(className, atlas, facing, moving, animTimeMs, attackAnimMs = null, attackMode = 'unarmed') {
        const dirMap = {
            s: { key: 's', mirror: false },
            sw: { key: 'sw', mirror: false },
            w: { key: 'w', mirror: false },
            nw: { key: 'nw', mirror: false },
            n: { key: 'n', mirror: false },
            se: { key: 'sw', mirror: true },
            e: { key: 'w', mirror: true },
            ne: { key: 'nw', mirror: true }
        };
        const mapped = dirMap[facing] || dirMap.s;
        const suffix = mapped.key;
        const anims = atlas.animations;
        if (attackAnimMs !== null) {
            const attack = this.resolveAttackFrames(anims, suffix, attackMode);
            if (Array.isArray(attack) && attack.length > 0) {
                const attackFrame = Math.min(attack.length - 1, Math.floor(attackAnimMs / 70));
                return this.attachHead(className, atlas, `attack_${suffix}`, attack[attackFrame], mapped.mirror, attackFrame);
            }
        }

        if (!moving) {
            const idle = anims[`idle_${suffix}`] || anims.idle_s || null;
            return this.attachHead(className, atlas, `idle_${suffix}`, idle, mapped.mirror);
        }

        const walk = anims[`walk_${suffix}`];
        if (!Array.isArray(walk) || walk.length === 0) {
            const idle = anims[`idle_${suffix}`] || anims.idle_s || null;
            return this.attachHead(className, atlas, `idle_${suffix}`, idle, mapped.mirror);
        }

        const frame = Math.floor(animTimeMs / 90) % walk.length;
        return this.attachHead(className, atlas, `walk_${suffix}`, walk[frame], mapped.mirror, frame);
    }

    /**
     * Resolve sequencia de ataque por direcao com fallback.
     */
    resolveAttackFrames(animations, suffix, attackMode) {
        const modePrefix = attackMode === 'armed' ? 'attack_armed_' : 'attack_unarmed_';
        const candidatesByDir = {
            s: [`${modePrefix}s`, `${modePrefix}sw`, `${modePrefix}w`],
            sw: [`${modePrefix}sw`, `${modePrefix}w`],
            w: [`${modePrefix}w`, `${modePrefix}sw`],
            nw: [`${modePrefix}nw`, `${modePrefix}w`],
            n: [`${modePrefix}n`, `${modePrefix}nw`, `${modePrefix}w`]
        };
        const fallback = [`${modePrefix}w`, `${modePrefix}sw`, `${modePrefix}nw`];
        const candidates = candidatesByDir[suffix] || fallback;
        for (const key of candidates) {
            const seq = animations[key];
            if (Array.isArray(seq) && seq.length > 0) return seq;
        }
        return null;
    }

    /**
     * Anexa frame da cabeca ao frame do corpo quando existir atlas de cabeca.
     */
    attachHead(className, atlas, key, bodySource, mirror, frameIndex = 0) {
        if (!atlas.headAtlas) {
            return { className, image: atlas.image, source: bodySource, mirror, head: null };
        }
        const headAnim = atlas.headAtlas.animations[key];
        let headSource = null;
        if (Array.isArray(headAnim) && headAnim.length > 0) {
            headSource = headAnim[frameIndex % headAnim.length];
        } else if (headAnim && !Array.isArray(headAnim)) {
            headSource = headAnim;
        }
        return {
            className,
            image: atlas.image,
            source: bodySource,
            mirror,
            head: headSource ? { image: atlas.headAtlas.image, source: headSource } : null
        };
    }

    /**
     * Retorna sprite unico fallback.
     */
    getPlayerSprite(className) {
        return this.playerSprites[className] || null;
    }

    normalizeClassName(className) {
        const raw = String(className || '').trim().toLowerCase();
        if (raw === 'cavaleiro') return 'knight';
        if (raw === 'arqueiro') return 'archer';
        if (raw === 'druida' || raw === 'shifter') return 'druid';
        if (raw === 'assassino' || raw === 'bandit') return 'assassin';
        if (raw === 'knight' || raw === 'archer' || raw === 'druid' || raw === 'assassin') return raw;
        return 'knight';
    }

    loadPaperdollForClass(className, variant = 'v01') {
        const files = {
            p1_base: `/assets/animacoes/char_a_p1/char_a_p1_0bas_humn_${variant}.png`,
            pONE1_base: `/assets/animacoes/char_a_pONE1/char_a_pONE1_0bas_humn_${variant}.png`,
            pONE1_weapon: `/assets/animacoes/char_a_pONE1/6tla/char_a_pONE1_6tla_sw01_${variant}.png`,
            pONE1_shield: `/assets/animacoes/char_a_pONE1/7tlb/char_a_pONE1_7tlb_sh01_${variant}.png`,
            pONE2_base: `/assets/animacoes/char_a_pONE2/char_a_pONE2_0bas_humn_${variant}.png`,
            pONE2_weapon: `/assets/animacoes/char_a_pONE2/6tla/char_a_pONE2_6tla_sw01_${variant}.png`,
            pONE2_shield: `/assets/animacoes/char_a_pONE2/7tlb/char_a_pONE2_7tlb_sh01_${variant}.png`
        };
        const loaded = {};
        const keys = Object.keys(files);
        let pending = keys.length;
        const done = () => {
            pending -= 1;
            if (pending > 0) return;
            if (!loaded.p1_base) return;
            this.paperdollByClass[className] = {
                cell: 64,
                variant,
                pages: {
                    p1: { base: loaded.p1_base },
                    pONE1: { base: loaded.pONE1_base, weapon: loaded.pONE1_weapon, shield: loaded.pONE1_shield },
                    pONE2: { base: loaded.pONE2_base, weapon: loaded.pONE2_weapon, shield: loaded.pONE2_shield }
                },
                timing: {
                    walk: [135, 135, 135, 135, 135, 135],
                    combatIdle: [140, 140, 140, 140],
                    combatMove: [110, 110, 110, 110],
                    attackSlash: [95, 95, 95, 95, 95, 95]
                }
            };
        };
        for (const key of keys) {
            const img = new Image();
            img.onload = () => {
                loaded[key] = img;
                done();
            };
            img.onerror = () => {
                loaded[key] = null;
                done();
            };
            img.src = files[key];
        }
    }

    getPaperdollFrame(className, facing, moving, animTimeMs, attackAnimMs = null, attackMode = 'unarmed') {
        const paperdoll = this.paperdollByClass[className];
        if (!paperdoll) return null;
        const mapped = this.mapPaperdollFacing(facing);
        if (!mapped) return null;

        const armed = attackMode === 'armed';
        const attacking = attackAnimMs !== null;
        let pageKey = 'p1';
        let row = mapped.row;
        let cols = [0];
        let durations = [99999];
        let includeTools = false;

        if (attacking) {
            pageKey = 'pONE1';
            row = mapped.row;
            cols = [0, 1, 2, 3, 4, 5];
            durations = paperdoll.timing.attackSlash;
            includeTools = armed;
        } else if (armed && moving) {
            pageKey = 'pONE2';
            row = mapped.row;
            cols = [4, 5, 6, 7];
            durations = paperdoll.timing.combatMove;
            includeTools = true;
        } else if (armed) {
            pageKey = 'pONE2';
            row = mapped.row;
            cols = [0, 1, 2, 3];
            durations = paperdoll.timing.combatIdle;
            includeTools = true;
        } else if (moving) {
            pageKey = 'p1';
            row = 4 + mapped.row;
            cols = [0, 1, 2, 3, 4, 5];
            durations = paperdoll.timing.walk;
        } else {
            pageKey = 'p1';
            row = mapped.row;
            cols = [0];
            durations = [99999];
        }

        const page = paperdoll.pages[pageKey];
        if (!page || !page.base) return null;
        const elapsed = attackAnimMs !== null && armed ? attackAnimMs : animTimeMs;
        const index = this.resolveTimedFrameIndex(elapsed, durations);
        const col = cols[index % cols.length];
        const baseLayer = this.makePaperdollLayer(page.base, row, col, paperdoll.cell);
        if (!baseLayer) return null;

        const behindLayers = [];
        const frontLayers = [];

        if (includeTools) {
            const weaponLayer = this.makePaperdollLayer(page.weapon, row, col, paperdoll.cell);
            const shieldLayer = this.makePaperdollLayer(page.shield, row, col, paperdoll.cell);
            const plan = this.resolveToolLayerPlan(pageKey, row, col);

            // Keep sword above shield when both are on the same side.
            const orderedTools = [];
            if (shieldLayer) orderedTools.push({ kind: 'shield', layer: shieldLayer });
            if (weaponLayer) orderedTools.push({ kind: 'weapon', layer: weaponLayer });

            for (const t of orderedTools) {
                const isFront = t.kind === 'weapon' ? plan.weaponFront : plan.shieldFront;
                if (isFront) frontLayers.push(t.layer);
                else behindLayers.push(t.layer);
            }
        }

        const layers = [...behindLayers, baseLayer, ...frontLayers];
        if (!layers.length) return null;
        return {
            className,
            image: layers[0].image,
            source: layers[0].source,
            mirror: mapped.mirror,
            head: null,
            tint: null,
            layers,
            paperdoll: true,
            includesTools: includeTools
        };
    }

    resolveToolLayerPlan(pageKey, row, col) {
        // Defaults are safest for readability in top-down/isometric combat:
        // shield behind and weapon in front.
        const fallback = { weaponFront: true, shieldFront: false };
        const dirRow = ((row % 4) + 4) % 4;

        if (pageKey === 'pONE2') {
            const byRow = {
                0: { weaponFront: true, shieldFront: true },   // south
                1: { weaponFront: false, shieldFront: false }, // west
                2: { weaponFront: true, shieldFront: false },  // east
                3: { weaponFront: true, shieldFront: false }   // north
            };
            return byRow[dirRow] || fallback;
        }

        if (pageKey === 'pONE3') {
            // Slash 1 (cols 0..3) based on included layer-order guides.
            const weaponFront = {
                0: [false, false, false, false],
                1: [false, false, false, false],
                2: [false, true, false, false],
                3: [false, true, false, false]
            };
            const shieldFront = {
                0: [true, false, false, false],
                1: [false, false, true, false],
                2: [false, false, false, false],
                3: [false, false, false, false]
            };
            const c = Math.max(0, Math.min(3, col));
            const wf = weaponFront[row]?.[c];
            const sf = shieldFront[row]?.[c];
            return {
                weaponFront: typeof wf === 'boolean' ? wf : fallback.weaponFront,
                shieldFront: typeof sf === 'boolean' ? sf : fallback.shieldFront
            };
        }

        return fallback;
    }

    mapPaperdollFacing(facing) {
        const map = {
            // User mapping:
            // p1 movement rows (bottom half): S, N, L(east), O(west)
            // pONE1 combat rows (top half): S, N, L(east), O(west)
            s: { row: 0, mirror: false },
            n: { row: 1, mirror: false },
            e: { row: 2, mirror: false },
            w: { row: 3, mirror: false },
            se: { row: 0, mirror: false },
            sw: { row: 0, mirror: false },
            ne: { row: 1, mirror: false },
            nw: { row: 1, mirror: false }
        };
        return map[facing] || map.s;
    }

    resolveTimedFrameIndex(elapsedMs, durations) {
        if (!Array.isArray(durations) || !durations.length) return 0;
        const total = durations.reduce((sum, value) => sum + Math.max(1, value), 0);
        let t = elapsedMs % total;
        for (let i = 0; i < durations.length; i += 1) {
            const d = Math.max(1, durations[i]);
            if (t < d) return i;
            t -= d;
        }
        return durations.length - 1;
    }

    makePaperdollLayer(image, row, col, cell) {
        if (!image) return null;
        return {
            image,
            source: {
                x: col * cell,
                y: row * cell,
                w: cell,
                h: cell
            }
        };
    }
}
