export class Sprites {
    /**
     * Gerencia sprites de jogadores em modo atlas e fallback por imagem unica.
     */
    constructor() {
        this.playerSprites = {};
        this.atlasByClass = {};
        this.pendingAtlasJson = {};
        this.pendingAtlasImage = {};

        // Fallback removido - arquivos não existem. Use apenas atlas configurado.

        // Cavaleiro via atlas (atlas.png + atlas.json).
        this.loadAtlas(
            'knight',
            '/assets/sprites/cavaleiro/cavaleiro_corpo_atlas.png',
            '/assets/sprites/cavaleiro/cavaleiro_corpo_atlas.json',
            {
                spin360: ['r00_f00', 'r00_f01', 'r00_f02', 'r00_f03', 'r00_f04'],
                walk_s: ['r01_f00', 'r01_f01', 'r01_f02', 'r01_f03', 'r01_f04', 'r01_f05', 'r01_f06', 'r01_f07'],
                walk_sw: ['r02_f00', 'r02_f01', 'r02_f02', 'r02_f03', 'r02_f04', 'r02_f05', 'r02_f06', 'r02_f07'],
                walk_w: ['r03_f00', 'r03_f01', 'r03_f02', 'r03_f03', 'r03_f04', 'r03_f05', 'r03_f06', 'r03_f07'],
                walk_nw: ['r04_f00', 'r04_f01', 'r04_f02', 'r04_f03', 'r04_f04', 'r04_f05', 'r04_f06', 'r04_f07'],
                walk_n: ['r05_f00', 'r05_f01', 'r05_f02', 'r05_f03', 'r05_f04', 'r05_f05', 'r05_f06', 'r05_f07'],
                // Combate: primeira linha (f00..f05) = desarmado, segunda (f06..f11) = armado.
                attack_unarmed_nw: ['r06_f00', 'r06_f01', 'r06_f02', 'r06_f03', 'r06_f04', 'r06_f05'],
                attack_armed_nw: ['r06_f06', 'r06_f07', 'r06_f08', 'r06_f09', 'r06_f10', 'r06_f11'],
                attack_unarmed_w: ['r07_f00', 'r07_f01', 'r07_f02', 'r07_f03', 'r07_f04', 'r07_f05'],
                attack_armed_w: ['r07_f06', 'r07_f07', 'r07_f08', 'r07_f09', 'r07_f10', 'r07_f11'],
                attack_unarmed_sw: ['r08_f00', 'r08_f01', 'r08_f02', 'r08_f03', 'r08_f04', 'r08_f05'],
                attack_armed_sw: ['r08_f06', 'r08_f07', 'r08_f08', 'r08_f09', 'r08_f10', 'r08_f11'],
                idle_s: 'r01_f00',
                idle_sw: 'r02_f00',
                idle_w: 'r03_f00',
                idle_nw: 'r04_f00',
                idle_n: 'r05_f00'
            },
            '/assets/sprites/cavaleiro/cavaleiro_cabeca_atlas.png',
            '/assets/sprites/cavaleiro/cavaleiro_cabeca_atlas.json',
            {
                idle_s: 'r00_f00',
                idle_sw: 'r00_f01',
                idle_w: 'r00_f02',
                idle_nw: 'r00_f03',
                idle_n: 'r00_f04',
                walk_s: ['r00_f00'],
                walk_sw: ['r00_f01'],
                walk_w: ['r00_f02'],
                walk_nw: ['r00_f03'],
                walk_n: ['r00_f04'],
                attack_s: ['r00_f00'],
                attack_sw: ['r00_f01'],
                attack_w: ['r00_f02'],
                attack_nw: ['r00_f03'],
                attack_n: ['r00_f04']
            }
        );
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
        const atlas = this.atlasByClass[className];
        if (atlas) {
            return this.getAtlasFrame(className, atlas, facing, moving, animTimeMs, attackAnimMs, attackMode);
        }

        return { className, image: this.getPlayerSprite(className), mirror: false, source: null, head: null };
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
}
