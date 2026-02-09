
const imageCache = {
    cache: new Map(),
    loadedImages: 0,
    totalImages: 0,
    onComplete: null,
    domContainer: null,

    initDomContainer: function () {
        if (!this.domContainer) {
            this.domContainer = document.createElement('div');
            this.domContainer.id = 'asset-cache';
            this.domContainer.style.cssText = `
                position: absolute;
                width: 0;
                height: 0;
                overflow: hidden;
                pointer-events: none;
                visibility: hidden;
                z-index: -9999;
            `;
            document.body.appendChild(this.domContainer);
        }
    },

    preloadImages: function (urls) {
        this.initDomContainer();

        return new Promise(async (resolve, reject) => {
            if (urls.length === 0) {
                resolve(true);
                return;
            }

            this.totalImages = urls.length;
            this.loadedImages = 0;

            const promises = urls.map(async url => {
                if (this.cache.has(url)) {
                    this.imageLoaded();
                    return;
                }

                try {
                    const img = new Image();
                    img.src = url;
                    await img.decode();

                    // Add to DOM to force retention
                    this.domContainer.appendChild(img);

                    this.cache.set(url, img);
                    this.imageLoaded();
                } catch (e) {
                    console.warn(`Falha ao decodificar imagem: ${url}`, e);
                    const img = new Image();
                    img.onload = () => {
                        this.domContainer.appendChild(img); // Add even on fallback
                        this.cache.set(url, img);
                        this.imageLoaded();
                    };
                    img.onerror = () => this.imageLoaded();
                    img.src = url;
                }
            });

            await Promise.all(promises);
            resolve(true);
        });
    },

    imageLoaded: function () {
        this.loadedImages++;
        if (this.loadedImages === this.totalImages) {
            console.log('✅ Todas as imagens foram carregadas e cacheadas no DOM!');
            if (this.onComplete) this.onComplete();
        }
    },

    getImage: function (url) {
        return this.cache.get(url);
    }
};

async function preloadAllGameAssets() {
    console.log('🔵 Iniciando pré-carregamento de assets...');

    // Coleta todas as URLs únicas
    const allUrls = new Set();

    Object.values(ASSETS).forEach(asset => {
        if (Array.isArray(asset)) {
            asset.forEach(url => {
                if (url && typeof url === 'string') {
                    allUrls.add(url);
                }
            });
        } else if (typeof asset === 'string') {
            allUrls.add(asset);
        }
    });

    // Adiciona URLs das armas
    Object.values(WEAPONS).forEach(weapon => {
        if (weapon.animation) {
            weapon.animation.forEach(url => allUrls.add(url));
        }
        if (weapon.icon) allUrls.add(weapon.icon);
        if (weapon.chargeAnimation) {
            weapon.chargeAnimation.forEach(url => allUrls.add(url));
        }
    });

    const urlsArray = Array.from(allUrls);
    console.log(`🔵 Pré-carregando ${urlsArray.length} imagens...`);

    try {
        const success = await imageCache.preloadImages(urlsArray);
        if (success) {
            console.log('✅ Todos os assets foram pré-carregados!');

            // Opcional: Iniciar jogo após carregar
            if (window.gameReadyCallback) {
                window.gameReadyCallback();
            }
        }
    } catch (error) {
        console.error('❌ Erro ao pré-carregar assets:', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Inicia pré-carregamento
    preloadAllGameAssets();

    // Configuração de FPS fixo
    const FPS = 60;
    let lastFrameTime = 0;
    let frameInterval = 1000 / FPS;
    let accumulator = 0;

    function adjustGameScale() {
        const gameContainer = document.getElementById('game-container');
        const gameScaler = document.getElementById('game-scaler');
        const BASE_WIDTH = 1366;
        const BASE_HEIGHT = 768;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scaleX = windowWidth / BASE_WIDTH;
        const scaleY = windowHeight / BASE_HEIGHT;
        let scale = Math.min(scaleX, scaleY);
        const MIN_SCALE = 1.0;
        const MAX_SCALE = 1.0;
        scale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
        gameContainer.style.transform = `scale(${scale})`;
        const scaledWidth = BASE_WIDTH * scale;
        const scaledHeight = BASE_HEIGHT * scale;
        gameScaler.style.width = `${scaledWidth}px`;
        gameScaler.style.height = `${scaledHeight}px`;
        if (CONFIG.DEBUG_MODE) {
            console.log(`Window: ${windowWidth}x${windowHeight}, Scale: ${scale.toFixed(2)}, Scaled: ${scaledWidth}x${scaledHeight}`);
        }
        if (CONFIG.DEBUG_MODE) {
            console.log('Jogador:', {
                x: this.player.x.toFixed(1),
                y: this.player.y.toFixed(1),
                velX: this.player.velocityX.toFixed(1),
                velY: this.player.velocityY.toFixed(1),
                grounded: this.player.isGrounded
            });
        }
    }
    window.addEventListener('resize', adjustGameScale);
    window.addEventListener('orientationchange', adjustGameScale);
    window.addEventListener('load', adjustGameScale);
    setTimeout(adjustGameScale, 100);
    const CONFIG = {
        DEBUG_MODE: true,
        PLAYER_SPEED: 7, 
        PLAYER_ACCELERATION: 1.5,
        PLAYER_FRICTION: 0.8,
        PLAYER_AIR_RESISTANCE: 0.95,
        PLAYER_HEALTH: 8,
        POINTS_PER_ENEMY: 2,
        POINTS_FOR_EXTRA_HEART: 1000,
        MAX_EXTRA_HEARTS: 20,
        GRAVITY: 0.6,
        PLAYER_JUMP_FORCE: 16,
        PLAYER_JUMP_CUT: 0.5, 
        COYOTE_TIME: 100,
        JUMP_BUFFER: 150,
        CAMERA_SMOOTHING: 0.5,
        INVULNERABILITY_DURATION: 2000,
        SPECIAL_CHARGE_MAX: 6,
        SPECIAL_DURATION: 4000,
        DEFENSE_KNOCKBACK: 15,
        GAME_WIDTH: 800,
        GAME_HEIGHT: 600,
        PIT_DAMAGE: 1,
        PIT_DAMAGE_TO_ENEMIES: 1,
        RESPAWN_DELAY: 10,
        RESPAWN_POSITION: { x: 100, y: 100 }
    };
    const ASSETS = {
        player_idle: ['./webp/I.webp', './webp/I1.webp', './webp/I2.webp', './webp/I3.webp', './webp/I4.webp', './webp/I5.webp', './webp/I6.webp'],
        player_walk: [
            './webp/1.webp', './webp/2.webp', './webp/3.webp', './webp/4.webp',
            './webp/5.webp', './webp/6.webp', './webp/7.webp', './webp/8.webp',
            './webp/9.webp', './webp/10.webp', './webp/11.webp', './webp/12.webp',
            './webp/13.webp', './webp/14.webp', './webp/15.webp'
        ],
        // Localize o objeto ASSETS e adicione esta linha:
        player_run_shoot: [
            './webp/1c.webp', './webp/2c.webp', './webp/3c.webp', './webp/4c.webp',
            './webp/5c.webp', './webp/6c.webp', './webp/7c.webp', './webp/8c.webp',
            './webp/9c.webp', './webp/10c.webp', './webp/11c.webp', './webp/12c.webp',
            './webp/13c.webp', './webp/14c.webp', './webp/15c.webp', './webp/16c.webp'
        ],
        player_jump: ['./webp/p.webp', './webp/p3.webp', './webp/p4.webp', './webp/p9.webp', './webp/p11.webp', './webp/p15.webp', './webp/p16.webp', './webp/p17.webp',],
        player_crouch: ['./webp/b1.webp', './webp/b2.webp', './webp/b3.webp', './webp/b4.webp', './webp/b5.webp', './webp/b6.webp', './webp/b7.webp', './webp/b8.webp', './webp/b9.webp', './webp/b10.webp'],
        shield_normal: ['./webp/down3.png',
        ],
        shield_crack: ['./webp/down3.png'],
        enemy_dead: ['./webp/dinossauro_morto.webp'],
        player_attack_sword: [
            './webp/espada1.webp', './webp/espada2.webp', './webp/espada3.webp'
        ],
        player_attack_bow_charge: ['./webp/chute.webp'],
        player_attack_pistol: ['./webp/a1.webp', './webp/a2.webp', './webp/a3.webp', './webp/a4.webp', './webp/a5.webp', './webp/a6.webp', './webp/a7.webp', './webp/a8.webp', './webp/a9.webp', './webp/a10.webp', './webp/a11.webp', './webp/a12.webp'],
        player_block: ['./webp/defesa.webp'],
        player_special: ['https://i.imgur.com/L127z5k.gif'],
        enemy_walk: ['./webp/d.webp', './webp/d1.webp', './webp/d2.webp', './webp/d3.webp', './webp/d4.webp', './webp/d5.webp', './webp/d6.webp', './webp/d7.webp', './webp/d8.webp', './webp/d9.webp', './webp/d10.webp', './webp/d11.webp', './webp/d12.webp', './webp/d13.webp', './webp/d14.webp',],
        enemy_fly: ['./webp/nave.webp', './webp/nave1.webp', './webp/nave2.webp', './webp/nave3.webp', './webp/nave4.webp', './webp/nave5.webp', './webp/nave6.webp', './webp/nave7.webp', './webp/nave8.webp', './webp/nave9.webp',],
        explosion_gif: './webp/explosao.gif',
        pickup_bow: './webp/pedra.webp',
        pickup_pistol: './webp/tiro.webp',
        projectile_arrow: './webp/pedra.webp',
        projectile_bullet: './webp/tiro.webp',
        icon_sword: './webp/espada.webp',
        icon_bow: './webp/pedra.webp',
        icon_pistol: './webp/tiro.webp',
        projectile_enemy_bullet: './webp/laser.webp',
        boss_barrier: './webp/boss_barrier.webp',
        // Adicione ao seu objeto ASSETS
        // Boss Assets - Certifique-se que esses arquivos existem na pasta webp
        boss_activate: ['./webp/monstro_ativo.webp', './webp/monstro_ativo1.webp', './webp/monstro_ativo2.webp'],
        boss_idle: [
            './webp/mloop.webp', './webp/mloop2.webp', './webp/mloop3.webp', './webp/mloop4.webp',
            './webp/mloop5.webp', './webp/mloop6.webp', './webp/mloop7.webp', './webp/mloop8.webp'
        ],
        boss_attack1: [
            './webp/ataque.webp', './webp/ataque1.webp', './webp/ataque2.webp', './webp/ataque3.webp', './webp/ataque4.webp',
            './webp/ataque5.webp', './webp/ataque6.webp', './webp/ataque7.webp', './webp/ataque8.webp', './webp/ataque9.webp',
            './webp/ataque10.webp', './webp/ataque11.webp', './webp/ataque12.webp', './webp/ataque13.webp', './webp/ataque14.webp', './webp/ataque15.webp', './webp/ataque16.webp'
        ],
        boss_attack2: [
            './webp/ataque01.webp', './webp/ataque02.webp', './webp/ataque03.webp', './webp/ataque04.webp', './webp/ataque05.webp',
            './webp/ataque06.webp', './webp/ataque07.webp', './webp/ataque08.webp', './webp/ataque09.webp'
        ],
        boss_death: [
            './webp/bossdeath(1).webp', './webp/bossdeath(2).webp', './webp/bossdeath(3).webp', './webp/bossdeath(4).webp', './webp/bossdeath(5).webp',
            './webp/bossdeath(6).webp', './webp/bossdeath(7).webp', './webp/bossdeath(8).webp', './webp/bossdeath(9).webp', './webp/bossdeath(10).webp',
            './webp/bossdeath(11).webp', './webp/bossdeath(12).webp', './webp/bossdeath(13).webp', './webp/bossdeath(14).webp', './webp/bossdeath(15).webp',
            './webp/bossdeath(16).webp', './webp/bossdeath(17).webp', './webp/bossdeath(18).webp', './webp/bossdeath(19).webp', './webp/bossdeath(20).webp',
            './webp/bossdeath(21).webp', './webp/bossdeath (22).webp', './webp/bossdeath(23).webp', './webp/bossdeath(24).webp', './webp/bossdeath(25).webp',
            './webp/bossdeath(26).webp', './webp/bossdeath(27).webp', './webp/bossdeath(28).webp', './webp/bossdeath(29).webp', './webp/bossdeath(30).webp',
            './webp/bossdeath(31).webp', './webp/bossdeath(32).webp', './webp/bossdeath(33).webp'
        ],
        boss_falling_item: ['./webp/bebe6.webp'],
        novo_inimigo_vinda: ['./webp/bebe6.webp'], // Sprite dele caindo
        novo_inimigo_correndo: [
            './webp/bebe.webp',
            './webp/bebe1.webp',
            './webp/bebe2.webp',
            './webp/bebe3.webp',
            './webp/bebe4.webp',
            './webp/bebe5.webp',
        ], // Sprites dele correndo

        pickup_points: './webp/coin.webp',
        pit_image: './webp/espinhos.webp',

        // Adicione os extras aqui para garantir que nada trave
        extras: [
            './webp/16.webp', './webp/chao01.webp', './webp/chao02.webp',
            './webp/arvore.webp', './webp/nature.webp', './webp/nuvens.webp',
            './webp/nuvenss.webp', './webp/heart.webp', './webp/I.webp',
            './webp/p1.webp', './webp/p2.webp', './webp/p3.webp', './webp/p5.webp', './webp/p6.webp', './webp/p7.webp', './webp/p9.webp', './webp/p10.webp', './webp/p11.webp',
            './webp/P13.webp', './webp/P14.webp', './webp/P15.webp', './webp/P17.webp',
        ]
    };
    const WEAPONS = {
        sword: {
            name: 'Espada',
            type: 'melee',
            damage: 2,
            cooldown: 150,
            animation: ASSETS.player_attack_sword,
            icon: ASSETS.icon_sword,
        },
        bow: {
            name: 'Arco',
            type: 'ranged',
            damage: 2,
            cooldown: 200,
            chargeAnimation: ASSETS.player_attack_bow_charge,
            maxChargeTime: 1500,
            icon: ASSETS.icon_bow,
            projectileType: 'arrow',
        },
        pistol: {
            name: 'Pistola',
            type: 'ranged',
            damage: 3,
            cooldown: 200,
            animation: ASSETS.player_attack_pistol,
            icon: ASSETS.icon_pistol,
            projectileType: 'bullet',
        }
    };
    const LEVEL_DATA = {
        platforms: [
            { x: 200, y: 100, width: 100, height: 20 },
            { x: 1000, y: 120, width: 100, height: 20 },
            { x: 4110, y: 160, width: 30, height: 1 },
        ],
        items: [
            { type: 'bow', x: 1000, y: 0 }
        ],
        pits: [
            // { x: posição X, y: posição Y, width: largura, height: altura }
            { x: 500, y: 0, width: 100, height: 100, image: './webp/espinhos.webp' },
            { x: 1200, y: 0, width: 100, height: 100, image: './webp/espinhos.webp' },
            { x: 1300, y: 0, width: 100, height: 100, image: './webp/espinhos.webp' },
            { x: 1400, y: 0, width: 100, height: 100, image: './webp/espinhos.webp' },
        ]
    };
    function checkCollision(r1, r2) {
        if (!r1 || !r2) return false;
        return r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y;
    }
    function checkCollisionRect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }
    class StateMachine {
        constructor() {
            this.states = {};
            this.currentState = null;
        }
        addState(name, config) {
            this.states[name] = config;
        }
        setState(name) {
            if (this.currentState?.name === name) return;
            this.currentState?.config.exit?.();
            const newState = this.states[name];
            if (!newState) return;
            this.currentState = { name: name, config: newState };
            newState.enter?.();
        }
        update(deltaTime, controls) {
            this.currentState?.config.update?.(deltaTime, controls);
        }
    }
    class UI {
        constructor() {
            this.game = null; // Será conectado pela classe Game

            // 1. Esconde a vida antiga se existir
            this.healthContainer = document.querySelector('.health-container');
            if (this.healthContainer) this.healthContainer.style.display = 'none';

            // 2. Elementos da Barra Especial e Armas
            this.specialBar = document.querySelector('.special-bar');
            this.specialContainer = document.querySelector('.special-container');
            this.specialBtn = document.getElementById('btn-special');
            this.weaponSlotsContainer = document.getElementById('weapon-slots-container');

            // 3. Remove displays antigos para limpar a tela
            const oldPoints = document.querySelector('.custom-ui-left');
            if (oldPoints) oldPoints.remove();

            // 4. Cria o Container Principal do Canto Esquerdo
            this.createLeftUI();

            // 5. Inicializa variáveis
            this.currentPoints = 0;
            
            // PROTEÇÃO CONTRA TRAVAMENTO: Garante que o valor seja maior que 0
            this.pointsPerHeart = (typeof CONFIG !== 'undefined' && CONFIG.POINTS_FOR_EXTRA_HEART > 0) 
                                  ? CONFIG.POINTS_FOR_EXTRA_HEART 
                                  : 1000;
            this.pointsForNextHeart = this.pointsPerHeart;

            this.specialSegments = [];
            this.initSpecialSegments();
        }

        createLeftUI() {
            // Container que agrupa Vidas e Pontos
            this.leftContainer = document.createElement('div');
            this.leftContainer.className = 'custom-ui-left';
            this.leftContainer.style.cssText = `
                position: fixed;
                top: 80px; /* Logo abaixo da barra de sangue */
                left: 20px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                z-index: 999;
                pointer-events: none; /* Deixa clicar através */
            `;

            // -- Container das Vidas (Corações) --
            this.livesContainer = document.createElement('div');
            this.livesContainer.id = 'ui-lives';
            this.livesContainer.style.cssText = `
                display: flex;
                gap: 5px;
                margin-bottom: 5px;
            `;

            // -- Container dos Pontos --
            this.pointsContainer = document.createElement('div');
            this.pointsContainer.id = 'ui-points';
            this.pointsContainer.style.cssText = `
                font-family: 'Arial', sans-serif;
                font-size: 18px;
                color: #FFD700;
                font-weight: bold;
                text-shadow: 2px 2px 0 #000;
                background: rgba(0, 0, 0, 0.5);
                padding: 4px 8px;
                border-radius: 4px;
                border-left: 3px solid #FFD700;
                display: inline-block;
                width: fit-content;
            `;
            this.pointsContainer.textContent = "0 pts";

            // Adiciona ao DOM
            this.leftContainer.appendChild(this.livesContainer);
            this.leftContainer.appendChild(this.pointsContainer);
            document.body.appendChild(this.leftContainer);
        }

        // --- Gerenciamento de Vidas ---
        updateLives(lives) {
            if (!this.livesContainer) return;
            
            this.livesContainer.innerHTML = ''; // Limpa corações antigos
            
            // Cria os corações baseado no número de vidas
            for (let i = 0; i < lives; i++) {
                const heart = document.createElement('img');
                // Certifique-se que o arquivo existe na pasta webp
                heart.src = './webp/heart.webp'; 
                heart.style.cssText = `
                    width: 25px;
                    height: 25px;
                    object-fit: contain;
                    filter: drop-shadow(1px 1px 2px black);
                    animation: pulseHeart 1.5s infinite alternate;
                `;
                // Adiciona uma animação suave CSS se não existir
                if (!document.getElementById('anim-style-heart')) {
                    const style = document.createElement('style');
                    style.id = 'anim-style-heart';
                    style.innerHTML = `@keyframes pulseHeart { from { transform: scale(1); } to { transform: scale(1.1); } }`;
                    document.head.appendChild(style);
                }
                
                this.livesContainer.appendChild(heart);
            }
        }

        // --- Gerenciamento de Pontos ---
        updatePointsDisplay() {
            if (this.pointsContainer) {
                this.pointsContainer.innerHTML = `🪙 ${this.currentPoints.toLocaleString()}`;
            }
        }

        addPoints(points) {
            this.currentPoints += points;
            
            // Loop seguro para evitar travamento
            // Verifica se pointsPerHeart é válido (>0)
            if (this.pointsPerHeart > 0) {
                while (this.currentPoints >= this.pointsForNextHeart) {
                    this.earnExtraHeart();
                    this.pointsForNextHeart += this.pointsPerHeart;
                    
                    // SEGURANÇA EXTRA: Se por algum motivo loopar demais, para.
                    if (this.pointsForNextHeart > this.currentPoints + 100000) break;
                }
            }
            
            this.updatePointsDisplay();
        }

        earnExtraHeart() {
            // Apenas cura o jogador (barra de sangue)
            if (this.game && this.game.player) {
                this.game.player.health = Math.min(this.game.player.health + 1, CONFIG.PLAYER_HEALTH);
                this.game.updateBloodHealthBar();
                this.showFeedback('+ Vida!');
            }
        }

        showFeedback(text) {
            const feedback = document.createElement('div');
            feedback.textContent = text;
            feedback.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 32px;
                color: #00ff00;
                font-weight: bold;
                text-shadow: 0 0 5px #000;
                z-index: 1000;
                animation: floatUp 1s ease-out forwards;
                pointer-events: none;
            `;
            
            // Adiciona animação CSS se não existir
            if (!document.getElementById('anim-float')) {
                const style = document.createElement('style');
                style.id = 'anim-float';
                style.innerHTML = `@keyframes floatUp { 0% { opacity: 1; transform: translate(-50%, -50%); } 100% { opacity: 0; transform: translate(-50%, -150%); } }`;
                document.head.appendChild(style);
            }

            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1000);
        }

        // --- Métodos Mantidos (Especial e Armas) ---
        initSpecialSegments() {
            if (!this.specialBar) return;
            this.specialBar.innerHTML = '';
            // Proteção se CONFIG não estiver carregado
            const maxSegments = (typeof CONFIG !== 'undefined') ? CONFIG.SPECIAL_CHARGE_MAX : 6;
            
            for (let i = 0; i < maxSegments; i++) {
                const segment = document.createElement('div');
                segment.className = 'special-segment';
                this.specialBar.appendChild(segment);
                this.specialSegments.push(segment);
            }
        }

        updateSpecial(currentCharge) {
            const maxSegments = (typeof CONFIG !== 'undefined') ? CONFIG.SPECIAL_CHARGE_MAX : 6;
            this.specialSegments.forEach((segment, i) => {
                segment.classList.toggle('charged', i < currentCharge);
            });
            const isReady = currentCharge >= maxSegments;
            if (this.specialContainer) this.specialContainer.classList.toggle('ready', isReady);
            if (this.specialBtn) this.specialBtn.classList.toggle('ready', isReady);
        }

        updateHealth(currentHealth) {
            // Vazio intencionalmente (controlado pela barra de sangue)
        }

        updateWeapons(player) {
            if (!this.weaponSlotsContainer) return;
            this.weaponSlotsContainer.innerHTML = '';
            Object.keys(WEAPONS).forEach(weaponKey => {
                if (player.weapons.includes(weaponKey)) {
                    const weaponData = WEAPONS[weaponKey];
                    const slot = document.createElement('div');
                    slot.className = 'weapon-slot';
                    slot.style.backgroundImage = `url('${weaponData.icon}')`;
                    slot.dataset.weapon = weaponKey;

                    if (player.equippedWeapon === weaponKey) {
                        slot.classList.add('selected');
                    }
                    // Usa arrow function para manter o contexto
                    const handleEquip = (e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault(); // Evita clique duplo mobile
                        player.equipWeapon(weaponKey);
                    };
                    slot.addEventListener('click', handleEquip);
                    slot.addEventListener('touchstart', handleEquip, {passive: false});
                    this.weaponSlotsContainer.appendChild(slot);
                }
            });
        }
    }


    class Entity {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.velocityX = 0;
            this.velocityY = 0;
            this.direction = 1;
            this.isGrounded = false;
            this.isMarkedForDeletion = false;
            this.isParalyzed = false;
            this.isBeingKnockedBack = false;
            this.element = document.createElement('div');
            this.element.style.width = `${width}px`;
            this.element.style.height = `${height}px`;
            this.stateMachine = new StateMachine();
            this.animations = {};
            this.currentAnimation = null;
            this.frame = 0;
            this.frameTimer = 0;
            this.frameDuration = 100;
        }
        updatePhysics(deltaTime, platforms) {
            if (!this.isBeingKnockedBack) {
                this.x += this.velocityX;
            }
            this.checkGrounded(platforms);
            if (!this.isGrounded) {
                this.velocityY -= CONFIG.GRAVITY;
            }
            this.y += this.velocityY;
            this.handlePlatformCollisions(platforms);
        }
        checkGrounded(platforms) {
            this.isGrounded = false;
            if (this.y <= 0 && this.velocityY <= 0) {
                this.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
                this.isBeingKnockedBack = false;
                return;
            }
            for (const platform of platforms) {
                const groundCheckHitbox = {
                    x: this.x + this.width * 0.2,
                    y: this.y - 10, // Check deeper (10px) to catch the platform
                    width: this.width * 0.6,
                    height: 10
                };
                if (checkCollision(groundCheckHitbox, platform)) {
                    // Se estamos caindo ou parados, e estamos "acima" da plataforma (com tolerância)
                    const platformTop = platform.y + platform.height;
                    if (this.velocityY <= 0 && Math.abs(this.y - platformTop) <= 15) {
                        this.y = platformTop;
                        this.velocityY = 0;
                        this.isGrounded = true;
                        this.isBeingKnockedBack = false;
                        return;
                    }
                }
            }
        }
        handlePlatformCollisions(platforms) {
            if (this.y < 0) {
                this.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
            for (const platform of platforms) {
                if (this.velocityY <= 0 &&
                    this.x + this.width > platform.x &&
                    this.x < platform.x + platform.width &&
                    this.y < platform.y + platform.height &&
                    this.y + this.height > platform.y + platform.height) {
                    if ((this.y - this.velocityY * (1 / 60)) >= platform.y + platform.height) {
                        this.y = platform.y + platform.height;
                        this.velocityY = 0;
                        this.isGrounded = true;
                        return;
                    }
                }
            }
        }
        update(deltaTime, platforms) {
            if (this.isParalyzed) {
                this.stateMachine.update(deltaTime);
                return;
            }
            this.updatePhysics(deltaTime, platforms);
            this.frameTimer += deltaTime;
            if (this.frameTimer > this.frameDuration) {
                this.frameTimer = 0;
                const anim = this.currentAnimation;
                if (anim?.length > 1) {
                    this.frame = (this.frame + 1) % anim.length;
                    this.element.style.backgroundImage = `url('${anim[this.frame]}')`;
                }
            }
        }
        draw() {
            this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-this.y)}px) scaleX(${this.direction})`;
            this.element.style.setProperty('--direction', this.direction);
            this.element.style.setProperty('--translateX', `${Math.round(this.x)}px`);
            this.element.style.setProperty('--translateY', `${Math.round(-this.y)}px`);
        }
        setAnimation(animationFrames, duration = 100, loop = true) {
            if (this.currentAnimation === animationFrames) return;
            if (!animationFrames || animationFrames.length === 0) return;
            this.currentAnimation = animationFrames;
            this.frame = 0;
            this.frameDuration = duration;
            this.loopAnimation = loop;
            this.element.style.backgroundImage = `url('${animationFrames[0]}')`;
        }
        getHitbox() {
            const isCrouching = this.isCrouching || this.stateMachine.currentState?.name === 'crouching';
            let targetWidth, targetHeight, targetY;
            if (isCrouching) {
                // Valores quando abaixado
                targetWidth = this.width * 0.1;
                targetHeight = this.height * 0.2;
                targetY = this.y + (this.height * 0.1);
            } else {
                targetWidth = this.width * 0.1;
                targetHeight = this.height * 0.3;
                targetY = this.y + (this.height * 0.1);
            }
            if (!this.lastHitbox) this.lastHitbox = { width: targetWidth, height: targetHeight, y: targetY };
            const lerp = (start, end, factor = 0.2) => start + (end - start) * factor;
            const currentWidth = lerp(this.lastHitbox.width, targetWidth, 0.3);
            const currentHeight = lerp(this.lastHitbox.height, targetHeight, 0.3);
            const currentY = lerp(this.lastHitbox.y, targetY, 0.3);
            this.lastHitbox = { width: currentWidth, height: currentHeight, y: currentY };
            const hitboxX = this.x + (this.width - currentWidth) / 2;
            return {
                x: hitboxX,
                y: currentY,
                width: currentWidth,
                height: currentHeight
            };
        }
        destroy(game) {
            if (game) game.addSpecialCharge(1);
            this.isMarkedForDeletion = true;
            if (this.element.parentElement) {
                this.element.remove();
            }
        }
    }
    class Player extends Entity {
        constructor(x, y, game) {
            super(x, y, 200, 180);
            this.game = game;
            this.element.className = 'character';
            this.health = CONFIG.PLAYER_HEALTH;
            this.isInvulnerable = false;
            this.isAttacking = false;
            this.enemiesHitInCurrentAttack = new Set();
            this.isBlocking = false;
            this.isMoving = false;
            this.trailTimeout = null;

            this.shieldMaxHealth = 100;
            this.shieldHealth = 100;
            this.isShieldBroken = false;
            this.shieldRegenRate = 0.5;
            this.shieldDrainRate = 0.5;

            this.weapons = ['pistol'];
            this.equippedWeapon = 'pistol';
            this.chargePower = 0;

            // Physics & Feel
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.lastGroundedTime = 0;
            this.isJumping = false;

            this.animations = {
                idle: ASSETS.player_idle,
                walk: ASSETS.player_walk,
                jump: ASSETS.player_jump,
                crouch: ASSETS.player_crouch,
                block: ASSETS.player_block,
                special: ASSETS.player_special,
                attack_sword: ASSETS.player_attack_sword,
                attack_pistol: ASSETS.player_attack_pistol,
                bow_charge: ASSETS.player_attack_bow_charge,
            };

            this.initStates();
            this.stateMachine.setState('idle');
        }
        initStates() {
            this.stateMachine.addState('idle', {
                enter: () => this.setAnimation(this.animations.idle, 250),
                update: (dt, ctr) => {
                    if (!this.isGrounded) {
                        this.stateMachine.setState('jumping');
                    } else if (Math.abs(this.velocityX) > 0.1) {
                        this.stateMachine.setState('walking');
                    } else if (ctr.attackDown) {
                        this.stateMachine.setState('attacking');
                    } else if ((ctr.block || ctr.crouch) && !this.isShieldBroken) {
                        this.stateMachine.setState('blocking');
                    } else if (ctr.crouch || ctr.analogDown) {
                        this.stateMachine.setState('crouching');
                    }
                },
                exit: () => {
                    this.element.classList.remove('shield-active', 'shield-weak', 'shield-broken');
                    this.element.style.filter = '';
                    this.element.style.boxShadow = '';
                }
            });
            this.stateMachine.addState('crouching', {
                enter: () => {
                    this.isCrouching = true;
                    this.velocityX = 0;
                    this.setAnimation(this.animations.crouch, 200);
                    this.element.style.height = `${this.height * 0.7}px`;
                },
                update: (dt, ctr) => {
                    if (!ctr.crouch && !ctr.analogDown) {
                        this.stateMachine.setState('idle');
                    }
                    if (this.isBlocking && !this.isShieldBroken) {
                        this.shieldHealth -= this.shieldDrainRate;
                        if (this.shieldHealth <= 0) {
                            this.shieldHealth = 0;
                            this.isShieldBroken = true;
                            this.stateMachine.setState('idle');
                            setTimeout(() => { this.isShieldBroken = false; }, 3000);
                        }
                    } else {
                        if (this.shieldHealth < this.shieldMaxHealth) {
                            this.shieldHealth += this.shieldRegenRate;
                        }
                    }
                },
                exit: () => {
                    this.isCrouching = false;
                    this.element.style.height = `${this.height}px`;
                }
            });
            this.stateMachine.addState('walking', {
                enter: () => this.setAnimation(this.animations.walk, 100),
                update: (dt, ctr) => {
                    if (!this.isGrounded) {
                        this.stateMachine.setState('jumping');
                    } else if (Math.abs(this.velocityX) < 0.1) {
                        this.stateMachine.setState('idle');
                    } else if (ctr.attackDown) {
                        this.stateMachine.setState('attacking');
                    } else if ((ctr.block || ctr.crouch) && !this.isShieldBroken) {
                        this.stateMachine.setState('blocking');
                    } else if (ctr.crouch || ctr.analogDown) {
                        this.stateMachine.setState('crouching');
                    }
                },
                exit: () => {
                    this.element.classList.remove('shield-active', 'shield-weak', 'shield-broken');
                    this.element.style.filter = '';
                    this.element.style.boxShadow = '';
                }
            });

            this.stateMachine.addState('jumping', {
                enter: () => this.setAnimation(this.animations.jump, 150),
                update: (dt, ctr) => {
                    if (this.isGrounded) {
                        this.stateMachine.setState(Math.abs(this.velocityX) > 0.1 ? 'walking' : 'idle');
                    } else if (ctr.attackDown) {
                        this.stateMachine.setState('attacking');
                    }
                },
                exit: () => {
                    this.element.classList.remove('shield-active', 'shield-weak', 'shield-broken');
                    this.element.style.filter = '';
                    this.element.style.boxShadow = '';
                }
            });
            this.stateMachine.addState('attacking', {
                enter: () => {
                    const weapon = WEAPONS[this.equippedWeapon];
                    this.enemiesHitInCurrentAttack.clear();
                    if (weapon.chargeAnimation) {
                        this.stateMachine.setState('bow_charge');
                    } else {
                        this.isAttacking = true;
                        this.setAnimation(weapon.animation, weapon.cooldown / (weapon.animation.length || 1));
                        if (weapon.type === 'ranged') {
                            this.game.spawnPlayerProjectile(1.0);
                        }
                        this.lastShotTime = performance.now();
                    }
                },
                update: (deltaTime, controls) => {
                    const weapon = WEAPONS[this.equippedWeapon];
                    if (weapon.name === 'Pistola') {
                        if (Math.abs(this.velocityX) > 0.5 && this.isGrounded) {
                            this.setAnimation(ASSETS.player_run_shoot, 60); // Ajuste a velocidade (60ms) conforme necessário
                        } else if (this.isGrounded) {
                            this.setAnimation(weapon.animation, 100);
                        }
                    }
                    if (!controls.attack) {
                        this.isAttacking = false;
                        if (this.isGrounded) {
                            this.stateMachine.setState(Math.abs(this.velocityX) > 0.1 ? 'walking' : 'idle');
                        } else {
                            this.stateMachine.setState('jumping');
                        }
                        return;
                    }
                    if (weapon.type === 'ranged' && !weapon.chargeAnimation) {
                        const currentTime = performance.now();
                        if (currentTime - this.lastShotTime >= weapon.cooldown) {
                            this.game.spawnPlayerProjectile(1.0);
                            this.lastShotTime = currentTime;
                        }
                    }
                },
                exit: () => {
                    this.isAttacking = false;
                    this.lastShotTime = 0;
                }
            });
            this.stateMachine.addState('bow_charge', {
                enter: () => {
                    this.isAttacking = true;
                    this.velocityX *= 0.1;
                    this.chargeStartTime = performance.now();
                    this.setAnimation(this.animations.bow_charge, 1000);
                },
                update: (deltaTime, controls) => {
                    const chargeDuration = performance.now() - this.chargeStartTime;
                    this.chargePower = Math.min(chargeDuration / WEAPONS.bow.maxChargeTime, 1.0);
                    const chargeFrames = this.animations.bow_charge;
                    const frameIndex = Math.min(Math.floor(this.chargePower * chargeFrames.length), chargeFrames.length - 1);
                    if (this.frame !== frameIndex) {
                        this.frame = frameIndex;
                        this.element.style.backgroundImage = `url('${chargeFrames[this.frame]}')`;
                    }
                    if (controls.attackUp) {
                        this.game.spawnPlayerProjectile(this.chargePower);
                        this.isAttacking = false;
                        setTimeout(() => {
                            if (this.isGrounded) {
                                this.stateMachine.setState(Math.abs(this.velocityX) > 0.1 ? 'walking' : 'idle');
                            } else {
                                this.stateMachine.setState('jumping');
                            }
                        }, WEAPONS.bow.cooldown);
                    }
                },
                exit: () => {
                    this.isAttacking = false;
                    this.chargePower = 0;
                }
            });
            this.stateMachine.addState('blocking', {
                enter: () => {
                    this.isBlocking = true;
                    const shieldFrames = this.shieldHealth < (this.shieldMaxHealth * 0.3)
                        ? ASSETS.shield_crack
                        : ASSETS.shield_normal;
                    this.setAnimation(shieldFrames, 100);
                    this.element.classList.add('shield-active');
                },
                update: (dt, ctr) => {
                    if (!this.isShieldBroken) {
                        this.shieldHealth -= this.shieldDrainRate;

                        const shouldBeCracked = this.shieldHealth < (this.shieldMaxHealth * 0.3);
                        const isCurrentlyCracked = this.currentAnimation === ASSETS.shield_crack;
                        if (shouldBeCracked && !isCurrentlyCracked) {
                            this.setAnimation(ASSETS.shield_crack, 100);
                            this.element.classList.add('shield-weak');
                            this.element.classList.remove('shield-active');
                        } else if (!shouldBeCracked && isCurrentlyCracked && this.shieldHealth > 30) {
                            this.setAnimation(ASSETS.shield_normal, 100);
                            this.element.classList.remove('shield-weak');
                            this.element.classList.add('shield-active');
                        }
                        if (this.shieldHealth <= 0) {
                            this.shieldHealth = 0;
                            this.isShieldBroken = true;
                            this.element.classList.add('shield-broken');
                            this.element.classList.remove('shield-active', 'shield-weak');
                            setTimeout(() => {
                                if (this.stateMachine.currentState?.name === 'blocking') {
                                    this.stateMachine.setState('idle');
                                }
                            }, 500);
                            setTimeout(() => {
                                this.isShieldBroken = false;
                                this.shieldHealth = 20;
                            }, 3000);
                        }
                    }
                    const blockInput = (ctr.block || ctr.crouch) && !this.isShieldBroken;
                    if (!blockInput || !this.isGrounded) {
                        this.stateMachine.setState('idle');
                    }
                },
                exit: () => {
                    this.isBlocking = false;
                    this.element.classList.remove('shield-active', 'shield-weak', 'shield-broken');
                    this.element.style.filter = '';
                    this.element.style.boxShadow = '';
                    this.currentAnimation = null;
                }
            });
            this.stateMachine.addState('special', {
                enter: () => {
                    this.isAttacking = true;
                    this.velocityX = 0;
                    this.setAnimation(this.animations.special, 100);
                    this.element.classList.add('special-active');
                    setTimeout(() => {
                        this.isAttacking = false;
                        if (this.isGrounded) {
                            this.stateMachine.setState(Math.abs(this.velocityX) > 0.1 ? 'walking' : 'idle');
                        } else {
                            this.stateMachine.setState('jumping');
                        }
                        this.element.classList.remove('special-active');
                    }, 400);
                }
            });
        }
        update(deltaTime, controls, platforms) {
            if (this.isCrouching === undefined) {
                this.isCrouching = false;
            }
            if (!this.isBlocking && !this.isShieldBroken) {
                this.shieldHealth = Math.min(
                    this.shieldHealth + (this.shieldRegenRate * (deltaTime / 16)),
                    this.shieldMaxHealth
                );
            }
            if (this.stateMachine.currentState?.name === 'walking') {
                const speedFactor = Math.abs(this.velocityX) / CONFIG.PLAYER_SPEED;
                const baseDuration = 60;
                const adjustedDuration = baseDuration / Math.max(speedFactor, 0.5);
                if (Math.abs(this.frameDuration - adjustedDuration) > 10) {
                    this.frameDuration = adjustedDuration;
                }
            }
            const isRangedAttacking = this.stateMachine.currentState?.name === 'attacking' && WEAPONS[this.equippedWeapon].type === 'ranged';
            const canControlMovement = (!this.isAttacking || isRangedAttacking) && !this.isBlocking && !this.isCrouching;
            if (canControlMovement) {
                // Aceleração
                if (controls.x !== 0) {
                    this.velocityX += controls.x * CONFIG.PLAYER_ACCELERATION;
                    this.direction = Math.sign(controls.x);
                } else {
                    // Atrito no chão
                    if (this.isGrounded) {
                        this.velocityX *= CONFIG.PLAYER_FRICTION;
                    } else {
                        this.velocityX *= CONFIG.PLAYER_AIR_RESISTANCE;
                    }
                }
                this.velocityX = Math.max(Math.min(this.velocityX, CONFIG.PLAYER_SPEED), -CONFIG.PLAYER_SPEED);
                if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
            } else {
                if (!this.isBeingKnockedBack) {
                    if (this.isGrounded) {
                        this.velocityX *= CONFIG.PLAYER_FRICTION;
                    } else {
                        this.velocityX *= CONFIG.PLAYER_AIR_RESISTANCE;
                    }
                }
            }
            this.isMoving = Math.abs(this.velocityX) > 0.1;
            if (Math.abs(this.velocityX) > 5 && this.isGrounded && !this.isAttacking) {
                if (this.trailTimeout) clearTimeout(this.trailTimeout);
                this.trailTimeout = setTimeout(() => {
                }, 100);
            } else if (Math.abs(this.velocityX) <= 5) {
            }
            if (controls.jump) {
                this.jumpBufferTimer = CONFIG.JUMP_BUFFER;
            }
            if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= deltaTime;
            if (this.isGrounded) {
                this.coyoteTimer = CONFIG.COYOTE_TIME;
            } else {
                if (this.coyoteTimer > 0) this.coyoteTimer -= deltaTime;
            } 0
            if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && canControlMovement && !this.isCrouching && !this.isAttacking) {
                this.jump();
                this.stateMachine.setState('jumping');
                this.jumpBufferTimer = 0; 
                this.coyoteTimer = 0;
            }
            if (!controls.jump && this.velocityY > 0 && this.isJumping) {
                this.velocityY *= CONFIG.PLAYER_JUMP_CUT;
                this.isJumping = false; 
            }
            if (controls.special && canControlMovement) {
                this.special();
            }
            if (this.isGrounded && (controls.crouch || controls.analogDown) && !this.isAttacking) {
                if (this.stateMachine.currentState?.name !== 'crouching') {
                    this.stateMachine.setState('crouching');
                }
            }
            super.update(deltaTime, platforms);
            this.stateMachine.update(deltaTime, controls);
            this.isAttacking = ['attacking', 'bow_charge', 'special'].includes(this.stateMachine.currentState?.name);
            this.isCrouching = this.stateMachine.currentState?.name === 'crouching';
            this.isBlocking = this.stateMachine.currentState?.name === 'blocking';
        }
        collectWeapon(weaponKey) {
            if (!this.weapons.includes(weaponKey)) {
                this.weapons.push(weaponKey);
                this.equipWeapon(weaponKey);
            }
        }
        equipWeapon(weaponKey) {
            if (this.weapons.includes(weaponKey)) {
                this.equippedWeapon = weaponKey;
                this.game.ui.updateWeapons(this);
            }
        }
        jump() {
            this.isGrounded = false;
            this.velocityY = CONFIG.PLAYER_JUMP_FORCE;
            this.isJumping = true;
        }
        special() {
            if (this.game.specialCharge >= CONFIG.SPECIAL_CHARGE_MAX) {
                this.game.activateSpecial();
                this.stateMachine.setState('special');
            }
        }
    // DENTRO DA CLASS PLAYER
    takeDamage(amount) {
        if (this.isInvulnerable || this.isBlocking) return false;
        
        // 1. Primeiro subtrai o dano
        this.health -= amount;
        
        // 2. Verifica se morreu e CLAMPA (trava) em 0 imediatamente
        if (this.health <= 0) {
            this.health = 0;
        }

        // 3. AGORA atualiza a barra (com o valor 0 garantido acima)
        this.game.updateBloodHealthBar();
        
        // 4. Atualiza lógica antiga da UI (se ainda estiver usando)
        this.game.ui.updateHealth(this.health);
        
        // Efeitos visuais de dano
        this.isInvulnerable = true;
        this.element.classList.add('invulnerable');
        const dmgEffect = document.querySelector('.damage-effect');
        if(dmgEffect) dmgEffect.classList.add('active');
        
        setTimeout(() => {
            this.isInvulnerable = false;
            this.element.classList.remove('invulnerable');
        }, CONFIG.INVULNERABILITY_DURATION);
        
        setTimeout(() => {
            if(dmgEffect) dmgEffect.classList.remove('active');
        }, 100);
        
        // 5. Se a vida for 0, executa a perda de vida (corações/respawn)
        if (this.health === 0) {
            this.game.loseLife();
        }
        
        return true;
    }

        getAttackHitbox() {
            const weapon = WEAPONS[this.equippedWeapon];
            if (!this.isAttacking || weapon.type !== 'melee' || this.stateMachine.currentState.name === 'bow_charge') {
                return null;
            }
            const hitboxWidth = this.width * 0.4;
            const hitboxHeight = this.height * 0.1;
            let xOffset = this.direction === 1 ? this.width * 0.5 : -hitboxWidth + this.width * 0.5;
            const x = this.x + xOffset;
            const y = this.y + (this.height - hitboxHeight) / 4;
            return {
                x: x,
                y: y,
                width: hitboxWidth,
                height: hitboxHeight
            };
        }
        getDefenseHitbox() {
            if (!this.isBlocking) return null;
            const hitboxWidth = 30;
            const hitboxHeight = this.height * 1;
            const xOffset = this.direction === 1 ? this.width * 0.8 : this.width * 0.2 - hitboxWidth;
            const x = this.x + xOffset;
            const y = this.y + (this.height - hitboxHeight) / 2;
            return {
                x: x,
                y: y,
                width: hitboxWidth,
                height: hitboxHeight
            };
        }
    }
   class Projectile extends Entity {
        constructor(x, y, type, direction, chargePower = 1.0, damage = 1) {
            let asset, width, height, velX, velY, usesGravity;
            let customClass = '';

            // --- Lógica para Flecha ---
            if (type === 'arrow') {
                asset = ASSETS.projectile_arrow;
                width = 35;
                height = 35;
                usesGravity = true;
                const minSpeed = 7;
                const maxSpeed = 22;
                const speed = minSpeed + (maxSpeed - minSpeed) * chargePower;
                const initialAngle = 4 - (3 * chargePower);
                velX = speed * direction;
                velY = initialAngle;
            
            // --- Lógica para o Tiro da Nave (CORRIGIDO) ---
           } else if (type === 'enemy_bullet') {
                asset = ASSETS.projectile_enemy_bullet || ASSETS.projectile_bullet;
                width = 140; 
                height = 140;
                
                // ====================================================
                // CORREÇÃO DE ALINHAMENTO X E Y
                // ====================================================
                
                // 1. Centraliza no eixo X: Recua metade da largura (100px)
                x = x - (width / 5); 

                // 2. Ajusta no eixo Y: Desce um pouco para não sair do teto da nave
                // (Como a nave tem altura 80, +40 faz sair do meio dela)
                y = y + -50; 

                // ====================================================

                usesGravity = false; 
                velX = 0;  
                velY = -3; // Ajuste a velocidade aqui (-3 é lento, -8 é rápido)
                
                customClass = 'enemy-laser';
            // --- Lógica para Bala do Jogador ---
            } else {
                asset = ASSETS.projectile_bullet;
                width = 95;
                height = 95;
                usesGravity = false;
                velX = 12 * direction;
                velY = 0;

                
            }

            super(x, y, width, height);
            
            // Configuração do Elemento DOM
            this.element.className = 'projectile ' + customClass;
            this.element.style.backgroundImage = `url('${asset}')`;
            this.element.style.backgroundSize = 'contain';
            this.element.style.backgroundRepeat = 'no-repeat';
           

            this.direction = direction;
            this.velocityX = velX;
            this.velocityY = velY;
            this.usesGravity = usesGravity;
            this.damage = damage;
            this.chargePower = chargePower;
            this.type = type; // Guardar o tipo ajuda no debug

            // Ajuste específico para flecha
            if (type === 'arrow') {
                this.damage = Math.floor(damage * (0.5 + chargePower * 0.5));
                this.element.style.transformOrigin = 'center';
            }
        }

        update(deltaTime, platforms) {
            this.x += this.velocityX;
            
            // Se usa gravidade (como flechas)
            if (this.usesGravity) {
                this.y += this.velocityY;
                this.velocityY -= CONFIG.GRAVITY * 0.8;
                
                const angle = Math.atan2(this.velocityY, this.velocityX * this.direction) * (180 / Math.PI);
                this.element.style.transform = `translateX(${this.x}px) translateY(${-this.y}px) scaleX(${this.direction}) rotate(${angle}deg)`;
            
            // Se NÃO usa gravidade (balas e lasers)
            } else {
                this.y += this.velocityY; // Permite movimento vertical linear (tiro da nave)
                
                // Rotação fixa ou baseada na direção
                let angle = 0;
                if (this.type === 'enemy_bullet') angle = 180; // Aponta pra baixo se necessário
                
                this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-this.y)}px) scaleX(1) rotate(${angle}deg)`;
            }

            // Destruir se sair da tela (limites verticais e horizontais)
            const cameraLeft = -(this.game?.worldX || 0);
            if (this.y < -100 || this.y > CONFIG.GAME_HEIGHT + 200 || 
                this.x < cameraLeft - 1000 || this.x > cameraLeft + CONFIG.GAME_WIDTH + 1000) {
                this.destroy();
            }
        }
        
        // Mantenha os outros métodos (isVisible, draw, getHitbox)...
        isVisible() { /* ... */ }
        draw() { 
             // Se o update já cuida do draw, este método pode ser redundante ou apenas para debug
             // Mas garanta que ele use a lógica correta de Y
             let angle = 0;
             if (this.type === 'arrow') {
                 angle = Math.atan2(this.velocityY, this.velocityX * this.direction) * (180 / Math.PI);
             }
             this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-this.y)}px) scaleX(${this.direction || 1}) rotate(${angle}deg)`;
        }
        getHitbox() {
            // Hitbox ajustada
            return {
                x: this.x + (this.width * 0.25),
                y: this.y + (this.height * 0.25),
                width: this.width * 0.5,
                height: this.height * 0.5
            };
        }
    }
    class PickupItem extends Entity {
        constructor(x, y, weaponKey) {
            super(x, y, 50, 50);
            this.element.className = 'pickup-item';
            this.weaponKey = weaponKey;
            let asset;
            if (weaponKey === 'bow') {
                asset = ASSETS.pickup_bow;
            } else if (weaponKey === 'pistol') {
                asset = ASSETS.pickup_pistol;
            }
            this.element.style.backgroundImage = `url('${asset}')`;
        }
        update() {
        }
    }
    const enemyTypes = {
        grounder: {
            width: 250,
            height: 250,
            health: 12,
            speed: 2.0,
            attackRange: 60,
            animations: {
                walk: ASSETS.enemy_walk,
                idle: [ASSETS.enemy_walk[0]]
            },
            init: function () {
                this.setAnimation(this.animations.walk, 200);
                this.stateMachine.addState('idle', {
                    enter: () => {
                        this.velocityX = 0;
                    }
                });
                this.stateMachine.addState('walking', {
                    enter: () => {
                        this.setAnimation(this.animations.walk, 150);
                    }
                });
                this.stateMachine.setState('walking');
            },
            brain: function () {
                if (this.isParalyzed || this.isBeingKnockedBack) {
                    this.velocityX = 0;
                    return;
                }
                const distX = this.player.x - this.x;
                const distY = Math.abs(this.player.y - this.y);
                if (Math.abs(distX) > 5) {
                    this.direction = Math.sign(distX);
                }
                if (Math.abs(distX) > 400) {
                    this.stateMachine.setState('walking');
                    this.velocityX = this.direction * this.speed * 0.7;
                    return;
                }
                this.stateMachine.setState('walking');
                if (Math.abs(distX) < 20) {
                    this.velocityX = this.direction * (this.speed * 0.2);
                } else if (Math.abs(distX) < 60) {
                    this.velocityX = this.direction * (this.speed * 0.6);
                } else {
                    this.velocityX = this.direction * this.speed;
                }
                if (Math.abs(distX) < 40 && distY < 40 && Math.random() < 0.05) {
                    if (checkCollision(this.getHitbox(), this.player.getHitbox())) {
                        this.player.takeDamage(1);
                    }
                }
                if (this.isGrounded && this.player.y > this.y + 60 && Math.random() < 0.01) {
                    this.velocityY = 12;
                    this.isGrounded = false;
                }
            },
            update: function (deltaTime, platforms) {
                this.updatePhysics(deltaTime, platforms);
                this.brain();
                this.frameTimer += deltaTime;
                if (this.frameTimer > 150 && this.currentAnimation === this.animations.walk) {
                    this.frameTimer = 0;
                    this.frame = (this.frame + 1) % this.animations.walk.length;
                    this.element.style.backgroundImage = `url('${this.animations.walk[this.frame]}')`;
                }
            }
        },
        flyer: {
            width: 80,
            height: 80,
            health: 8,
            speed: 1.8,
            verticalSpeed: 1,
            swoopSpeed: 4.5,
            projectileAttackCooldown: 3000,
            swoopAttackCooldown: 7000,
            animations: { fly: ASSETS.enemy_fly },
            init: function () {
                this.y = 200 + Math.random() * 100;
                this.targetY = this.y;
                this.projectileAttackTimer = Math.random() * this.projectileAttackCooldown;
                this.swoopAttackTimer = Math.random() * this.swoopAttackCooldown;
                this.bobbingTimer = 0;
                this.stateMachine.addState('flying', {
                    enter: () => {
                        this.speed = 1.8;
                        this.targetY = 200 + Math.random() * 100;
                    },
                    update: (dT) => {
                        this.projectileAttackTimer += dT;
                        this.swoopAttackTimer += dT;
                        this.bobbingTimer += dT;
                        const distToPlayerX = Math.abs(this.player.x - this.x);
                        if (this.swoopAttackTimer > this.swoopAttackCooldown && distToPlayerX < 300) {
                            this.stateMachine.setState('swooping');
                            return;
                        }
                        if (this.projectileAttackTimer > this.projectileAttackCooldown && distToPlayerX < 200) {
                            this.game.spawnEnemyProjectile(this.x + (this.width / 2), this.y);
                            this.projectileAttackTimer = 0;
                        }
                        if (this.bobbingTimer > 4000) {
                            this.targetY = 180 + Math.random() * 120;
                            this.bobbingTimer = 0;
                        }
                        const dX = this.player.x - this.x;
                        if (Math.abs(dX) > 150) {
                            this.velocityX = Math.sign(dX) * this.speed;
                            this.direction = Math.sign(dX);
                        } else {
                            this.velocityX = 0;
                        }
                        if (Math.abs(this.y - this.targetY) > 2) {
                            this.velocityY = Math.sign(this.targetY - this.y) * this.verticalSpeed;
                        } else {
                            this.velocityY = 0;
                        }
                    }
                });
                this.stateMachine.addState('swooping', {
                    enter: () => {
                        this.swoopTargetX = this.player.x;
                        this.swoopTargetY = this.player.y + 20;
                        this.speed = this.swoopSpeed;
                        this.swoopAttackTimer = 0;
                    },
                    update: () => {
                        const dX = this.swoopTargetX - this.x;
                        const dY = this.swoopTargetY - this.y;
                        const distance = Math.sqrt(dX * dX + dY * dY);
                        if (distance < 30) {
                            this.stateMachine.setState('flying');
                            return;
                        }
                        this.velocityX = (dX / distance) * this.speed;
                        this.velocityY = (dY / distance) * this.speed;
                        this.direction = Math.sign(this.velocityX);
                    },
                    exit: () => {
                        this.speed = 1.8;
                        this.velocityY = 0;
                    }
                });
                this.stateMachine.setState('flying');
            },
            update: function (dT, platforms) {
                if (this.isParalyzed) {
                    this.velocityX = 0;
                    this.velocityY = 0;
                    return;
                }
                if (this.isBeingKnockedBack) {
                    this.updatePhysics(dT, platforms);
                } else {
                    this.x += this.velocityX;
                    this.y += this.velocityY;
                    if (this.y < 0) this.y = 0;
                }
                this.stateMachine.update(dT);
                this.setAnimation(this.animations.fly, 100);
                this.frameTimer += dT;
                if (this.frameTimer > this.frameDuration) {
                    this.frameTimer = 0;
                    const anim = this.currentAnimation;
                    if (anim && anim.length > 0) {
                        this.frame = (this.frame + 1) % anim.length;
                        this.element.style.backgroundImage = `url('${anim[this.frame]}')`;
                    }
                }
            }
        },
        sky_faller: {
            width: 120, 
            height: 120,
            health: 5,  
            speed: 3.4,
            animations: {
                fall: ASSETS.novo_inimigo_vinda,  
                run: ASSETS.novo_inimigo_correndo 
            },
            init: function () {
                this.state = 'falling';
                this.fallSpeed = 12;
                this.setAnimation(this.animations.fall, 100);
            },
            update: function (deltaTime, platforms) {
                if (this.isParalyzed || this.isBeingKnockedBack) return;
                switch (this.state) {
                    case 'falling':
                        this.y -= this.fallSpeed;
                        if (this.y <= 0) {
                            this.y = 0;
                            this.isGrounded = true;
                            this.state = 'walking';
                            this.setAnimation(this.animations.run, 100); 
                        }
                        break;

                    case 'walking':
                        if (!this.player) return;
                        const playerCenter = this.player.x + (this.player.width / 2);
                        const enemyCenter = this.x + (this.width / 2);
                        const diffX = playerCenter - enemyCenter;
                        this.direction = diffX > 0 ? 1 : -1;
                        if (Math.abs(diffX) > 5) {
                            this.velocityX = this.direction * this.speed;
                        } else {
                            this.velocityX = 0;
                        }
                        this.updatePhysics(deltaTime, platforms);
                        if (checkCollision(this.getHitbox(), this.player.getHitbox())) {
                            this.player.velocityX = this.direction * 12;
                            this.applyKnockback(-this.direction, 8);
                            this.player.takeDamage(1);
                        }
                        break;
                }
                this.frameTimer += deltaTime;
                if (this.frameTimer > this.frameDuration && this.currentAnimation) {
                    this.frameTimer = 0;
                    this.frame = (this.frame + 1) % this.currentAnimation.length;
                    this.element.style.backgroundImage = `url('${this.currentAnimation[this.frame]}')`;
                }
            }
        },
    };
    class Enemy extends Entity {
        constructor(x, y, typeName, player, game) {
            super(x, y, typeName.width, typeName.height);
            this.game = game;
            this.element.className = 'enemy';
            this.player = player;
            Object.assign(this, typeName);
            this.init();
            this.maxHealth = this.health || 12;
            this.currentHealth = this.maxHealth;
            this.totalDamageDisplay = 0;
            this.displayTimeout = null;
            this.displayDuration = 1500;
            this.damageElement = null;
            // this.createHealthBar();
            this.damageContainer = document.createElement('div');
            this.damageContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 50%;
                width: 0;
                height: 0;
                overflow: visible;
                pointer-events: none;
                z-index: 100;
            `;
            this.element.appendChild(this.damageContainer);
            const originalUpdate = this.update;
            this.update = (dt, platforms) => {
                if (originalUpdate) originalUpdate.call(this, dt, platforms);
                if (this.damageContainer) {
                    this.damageContainer.style.transform = `scaleX(${this.direction || 1})`;
                }
            };
        }
        createHealthBar() {
            const oldBar = this.element.querySelector('.enemy-health-bar-container');
            if (oldBar) oldBar.remove();
            this.healthBarContainer = document.createElement('div');
            this.healthBarContainer.className = 'enemy-health-bar-container';
            this.healthBarContainer.style.cssText = `
                position: absolute;
                top: -15px;
                left: 0;
                width: 100%;
                height: 6px;
                background: rgba(0,0,0,0.5);
                border-radius: 3px;
                overflow: hidden;
                z-index: 10;
            `;
            this.healthBar = document.createElement('div');
            this.healthBar.className = 'enemy-health-bar';
            this.healthBar.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(to right, #0f0, #ff0);
                transition: width 0.3s, background 0.3s;
            `;
            this.healthBarContainer.appendChild(this.healthBar);
            this.element.appendChild(this.healthBarContainer);

            this.updateHealthBar();
        }
        takeDamage(amount, source = null) {
            if (this.isParalyzed) {
                amount *= 1.5;
            }
            if (this.displayTimeout) {
                clearTimeout(this.displayTimeout);
            }
            this.totalDamageDisplay += amount;
            this.currentHealth -= amount;
            this.element.style.filter = 'brightness(1.5)';
            setTimeout(() => {
                this.element.style.filter = '';
            }, 100);
            this.showGrowingNumber();
            this.updateHealthBar();
            this.createDamageParticles();
            if (amount >= 2 && source) {
                const direction = source.x < this.x ? 1 : -1;
                this.applyKnockback(direction, 5);
            }
            this.displayTimeout = setTimeout(() => {
                this.resetDamageDisplay();
            }, this.displayDuration);
            if (this.currentHealth <= 0) {
                this.destroy(this.game);
                return true;
            }
            return false;
        }
        showGrowingNumber() {
            if (this.damageElement) {
                this.damageElement.remove();
            }
            this.damageElement = document.createElement('div');
            let color = '#ffffff';
            let strokeColor = '#000000';
            let fontSize = '12px';
            let shadowBlur = '0px';
            if (this.totalDamageDisplay >= 8) {
                color = '#FFD700';
                strokeColor = '#B8860B';
                fontSize = '52px';
                shadowBlur = '10px';
            } else if (this.totalDamageDisplay >= 5) {
                color = '#FF8C00';
                strokeColor = '#8B4500';
                fontSize = '44px';
            }

            this.damageElement.textContent = `-${this.totalDamageDisplay}`;

            this.damageElement.style.cssText = `
                position: absolute;
                left: 0;
                top: 20px;
                color: ${color};
                font-weight: normal;
                font-size: ${fontSize};
                font-family: 'Arial', sans-serif;
                animation: damagePulse 0.3s ease-out, damageFloat 1.2s ease-out forwards;
                pointer-events: none;
                z-index: 100;
                white-space: nowrap;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            this.damageContainer.appendChild(this.damageElement);

            this.damageElement.style.animation = 'none';
            void this.damageElement.offsetWidth;
            this.damageElement.style.animation = 'damagePulse 0.3s ease-out, damageFloat 1.2s ease-in forwards';
        }

        resetDamageDisplay() {
            if (this.damageElement && this.damageElement.parentElement) {
                this.damageElement.style.animation = 'damageFadeOut 0.8s ease-out forwards';
                setTimeout(() => {
                    if (this.damageElement && this.damageElement.parentElement) {
                        this.damageElement.remove();
                    }
                }, 800);
            }

            this.totalDamageDisplay = 0;
            this.displayTimeout = null;
        }

        updateHealthBar() {
            if (!this.healthBar) return;

            const percent = Math.max(0, (this.currentHealth / this.maxHealth) * 100);
            this.healthBar.style.width = `${percent}%`;

            if (percent > 60) {
                this.healthBar.style.background = 'linear-gradient(to right, #0f0, #ff0)';
            } else if (percent > 30) {
                this.healthBar.style.background = 'linear-gradient(to right, #ff0, #f80)';
            } else {
                this.healthBar.style.background = 'linear-gradient(to right, #f80, #f00)';
            }

            this.healthBarContainer.style.opacity = percent === 100 ? '0.5' : '1';
        }

        applyKnockback(direction, force = 25) { // Aumentei a força padrão para 12
            if (this.isBeingKnockedBack) return;

            this.isBeingKnockedBack = true;

            // Joga o inimigo na direção do ataque
            this.velocityX = direction * force;

            // Pequeno salto para dar efeito de impacto (opcional)
            if (this.isGrounded) {
                this.velocityY = 5;
                this.isGrounded = false;
            }

            // Piscar em branco/brilho para feedback visual
            this.element.style.filter = 'brightness(2) saturate(0)';

            setTimeout(() => {
                this.isBeingKnockedBack = false;
                this.element.style.filter = '';
                // Reduz a velocidade gradualmente após o impacto
                this.velocityX *= 0.5;
            }, 300); // Tempo que ele fica "voando" para trás
        }

        createDamageParticles() {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const particle = document.createElement('div');
                    particle.style.cssText = `
                        position: absolute;
                        width: 4px;
                        height: 4px;
                        background: #ff5555;
                        border-radius: 50%;
                        pointer-events: none;
                        z-index: 10;
                    `;

                    const offsetX = (Math.random() - 0.5) * this.width;
                    const offsetY = Math.random() * this.height * 0.5;

                    particle.style.left = `${this.width / 2 + offsetX}px`;
                    particle.style.bottom = `${offsetY}px`;

                    this.element.appendChild(particle);

                    particle.animate([
                        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                        {
                            transform: `translate(${(Math.random() - 0.5) * 30}px, ${20 + Math.random() * 20}px) scale(0)`,
                            opacity: 0
                        }
                    ], {
                        duration: 600,
                        easing: 'ease-out'
                    }).onfinish = () => particle.remove();
                }, i * 50);
            }
        }

        // Na classe Enemy, modifique o método destroy:
        destroy(game) {
            if (this.width === 250 && this.height === 250) {
                this.element.style.backgroundImage = `url('./webp/dinossauro_morto.webp')`;
                this.element.style.bottom = '-37px';

                this.velocityX = 0;
                this.velocityY = 0;
                this.y = 0;

                if (this.healthBarContainer) {
                    this.healthBarContainer.style.display = 'none';
                }
                if (this.damageContainer) {
                    this.damageContainer.style.display = 'none';
                }

                this.isDead = true;

                this.update = function (deltaTime, platforms) {
                    this.draw();
                };

                this.getHitbox = function () {
                    return null;
                };

                this.takeDamage = function () {
                    return false;
                };

                this.checkGrounded = function () {
                    this.isGrounded = true;
                };

                this.isMarkedForletion = false;

                // SPAWN COINS QUANDO O INIMIGO MORRE
                this.spawnCoinsOnDeath(game);

                setTimeout(() => {
                    this.element.style.transition = 'opacity 2s ease-in-out';
                    this.element.style.opacity = '0';

                    setTimeout(() => {
                        if (this.element.parentElement) {
                            this.element.remove();
                            this.isMarkedForDeletion = true;
                        }
                    }, 5000);
                }, 3000);

                if (game) game.addSpecialCharge(1);
                if (game) {
                    game.enemyDestroyed(this);
                    game.addSpecialCharge(1);
                }
                return;
            }

            // PARA OUTROS TIPOS DE INIMIGOS TAMBÉM
            if (game) {
                // Spawn coins antes de destruir
                this.spawnCoinsOnDeath(game);

                game.enemyDestroyed(this);
                game.addSpecialCharge(1);
            }

            super.destroy(game);
        }

        // Adicione este método à classe Enemy:
        spawnCoinsOnDeath(game) {
            if (!game) return;

            // Determina quantas coins spawnar baseado no tipo de inimigo
            let coinCount = 1;
            let coinValue = 10;

            if (this.width === 250) { // Inimigo grande
                coinCount = 3;
                coinValue = 15;
            } else if (this.typeName === 'flyer') {
                coinCount = 2;
                coinValue = 12;
            } else if (this.typeName === 'sky_faller') {
                coinCount = 1;
                coinValue = 10;
            }

            // Spawn das coins
            for (let i = 0; i < coinCount; i++) {
                setTimeout(() => {
                    // Posição aleatória ao redor do inimigo
                    const offsetX = (Math.random() - 0.5) * 100;
                    const offsetY = Math.random() * 50 + 20;

                    const coinX = this.x + this.width / 2 + offsetX;
                    const coinY = this.y + offsetY;

                    game.spawnPointsPickup(coinX, coinY, coinValue);
                }, i * 100); // Pequeno delay entre cada coin
            }
        }
    }

    // ===================================================================
    // CLASSE PARA GERENCIAR OS CONTROLES
    // ===================================================================
    class Controls {
        constructor() {
            this.x = 0;
            this.jump = false;
            this.block = false;
            this.special = false;
            this.crouch = false;
            this.analogDown = false;
            this.attack = false;
            this.attackDown = false;
            this.attackUp = false;



            this.keyMap = new Map();
            this.activeTouches = new Map();
            this.analogBase = document.querySelector('.analog-container');
            this.analogStick = document.querySelector('.analog-stick');
            this.crouchButtonActive = false;
            this.buttonControls = {
                'btn-jump': 'jump',
                'btn-attack': 'attack',
                'btn-block': 'block',
                'btn-special': 'special',
                'btn-crouch': 'crouchButton'
            };

            const gameContainer = document.getElementById('game-container');

            gameContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            gameContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            gameContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            gameContainer.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));

            this.setupButtonFeedback();
        }

        setupButtonFeedback() {
            Object.keys(this.buttonControls).forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    const keyBindings = {
                        'btn-jump': ['Space', 'ArrowUp', 'KeyW'],
                        'btn-attack': ['KeyX', 'KeyJ'],
                        'btn-block': ['KeyC', 'KeyK', 'ArrowDown', 'KeyS'],
                        'btn-special': ['KeyV', 'KeyL']
                    };

                    document.addEventListener('keydown', (e) => {
                        if (keyBindings[id]?.includes(e.code)) {
                            btn.classList.add('action-btn-active');
                        }
                    });

                    document.addEventListener('keyup', (e) => {
                        if (keyBindings[id]?.includes(e.code)) {
                            btn.classList.remove('action-btn-active');
                        }
                    });
                }
            });
        }

        handleKeyDown(e) {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            this.keyMap.set(e.code, true);
        }

        handleKeyUp(e) {
            this.keyMap.set(e.code, false);
        }

        handleTouchStart(e) {
            e.preventDefault();

            for (const touch of e.changedTouches) {
                const touchId = touch.identifier;
                let touchHandled = false;

                for (const btnId in this.buttonControls) {
                    const btn = document.getElementById(btnId);
                    if (btn && this.isTouchInside(touch, btn)) {
                        this.activeTouches.set(touchId, {
                            type: 'button',
                            buttonId: btnId
                        });
                        btn.classList.add('action-btn-active');

                        if (btnId === 'btn-crouch') {
                            this.crouchButtonActive = true;
                        }
                        touchHandled = true;
                        break;
                    }
                }

                if (!touchHandled && this.isTouchInside(touch, this.analogBase)) {
                    const rect = this.analogBase.getBoundingClientRect();
                    this.activeTouches.set(touchId, {
                        type: 'analog',
                        startX: touch.clientX,
                        currentX: touch.clientX,
                        baseRect: rect
                    });
                    this.analogStick.classList.add('dragging'); // Disable transition
                    touchHandled = true;
                }
            }
        }

        handleTouchMove(e) {
            e.preventDefault();

            for (const touch of e.changedTouches) {
                const touchId = touch.identifier;
                const touchData = this.activeTouches.get(touchId);

                if (touchData?.type === 'analog') {
                    const rect = touchData.baseRect;
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    let deltaX = touch.clientX - centerX;
                    let deltaY = touch.clientY - centerY;
                    const maxDistance = rect.width / 2 - this.analogStick.offsetWidth / 2;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    if (distance > maxDistance) {
                        const angle = Math.atan2(deltaY, deltaX);
                        deltaX = maxDistance * Math.cos(angle);
                        deltaY = maxDistance * Math.sin(angle);
                    }

                    this.analogStick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                    touchData.currentX = touch.clientX;
                    touchData.currentY = touch.clientY;
                }
            }
        }

handleTouchEnd(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
        const touchId = touch.identifier;
        const touchData = this.activeTouches.get(touchId);

        if (touchData) {
            if (touchData.type === 'button') {
                document.getElementById(touchData.buttonId)?.classList.remove('action-btn-active');
                if (touchData.buttonId === 'btn-crouch') {
                    this.crouchButtonActive = false;
                }
            } else if (touchData.type === 'analog') {
                // CORREÇÃO: Resetar para posição central corretamente
                this.analogStick.classList.remove('dragging');
                this.analogStick.style.transform = 'translate(-50%, -50%)'; // Centralizar novamente
            }
        }
        this.activeTouches.delete(touchId);
    }
}


        isTouchInside(touch, element) {
            const rect = element.getBoundingClientRect();
            return touch.clientX >= rect.left &&
                touch.clientX <= rect.right &&
                touch.clientY >= rect.top &&
                touch.clientY <= rect.bottom;
        }

update() {
    const prevAttackState = this.attack;

    // 1. Lógica do Teclado (mantida)
    let keyboardX = 0;
    if (this.keyMap.get('ArrowLeft') || this.keyMap.get('KeyA')) keyboardX = -1;
    if (this.keyMap.get('ArrowRight') || this.keyMap.get('KeyD')) keyboardX = 1;

    const keyboardAttackHeld = this.keyMap.get('KeyX') || this.keyMap.get('KeyJ');
    const keyboardBlock = this.keyMap.get('KeyC') || this.keyMap.get('KeyK');
    const keyboardCrouch = this.keyMap.get('ArrowDown') || this.keyMap.get('KeyS');
    const keyboardJump = this.keyMap.get('Space') || this.keyMap.get('ArrowUp') || this.keyMap.get('KeyW');
    const keyboardSpecial = this.keyMap.get('KeyV') || this.keyMap.get('KeyL');

    // 2. Lógica do Toque (CORRIGIDA)
    let touchAnalogX = 0;
    let touchAnalogY = 0;
    let touchAnalogActive = false;
    let touchJumpActive = false,
        touchBlockActive = false,
        touchSpecialActive = false,
        touchAttackHeld = false;

    for (const [_, touchData] of this.activeTouches) {
        if (touchData.type === 'analog') {
            const rect = touchData.baseRect;
            
            // Calcula o centro exato
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calcula a distância do toque em relação ao centro
            const deltaX = touchData.currentX - centerX;
            const deltaY = touchData.currentY - centerY;
            
            // Calcula a distância total
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxRadius = rect.width / 2 - 20; // Raio máximo com margem
            
            // Normaliza os valores (0 a 1)
            let normalizedX = 0;
            let normalizedY = 0;
            
            if (distance > 15) { // ZONA MORTA aumentada para 15px
                // Limita ao raio máximo
                const limitedDistance = Math.min(distance, maxRadius);
                
                // Normaliza os valores
                const angle = Math.atan2(deltaY, deltaX);
                normalizedX = Math.cos(angle) * (limitedDistance / maxRadius);
                normalizedY = Math.sin(angle) * (limitedDistance / maxRadius);
                
                // Aplica curva de sensibilidade (opcional, mais suave)
                normalizedX = Math.sign(normalizedX) * Math.pow(Math.abs(normalizedX), 0.8);
                normalizedY = Math.sign(normalizedY) * Math.pow(Math.abs(normalizedY), 0.8);
                
                touchAnalogActive = true;
            }
            
            // Define movimento horizontal (com threshold)
            if (Math.abs(normalizedX) > 0.2) {
                touchAnalogX = Math.sign(normalizedX);
            }
            
            // Define agachamento (eixo Y negativo = para baixo)
            // Para agachar, precisa puxar para baixo significativamente
            if (normalizedY > 0.4) { // Threshold aumentado para 0.4 (40% do raio máximo)
                touchAnalogY = 1;
            }
            
        } else if (touchData.type === 'button') {
            switch (touchData.buttonId) {
                case 'btn-jump': touchJumpActive = true; break;
                case 'btn-attack': touchAttackHeld = true; break;
                case 'btn-block': touchBlockActive = true; break;
                case 'btn-special': touchSpecialActive = true; break;
            }
        }
    }

    // 3. Mistura os inputs
    this.analogDown = (touchAnalogY > 0.4) || keyboardCrouch; // Threshold consistente
    this.crouch = keyboardCrouch || this.crouchButtonActive || this.analogDown;

    // Prioridade: toque sobre teclado para movimento horizontal
    this.x = touchAnalogActive ? touchAnalogX : keyboardX;
    this.attack = keyboardAttackHeld || touchAttackHeld;
    this.jump = keyboardJump || touchJumpActive;
    this.block = keyboardBlock || touchBlockActive;
    this.special = keyboardSpecial || touchSpecialActive;

    this.attackDown = this.attack && !prevAttackState;
    this.attackUp = !this.attack && prevAttackState;
}

    }

    // Pré-carrega todas as imagens
    function preloadAssets() {
        const images = Object.values(ASSETS).flat().filter(url => url);
        images.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    window.addEventListener('load', preloadAssets);

    class Boss extends Entity {
        constructor(x, y, game) {
    
            super(x, y, 600, 700);
            this.game = game;
            this.element.className = 'boss-entity';
            this.health = 1;
            this.maxHealth = 150;
            this.isDead = false;
            this.attackTimer = 0;
            this.attackInterval = 4000;
            this.hasSpawnedProjectiles = false;
            this.activated = false;
            
            this.isLowHealth = false;
    this.lastStandInterval = null;
    this.knockoutExecuted = false;

            // Garante que a barra de vida seja criada
            this.createHealthBar();

            this.initStates();
            this.stateMachine.setState('waiting');
        }

        // Método para criar a barra de vida do boss
        createHealthBar() {
            // Remove barra antiga se existir
            const oldBar = this.element.querySelector('.boss-health-bar');
            if (oldBar) oldBar.remove();

            // Cria nova barra
            this.healthBarContainer = document.createElement('div');
            this.healthBarContainer.className = 'boss-health-bar';
            this.healthBarContainer.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            height: 15px;
            background: rgba(0,0,0,0.7);
            border: 2px solid #8B0000;
            border-radius: 7px;
            overflow: hidden;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.5s;
        `;

            this.healthBarFill = document.createElement('div');
            this.healthBarFill.className = 'boss-health-fill';
            this.healthBarFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, #FF0000, #FF4500, #FFA500);
            transition: width 0.3s ease;
        `;

            this.healthBarContainer.appendChild(this.healthBarFill);
            this.element.appendChild(this.healthBarContainer);

            // Atualiza a barra inicialmente
            this.updateHealthBar();
        }

        // Método para atualizar a barra de vida
        updateHealthBar() {
            if (!this.healthBarFill) return;

            const percent = Math.max(0, (this.health / this.maxHealth) * 100);
            this.healthBarFill.style.width = `${percent}%`;

            // Muda a cor baseado na vida
            if (percent > 60) {
                this.healthBarFill.style.background = 'linear-gradient(to right, #FF0000, #FF4500, #FFA500)';
            } else if (percent > 30) {
                this.healthBarFill.style.background = 'linear-gradient(to right, #FF4500, #FFA500, #FFD700)';
            } else {
                this.healthBarFill.style.background = 'linear-gradient(to right, #FFA500, #FFD700, #FFFF00)';
            }
        }

        // Método para mostrar a barra
        showHealthBar() {
            if (this.healthBarContainer) {
                this.healthBarContainer.style.opacity = '1';
            }
        }

        // Método para esconder a barra
        hideHealthBar() {
            if (this.healthBarContainer) {
                this.healthBarContainer.style.opacity = '0';
            }
        }

        initStates() {
            this.stateMachine.addState('waiting', {
                enter: () => {
                    this.activated = false;
                    this.element.style.backgroundImage = `url('${ASSETS.boss_activate[0]}')`;
                    this.frame = 0;
                    this.hideHealthBar(); // Esconde a barra enquanto espera
                },
                update: () => {
                    // Não faz nada, fica apenas parado como um "objeto" do cenário
                }
            });

            this.stateMachine.addState('activating', {
                enter: () => {
                    this.activated = true;
                    this.setAnimation(ASSETS.boss_activate, 200);
                    // Mostra a barra de vida
                    this.showHealthBar();
                    // Atualiza a barra da UI
                    this.updateUIHealthBar();
                },
                update: () => {
                    if (this.frame === ASSETS.boss_activate.length - 1) {
                        this.stateMachine.setState('idle');
                    }
                }
            });

            this.stateMachine.addState('idle', {
                enter: () => this.setAnimation(ASSETS.boss_idle, 120),
                update: (dt) => {
                    this.attackTimer += dt;
                    if (this.attackTimer >= this.attackInterval) {
                        this.attackTimer = 0;
                        this.stateMachine.setState(Math.random() > 0.5 ? 'attack1' : 'attack2');
                    }
                }
            });

            this.stateMachine.addState('attack1', {
                enter: () => {
                    this.setAnimation(ASSETS.boss_attack1, 100);
                    this.hasSpawnedProjectiles = false;
                },
                update: () => {
                    if (this.frame === 8 && !this.hasSpawnedProjectiles) {
                        this.spawnFallingItems(4);
                        this.hasSpawnedProjectiles = true;
                    }
                    if (this.frame === ASSETS.boss_attack1.length - 1) this.stateMachine.setState('idle');
                }
            });

            this.stateMachine.addState('attack2', {
                enter: () => {
                    this.setAnimation(ASSETS.boss_attack2, 100);
                    this.hasSpawnedProjectiles = false;
                },
                update: () => {
                    if (this.frame === 5 && !this.hasSpawnedProjectiles) {
                        this.spawnFallingItems(5);
                        this.hasSpawnedProjectiles = true;
                    }
                    if (this.frame === ASSETS.boss_attack2.length - 1) this.stateMachine.setState('idle');
                }
            });

            // Estado 'death'
// No initStates() do Boss, no estado 'death':
this.stateMachine.addState('death', {
    enter: () => {
        this.isDead = true;
        this.setAnimation(ASSETS.boss_death, 100, false);
        
        // Efeito de desaparecimento
        setTimeout(() => {
            this.element.style.transition = 'opacity 2s, transform 2s';
            this.element.style.opacity = '0';
            this.element.style.transform = `translateX(${this.x}px) translateY(${-this.y}px) scale(0.8)`;
        }, 1000);
        
        // Remove completamente após um tempo
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 3000);
    },
    update: () => {
        // Nada aqui - só deixa a animação rodar
    }
});
        }

        // Método para atualizar a barra na UI superior
        updateUIHealthBar() {
            const bossUI = document.getElementById('boss-ui');
            const healthBar = document.getElementById('boss-health-bar');

            if (bossUI && healthBar) {
                const percent = Math.max(0, (this.health / this.maxHealth) * 100);
                healthBar.style.width = `${percent}%`;

                // Muda a cor baseado na vida
                if (percent > 60) {
                    healthBar.style.background = 'linear-gradient(to right, #FF0000, #FF4500, #FFA500)';
                } else if (percent > 30) {
                    healthBar.style.background = 'linear-gradient(to right, #FF4500, #FFA500, #FFD700)';
                } else {
                    healthBar.style.background = 'linear-gradient(to right, #FFA500, #FFD700, #FFFF00)';
                }

                // Se a vida chegou a 0, esconde a UI após um tempo
                if (this.health <= 0) {
                    setTimeout(() => {
                        bossUI.style.display = 'none';
                    }, 2000);
                }
            }
        }

        spawnFallingItems(count) {
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const spawnX = this.game.player.x + (Math.random() * 1200 - 600);
                    this.game.spawnEnemyAtPosition(spawnX, 800, 'sky_faller');
                }, i * 150);
            }
        }

        getHitbox() {
            if (this.isDead || !this.activated) return null;
            return {
                x: this.x + (this.width * 0.4),
                y: this.y + (this.height * 0.2),
                width: this.width * 0.2,
                height: this.height * 0.1
            };
        }

        takeDamage(amount) {
    if (this.isDead || !this.activated) return false;

    this.health -= amount;

    // Efeito visual de dano
    this.element.style.filter = 'brightness(2) sepia(1)';
    
    // Tremor na tela (para danos fortes)
    if (amount >= 5) {
        this.game.screenShake(15, 200);
    }
    
    // Feedback de dano crítico
    if (amount >= 10) {
        this.showDamageText(`CRÍTICO! -${amount}`, '#FF0000');
    }

    // Atualiza as barras de vida
    this.updateHealthBar();
    this.updateUIHealthBar();

    // Verifica se está prestes a morrer (último 10%)
    if (this.health <= this.maxHealth * 0.1 && !this.isLowHealth) {
        this.isLowHealth = true;
        this.activateLastStand();
    }

    // Verifica se morreu
    if (this.health <= 0) {
        this.health = 0;
        this.executeKnockout();
        return true;
    }

    // Efeito temporário
    setTimeout(() => {
        if (!this.isDead) this.element.style.filter = '';
    }, 100);

    // Pontos
    if (this.game && amount > 0) {
        this.game.addPoints(Math.floor(amount * 2), 'boss');
    }

    return true;
}

executeKnockout() {
    if (this.isDead) return;
  
    
    this.isDead = true;
    
    // 1. Efeito de tremor
    this.game.screenShake(20, 800);
    
    // 2. Slow motion breve
    this.game.slowMotion(0.4, 1200);
    
    // 3. Animação de morte normal
    this.stateMachine.setState('death');
    
    // 4. Texto "VITÓRIA" (aparece e some sozinho)
    this.showVictoryText();
    
    if (this.game) this.game.createTransitionAfterBoss(); 
    
    // 5. Partículas de vitória
    this.spawnVictoryParticles();
    
    // 6. Pontuação extra
    if (this.game) {
        this.game.addPoints(500, 'boss_defeat');
    }
    
    // 7. Remove barreiras após um tempo
    setTimeout(() => {
        if (this.game) {
            this.game.removeBossBarriers();
            this.game.bossArena.active = false;
            
            // Cura o jogador um pouco como recompensa
            this.game.player.health = Math.min(
                this.game.player.health + 2, 
                CONFIG.PLAYER_HEALTH
            );
            this.game.updateBloodHealthBar();
        }
    }, 1500);
}

showVictoryText() {
    const victoryText = document.createElement('div');
    victoryText.className = 'victory-text-cuphead';
    victoryText.textContent = 'VITÓRIA';
    
    victoryText.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 100px;
        font-weight: 900;
        font-family: 'Impact', 'Arial Black', sans-serif;
        color: #FFD700;
        text-shadow: 
            0 0 15px #FF4500,
            0 0 30px #FF0000,
            3px 3px 0 #000,
            -3px -3px 0 #000,
            3px -3px 0 #000,
            -3px 3px 0 #000;
        letter-spacing: 8px;
        z-index: 10000;
        pointer-events: none;
        animation: victoryPopup 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;
    
    document.getElementById('game-container').appendChild(victoryText);
    
    // Remove automaticamente após a animação
    setTimeout(() => {
        if (victoryText.parentElement) {
            victoryText.remove();
        }
    }, 2500);
}

spawnVictoryParticles() {
    // Partículas douradas simples
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            this.createGoldParticle();
        }, i * 30);
    }
}

createGoldParticle() {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: ${15 + Math.random() * 20}px;
        height: ${15 + Math.random() * 20}px;
        background: radial-gradient(circle, #FFD700 0%, #FFA500 100%);
        border-radius: 50%;
        left: ${this.x + this.width/2}px;
        bottom: ${this.y + this.height/2}px;
        pointer-events: none;
        z-index: 999;
        transform: translate(-50%, -50%);
        filter: drop-shadow(0 0 5px gold);
    `;
    
    this.game.gameWorld.appendChild(particle);
    
    // Animação simples
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    
    particle.animate([
        { 
            transform: `translate(-50%, -50%) scale(1)`,
            opacity: 1 
        },
        { 
            transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
            opacity: 0 
        }
    ], {
        duration: 800 + Math.random() * 400,
        easing: 'ease-out'
    }).onfinish = () => particle.remove();
}

playKnockoutAnimation() {
    // Cria animação especial de KO
    const koFrames = [
        './webp/boss_ko1.webp',
        './webp/boss_ko2.webp',
        './webp/boss_ko3.webp',
        './webp/boss_ko4.webp'
    ];
    
    // Se não tiver frames específicos, usa os de morte com efeito extra
    this.setAnimation(ASSETS.boss_death, 80, false);
    
    // Efeito de "congelamento" no frame final
    setTimeout(() => {
        this.element.style.filter = 'grayscale(100%) brightness(1.5)';
        this.element.style.animation = 'bossFreeze 2s forwards';
    }, 1000);
}

spawnKnockoutParticles() {
    // Partículas de estrelas/destruição
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            this.createKnockoutParticle();
        }, i * 20);
    }
}

createKnockoutParticle() {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: ${20 + Math.random() * 30}px;
        height: ${20 + Math.random() * 30}px;
        background: radial-gradient(circle, 
            #FFD700 0%, 
            #FFA500 30%, 
            #FF4500 70%, 
            transparent 100%);
        border-radius: 50%;
        left: ${this.x + this.width/2}px;
        bottom: ${this.y + this.height/2}px;
        pointer-events: none;
        z-index: 1000;
        transform: translate(-50%, -50%);
        filter: blur(2px);
    `;
    
    this.game.gameWorld.appendChild(particle);
    
    // Animação da partícula
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 10;
    const distance = 100 + Math.random() * 200;
    
    const animation = particle.animate([
        { 
            transform: `translate(-50%, -50%) scale(1)`,
            opacity: 1 
        },
        { 
            transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
            opacity: 0 
        }
    ], {
        duration: 1000 + Math.random() * 500,
        easing: 'cubic-bezier(0.215, 0.610, 0.355, 1)'
    });
    
    animation.onfinish = () => particle.remove();
}

showKnockoutText() {
    const knockoutText = document.createElement('div');
    knockoutText.className = 'knockout-text';
    knockoutText.textContent = 'KNOCKOUT!';
    
    knockoutText.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 120px;
        font-weight: 900;
        font-family: 'Impact', 'Arial Black', sans-serif;
        color: #FFD700;
        text-shadow: 
            0 0 20px #FF4500,
            0 0 40px #FF0000,
            0 0 60px #8B0000,
            5px 5px 0 #000,
            -5px -5px 0 #000,
            5px -5px 0 #000,
            -5px 5px 0 #000;
        letter-spacing: 5px;
        z-index: 10000;
        pointer-events: none;
        animation: knockoutText 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;
    
    document.getElementById('game-container').appendChild(knockoutText);
    
    // Remove após animação
    setTimeout(() => {
        knockoutText.remove();
    }, 3000);
}

createFinalExplosion() {
    const explosion = document.createElement('div');
    explosion.className = 'final-explosion';
    
    explosion.style.cssText = `
        position: absolute;
        left: ${this.x + this.width/2 - 150}px;
        bottom: ${this.y + this.height/2 - 150}px;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle, 
            rgba(255, 215, 0, 0.8) 0%,
            rgba(255, 69, 0, 0.6) 30%,
            rgba(139, 0, 0, 0.4) 60%,
            transparent 80%);
        z-index: 999;
        pointer-events: none;
        transform: scale(0);
        animation: finalExplosion 1s ease-out forwards;
    `;
    
    this.game.gameWorld.appendChild(explosion);
    
    setTimeout(() => {
        if (explosion.parentElement) explosion.remove();
    }, 1500);
}

spawnVictoryRewards() {
    // Chuvas de moedas
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const coinX = this.x + this.width/2 + (Math.random() - 0.5) * 400;
            const coinY = this.y + this.height/2 + 100;
            
            // Moedas especiais (mais valiosas)
            const coinValue = Math.random() > 0.7 ? 50 : 20;
            this.game.spawnPointsPickup(coinX, coinY, coinValue);
            
            // Efeito extra nas moedas especiais
            if (coinValue === 50) {
                setTimeout(() => {
                    this.createShiningEffect(coinX, coinY);
                }, 300);
            }
        }, i * 50);
    }
    
    // Itens especiais (vida extra, power-up, etc.)
    setTimeout(() => {
        this.spawnSpecialReward();
    }, 800);
}

createShiningEffect(x, y) {
    const shine = document.createElement('div');
    shine.style.cssText = `
        position: absolute;
        left: ${x}px;
        bottom: ${y}px;
        width: 40px;
        height: 40px;
        background: radial-gradient(circle, 
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 215, 0, 0.6) 50%,
            transparent 70%);
        border-radius: 50%;
        z-index: 999;
        pointer-events: none;
        animation: shinePulse 1s infinite alternate;
    `;
    
    this.game.gameWorld.appendChild(shine);
    
    setTimeout(() => shine.remove(), 2000);
}

activateLastStand() {
    // Efeito quando o boss está com pouca vida
    this.element.style.animation = 'bossLastStand 0.5s infinite alternate';
    
    // Partículas de "último esforço"
    const lastStandInterval = setInterval(() => {
        if (this.isDead) {
            clearInterval(lastStandInterval);
            return;
        }
        
        this.createLastStandParticle();
    }, 200);
    
    // Salva a referência para parar depois
    this.lastStandInterval = lastStandInterval;
}

        update(dt) {
            this.stateMachine.update(dt);
            if (this.stateMachine.currentState.name !== 'waiting') {
                this.frameTimer += dt;
                if (this.frameTimer > this.frameDuration) {
                    this.frameTimer = 0;
                    const anim = this.currentAnimation;
                    if (anim?.length > 1) {
                        // Lógica de loop vs one-shot
                        if (this.loopAnimation) {
                            this.frame = (this.frame + 1) % anim.length;
                        } else {
                            this.frame = Math.min(this.frame + 1, anim.length - 1);
                        }
                        this.element.style.backgroundImage = `url('${anim[this.frame]}')`;
                    }
                }
            }
        }

        draw() {
            this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-this.y)}px) scaleX(1)`;
        }
    }
    
class HiddenTransitionItem extends Entity {
    constructor(x, y, nextLevelUrl) {
        // x = final da fase (ex: 6300), y = altura (0)
        super(x, y, 150, 200); // Hitbox um pouco maior para garantir que o player encoste
        this.nextLevelUrl = nextLevelUrl;
        this.isActive = false;
        
        // Container invisível
        this.element.className = 'transition-portal-invisible';
        this.element.style.cssText = `
            position: absolute;
            width: 150px;
            height: 200px;
            z-index: -1; /* Fica atrás de tudo */
            pointer-events: none;
            background: transparent; /* Totalmente transparente */
        `;
    }

    update(deltaTime) {
        if (!this.game || !this.game.player || this.isActive) return;

        const player = this.game.player;
        const playerHitbox = player.getHitbox();

        // Hitbox de detecção (baseada no bottom)
        const portalHitbox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };

        // Se encostar no final da fase, transiciona suavemente
        if (checkCollision(playerHitbox, portalHitbox)) {
            this.activatePortal();
        }
    }

    activatePortal() {
        this.isActive = true;
        
        // Overlay branco suave para a transição (sem textos)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: white; z-index: 10000; pointer-events: none;
            opacity: 0; transition: opacity 1.5s ease-in-out;
        `;
        document.body.appendChild(overlay);

        // Inicia o fade out da tela
        setTimeout(() => { overlay.style.opacity = '1'; }, 50);

        setTimeout(() => {
            window.location.href = this.nextLevelUrl;
        }, 1600);
    }

    draw() {
        // Posicionamento no final da fase
        this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-this.y)}px)`;
    }
}


    class PointsPickup extends Entity {
        constructor(x, y, pointsValue = 10) {
            super(x, y, 30, 30);
            this.element.className = 'points-pickup';
            this.pointsValue = pointsValue;
            this.element.style.backgroundImage = `url('${ASSETS.pickup_points}')`;


            // REMOVIDO: this.element.style.animation = 'float 2s ease-in-out infinite';
            // A animação agora é feita via JS para sincronizar com o hitbox

            this.element.style.backgroundSize = 'contain';
            this.element.style.backgroundRepeat = 'no-repeat';
            this.element.style.backgroundPosition = 'center';

            this.velocityY = -5;
            this.isGrounded = false;
            this.rotation = 0;

            // Controle de flutuação via JS
            this.floatTimer = Math.random() * Math.PI * 2; // Começa em fase aleatória
            this.floatOffset = 0;

            // Posição inicial
            // CORREÇÃO: Garante que o elemento seja absoluto para posicionamento correto
            this.element.style.position = 'absolute';
            this.element.style.left = '0px';
            this.element.style.bottom = '0px'; // IMPORTANTE: Referência no chão para o translateY funcionar

            this.draw();
        }

        update(deltaTime) {
            // Safeguard para deltaTime
            const dt = deltaTime || 16;

            // Física
            if (!this.isGrounded) {
                this.velocityY -= CONFIG.GRAVITY * 0.3;
                this.y += this.velocityY;

                if (this.y <= 0) {
                    this.y = 0;
                    this.velocityY = 0;
                    this.isGrounded = true;
                }
            }

            // Atualizar rotação
            this.rotation += 2 * (dt / 16); // 2 graus por frame a 60fps

            // Atualizar flutuação (Senoide)
            this.floatTimer += dt / 1000 * 3; // Velocidade 3
            this.floatOffset = Math.sin(this.floatTimer) * 10; // Amplitude 10px

            this.draw();
        }

        draw() {
            // Aplicamos o floatOffset na posição Y visual
            const visualY = this.y + this.floatOffset;

            this.element.style.transform = `translateX(${Math.round(this.x)}px) translateY(${Math.round(-visualY)}px) scaleX(1)`;

            // Rotação separada para não interferir
            this.element.style.transform += ` rotate(${this.rotation}deg)`;
        }

        getHitbox() {
            // CORREÇÃO CRÍTICA: O hitbox deve usar as MESMAS coordenadas que o visual
            // Agora consideramos o floatOffset também para o hitbox

            return {
                x: this.x,
                y: this.y + this.floatOffset, // Adiciona o offset da flutuação
                width: this.width,
                height: this.height
            };
        }
    }

    // ===================================================================
    // CLASSE PRINCIPAL DO JOGO
    // ===================================================================
class ParallaxSystem {
    constructor() {
        this.background = null;
        this.parallaxFactor = 0.5;
        this.currentOffset = 0;
        this.targetOffset = 0;
        this.smoothing = 0.1;
        this.isMoving = false;
        this.lastCameraX = 0;
        
        this.init();
    }

    init() {
        this.background = document.createElement('div');
        this.background.id = 'parallax-nature-bg';
        document.body.insertBefore(this.background, document.body.firstChild);
        
        this.preloadImage();
        console.log('✅ Sistema de parallax inicializado (sem chão)');
    }

    preloadImage() {
        const img = new Image();
        img.src = './webp/nature.webp';
        img.onload = () => {
            console.log('🌄 Background de parallax carregado');
            this.background.style.opacity = '1';
        };
    }

    // ATUALIZAÇÃO: Apenas para elementos de background, não para o chão
    update(cameraX) {
        if (!this.background) return;
        
        const cameraDelta = cameraX - this.lastCameraX;
        this.lastCameraX = cameraX;
        
        if (Math.abs(cameraDelta) < 0.1) {
            this.isMoving = false;
            return;
        }
        
        this.isMoving = true;
        
        // Aplica parallax apenas ao background (não ao chão)
        this.targetOffset = cameraX * this.parallaxFactor * -1;
        
        // Suavização
        this.currentOffset += (this.targetOffset - this.currentOffset) * this.smoothing;
        
        // Aplica a transformação apenas ao background
        this.background.style.transform = `translate3d(${this.currentOffset}px, 0, 0)`;
    }

    // Método alternativo sem afetar o chão
    updateWithPlayer(playerX, playerDirection, cameraX) {
        if (!this.background) return;
        
        if (Math.abs(playerDirection) < 0.1) {
            this.isMoving = false;
            return;
        }
        
        this.isMoving = true;
        
        if (playerDirection > 0) {
            this.targetOffset -= this.parallaxFactor * Math.abs(playerDirection);
        } else {
            this.targetOffset += this.parallaxFactor * Math.abs(playerDirection);
        }
        
        this.targetOffset = Math.max(-1000, Math.min(1000, this.targetOffset));
        this.currentOffset += (this.targetOffset - this.currentOffset) * 0.08;
        
        this.background.style.transform = `translate3d(${this.currentOffset}px, 0, 0)`;
    }

    reset() {
        this.currentOffset = 0;
        this.targetOffset = 0;
        this.lastCameraX = 0;
        
        if (this.background) {
            this.background.style.transform = 'translate3d(0, 0, 0)';
        }
    }
}
    class Game {
    constructor() {
        this.gameWorld = document.getElementById('game-world');
        this.parallaxSystem = new ParallaxSystem();
        this.ui = new UI();
        this.ui.game = this;
        this.player = new Player(0, 0, this);
        this.controls = new Controls();
        this.enemies = [];
        this.boss = null;
        this.pits = [];
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.createPits();
        this.spawnPoints = [];
        this.defineSpawnPoints();
        this.platforms = [];
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        this.pickupItems = [];
        this.bossBarriers = [];
        this.lastTime = 0;
        this.worldX = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 3000;
        this.specialCharge = 0;
        this.createBloodHealthBar();
        
        this.transitionSystem = null;
        
        // =========== NOVAS PROPRIEDADES DA CÂMERA ===========
        this.cameraOffsetY = 0;           // Offset vertical da câmera
        this.targetCameraOffsetY = 0;     // Offset alvo para suavização
        this.cameraSmoothingY = 0.08;     // Suavização vertical (mais suave)
        
        // Para o balanço ao pular
        this.jumpWobble = {
            active: false,
            amplitude: 12,     // Intensidade do balanço (em pixels)
            frequency: 0.15,   // Frequência do movimento
            time: 0,           // Contador de tempo
            duration: 0.6      // Duração do balanço em segundos
        };
        
        // Para o acompanhamento vertical
        this.playerHeightThreshold = 130;  // Quando o player está "alto"
        this.maxCameraOffset = 180;        // Quanto a câmera pode subir
        this.baseCameraHeight = 300;       // Altura base da câmera
        
        this.isGameOver = false;
        this.totalPoints = 0;

        this.gameWorld.appendChild(this.player.element);
        this.createPlatforms();
        this.createPickupItems();
        this.loop = this.loop.bind(this);

        this.bossArena = {
            active: false,
            xTrigger: 5900,
            leftBoundary: 5000,
            rightBoundary: 6000,
            isResolved: false
        };
        this.lives = 3; // Três chances
        this.maxLives = 3;
        this.isRespawningFromDeath = false;
        this.respawnDelay = 100; // 2 segundos para respawn após morte
        this.respawnTimer = 0;
        
        this.startPosition = { x: 100, y: 100 }; // Posição inicial do jogo
        
        // Configurações iniciais da câmera
        this.setupCamera();
    }
        createBloodHealthBar() {
        // Remove barra antiga se existir para não duplicar
        const oldBar = document.querySelector('.blood-health-bar');
        if (oldBar) oldBar.remove();

        const bloodBar = document.createElement('div');
        bloodBar.className = 'blood-health-bar';
        bloodBar.style.cssText = `
            position: fixed;
            top: 20px;       /* Margem do topo */
            left: 190px;      /* Canto Esquerdo */
            width: 300px;
            height: 10px;
            background: rgba(0,0,0,0.8);
            border: 2px solid #444;
            border-radius: 4px;
            overflow: hidden;
            z-index: 1000;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
        `;
        
        const bloodFill = document.createElement('div');
        bloodFill.className = 'blood-health-fill';
        bloodFill.id = 'blood-health-fill';
        bloodFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, #ff3333, #aa0000);
            transition: width 0.2s ease-out;
            position: relative;
        `;
        
        // Adiciona um brilho no topo da barra para efeito 3D
        bloodFill.innerHTML = `<div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            background: rgba(255,255,255,0.2);
        "></div>`;
        
        bloodBar.appendChild(bloodFill);
        document.getElementById('game-container').appendChild(bloodBar);
    }
    
createTransitionAfterBoss() {
    if (this.transitionSystem) return;

    // Pixel 6300 é o fim da fase
    const spawnX = 6300; 
    const spawnY = 0; 

    this.transitionSystem = new HiddenTransitionItem(spawnX, spawnY, 'fase2.html');
    this.transitionSystem.game = this;
    
    // Adiciona ao mundo (ele estará lá, mas transparente)
    this.gameWorld.appendChild(this.transitionSystem.element);
    
    console.log('🏁 Sensor de final de fase ativado (invisível)');
}


screenShake(intensity, duration) {
    const gameWorld = this.gameWorld;
    const originalTransform = gameWorld.style.transform;
    
    let shakeCount = 0;
    const maxShakes = duration / 50; // 50ms por shake
    
    const shakeInterval = setInterval(() => {
        const x = (Math.random() - 0.5) * intensity * 2;
        const y = (Math.random() - 0.5) * intensity;
        
        // Aplica o shake no offset da câmera
        this.worldX += x;
        this.cameraOffsetY += y;
        
        shakeCount++;
        
        if (shakeCount >= maxShakes) {
            clearInterval(shakeInterval);
            // Volta suavemente à posição original
            setTimeout(() => {
                // O draw() normal já vai suavizar de volta
            }, 100);
        }
    }, 50);
}

pauseGameplay(duration) {
    this.isPaused = true;
    
    // Salva o estado das animações
    this.savedAnimations = [];
    document.querySelectorAll('*').forEach(el => {
        const animation = getComputedStyle(el).animation;
        if (animation && animation !== 'none') {
            this.savedAnimations.push({element: el, animation: animation});
            el.style.animationPlayState = 'paused';
        }
    });
    
    // Retorna após a duração
    setTimeout(() => {
        this.isPaused = false;
        this.savedAnimations.forEach(item => {
            item.element.style.animationPlayState = 'running';
        });
    }, duration);
}

// Na classe Game:
slowMotion(speed, duration) {
    // Apenas ajusta a velocidade por um tempo
    const originalFrameInterval = frameInterval;
    frameInterval = frameInterval / speed;
    
    setTimeout(() => {
        frameInterval = originalFrameInterval;
    }, duration);
}

screenShake(intensity, duration) {
    const originalWorldX = this.worldX;
    const originalCameraY = this.cameraOffsetY;
    
    let elapsed = 0;
    const shake = () => {
        if (elapsed >= duration) {
            this.worldX = originalWorldX;
            this.cameraOffsetY = originalCameraY;
            return;
        }
        
        const currentIntensity = intensity * (1 - elapsed / duration);
        this.worldX = originalWorldX + (Math.random() - 0.5) * currentIntensity;
        this.cameraOffsetY = originalCameraY + (Math.random() - 0.5) * currentIntensity * 0.5;
        
        elapsed += 16;
        requestAnimationFrame(shake);
    };
    
    shake();
}

showVictoryScreen() {
    setTimeout(() => {
        const victoryScreen = document.createElement('div');
        victoryScreen.className = 'victory-screen';
        
        victoryScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, 
                rgba(0,0,0,0.9) 0%,
                rgba(139,0,0,0.7) 50%,
                rgba(0,0,0,0.9) 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: 'Arial Black', sans-serif;
            opacity: 0;
            animation: fadeIn 1s forwards;
        `;
        
        victoryScreen.innerHTML = `
            <div style="text-align: center;">
                <h1 style="font-size: 72px; color: #FFD700; margin-bottom: 20px;
                    text-shadow: 0 0 30px #FF4500;">
                    VITÓRIA!
                </h1>
                
                <div style="font-size: 36px; margin: 30px 0;">
                    <p>Boss Derrotado!</p>
                    <p style="color: #00FF00; font-size: 48px; margin-top: 10px;">
                        +1000 Pontos
                    </p>
                </div>
                
                <div style="margin: 40px 0;">
                    <p style="font-size: 24px; color: #FFA500;">Recompensas:</p>
                    <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
                        <div style="text-align: center;">
                            <img src="./webp/coin.webp" style="width: 50px; height: 50px;">
                            <p>+30 Moedas</p>
                        </div>
                        <div style="text-align: center;">
                            <img src="./webp/heart.webp" style="width: 50px; height: 50px;">
                            <p>Vida Extra</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 50px;">
                    <p style="font-size: 20px; color: #AAA;">Próximo nível desbloqueado!</p>
                    <button id="continue-btn" style="
                        margin-top: 30px;
                        padding: 20px 40px;
                        font-size: 24px;
                        background: linear-gradient(45deg, #FFD700, #FF8C00);
                        color: black;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: transform 0.3s, box-shadow 0.3s;
                        box-shadow: 0 5px 15px rgba(255, 215, 0, 0.5);
                    ">CONTINUAR</button>
                </div>
            </div>
        `;
        
        document.getElementById('game-container').appendChild(victoryScreen);
        
        // Anima a entrada
        setTimeout(() => {
            victoryScreen.style.opacity = '1';
        }, 100);
        
        // Botão continuar
        document.getElementById('continue-btn').addEventListener('click', () => {
            victoryScreen.style.animation = 'fadeOut 1s forwards';
            setTimeout(() => {
                if (victoryScreen.parentElement) {
                    victoryScreen.remove();
                }
                // Aqui você pode carregar o próximo nível
                console.log('Próximo nível...');
            }, 1000);
        });
        
        // Adiciona pontos extras
        this.addPoints(1000, 'boss_defeat');
        
        // Dá vida extra ao jogador
        this.player.health = CONFIG.PLAYER_HEALTH;
        this.updateBloodHealthBar();
        
    }, 2500); // 2.5 segundos após o KO
}


// Atualize a barra de sangue quando a vida mudar
updateBloodHealthBar() {
        const bloodFill = document.getElementById('blood-health-fill');
        if (bloodFill) {
            // Garante que não fique negativo com Math.max(0, ...)
            const percent = Math.max(0, (this.player.health / CONFIG.PLAYER_HEALTH) * 100);
            
            bloodFill.style.width = `${percent}%`;
            
            // Muda a cor baseado na vida restante
            if (percent > 60) {
                bloodFill.style.background = 'linear-gradient(to right, #8B0000, #FF0000, #8B0000)';
                bloodFill.style.animation = 'none';
            } else if (percent > 30) {
                bloodFill.style.background = 'linear-gradient(to right, #8B0000, #FF0000, #FF4500)';
                bloodFill.style.animation = 'none';
            } else {
                bloodFill.style.background = 'linear-gradient(to right, #8B0000, #FF4500, #FF8C00)';
                // Pisca quando a vida está baixa
                if (percent > 0 && percent <= 20) {
                    bloodFill.style.animation = 'pulse 1s infinite';
                } else {
                    bloodFill.style.animation = 'none';
                }
            }
        }
    }

       // NOVO: Método para mostrar explosão
    showExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion-effect';
        explosion.style.cssText = `
            position: absolute;
            left: ${x - 50}px;
            bottom: ${y - 50}px;
            width: 200px;
            height: 200px;
            background-image: url('${ASSETS.explosion_gif}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1000;
            pointer-events: none;
        `;
        
        this.gameWorld.appendChild(explosion);
        
        // Remove após a animação
        setTimeout(() => {
            if (explosion.parentElement) {
                explosion.remove();
            }
        }, 1000);
    }
    
    // NOVO: Método para perder uma vida
    loseLife() {
        if (this.lives <= 0) return;
        
        this.lives--;
        this.updateLivesDisplay();
        
        // Mostra explosão na posição do jogador
        this.showExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
        
        if (this.lives > 0) {
            // Ainda tem vidas, reinicia do início
            this.startRespawnAfterDeath();
        } else {
            // Sem vidas, game over
            setTimeout(() => {
                this.gameOver();
            }, 1000);
        }
    }
    
    // NOVO: Iniciar respawn após morte
    startRespawnAfterDeath() {
        this.isRespawningFromDeath = true;
        this.respawnTimer = this.respawnDelay;
        
        // Esconde o jogador temporariamente
        this.player.element.style.opacity = '0';
        this.player.isParalyzed = true;
    }
    
    // NOVO: Atualizar respawn após morte
    updateRespawnAfterDeath(deltaTime) {
        if (!this.isRespawningFromDeath) return;
        
        this.respawnTimer -= deltaTime;
        
        if (this.respawnTimer <= 0) {
            this.respawnFromDeath();
        }
    }
    
    // NOVO: Respawn após morte
        // DENTRO DA CLASS GAME
    respawnFromDeath() {
        // 1. Reposiciona no início
        this.player.x = this.startPosition.x;
        this.player.y = this.startPosition.y;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.worldX = 0; // Reseta a câmera
        
        // --- NOVO: EXPLOSÃO AO RENASCER ---
        // Cria a explosão na posição onde o jogador acabou de aparecer
        this.showExplosion(
            this.player.x + this.player.width / 2, 
            this.player.y + this.player.height / 2
        );
        // ----------------------------------

        // Restaura saúde do jogador
        this.player.health = CONFIG.PLAYER_HEALTH;
        this.ui.updateHealth(this.player.health);
        
        // Restaura escudo
        this.player.shieldHealth = this.player.shieldMaxHealth;
        this.player.isShieldBroken = false;
        
        // Remove invulnerabilidade se houver (reseta estado)
        this.player.isInvulnerable = false;
        this.player.element.classList.remove('invulnerable');
        
        // Mostra o jogador novamente
        this.player.element.style.opacity = '1';
        this.player.isParalyzed = false;
        
        // Efeito visual de brilho (feedback visual extra)
        this.player.element.style.filter = 'brightness(2)';
        setTimeout(() => {
            this.player.element.style.filter = '';
        }, 500);
        
        this.isRespawningFromDeath = false;
        
        // Atualiza a barra de sangue
        this.updateBloodHealthBar();
        
        // Adiciona invulnerabilidade temporária após respawn (spawn protection)
        this.player.isInvulnerable = true;
        this.player.element.classList.add('invulnerable');
        setTimeout(() => {
            this.player.isInvulnerable = false;
            this.player.element.classList.remove('invulnerable');
        }, 2000);
    }

    
    updateLivesDisplay() {
        // Remove o display antigo se existir
        const oldDisplay = document.querySelector('.lives-display');
        if (oldDisplay) oldDisplay.remove();
        
        // Cria novo container
        const livesDisplay = document.createElement('div');
        livesDisplay.className = 'lives-display';
        livesDisplay.style.cssText = `
            position: fixed;
            top: 55px;       /* Logo abaixo da barra de vida */
            left: 20px;      /* Alinhado a esquerda */
            display: flex;
            gap: 5px;        /* Espaço entre corações */
            z-index: 1000;
        `;
        
        // Loop para criar os corações baseados no número de vidas
        for (let i = 0; i < this.lives; i++) {
            const heart = document.createElement('img');
            // Certifique-se que o caminho está correto conforme seu ASSETS
            heart.src = './webp/heart.webp'; 
            heart.style.cssText = `
                width: 30px;
                height: 30px;
                object-fit: contain;
                filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.5));
            `;
            livesDisplay.appendChild(heart);
        }
        
        document.getElementById('game-container').appendChild(livesDisplay);
    }


  
    
    setupCamera() {
        // Inicializa os elementos de parallax com transformação 3D para melhor performance
        const sky = document.getElementById('sky-background');
        const ground = document.getElementById('ground');
        const foreground = document.getElementById('foreground');
        
        if (sky) sky.style.transform = 'translate3d(0, 0, 0)';
        if (ground) ground.style.transform = 'translate3d(0, 0, 0)';
        if (foreground) foreground.style.transform = 'translate3d(0, 0, 0)';
        
        // Adiciona transição suave
        this.gameWorld.style.transition = 'transform 0.1s ease-out';
    }

    calculateCameraOffset() {
        let verticalOffset = 0;
        
        // 1. Acompanhamento vertical quando o jogador sobe
        if (this.player.y > this.playerHeightThreshold) {
            // Calcula quanto acima do limite o jogador está
            const excessHeight = this.player.y - this.playerHeightThreshold;
            
            // Aplica offset proporcional, limitado ao máximo
            // Usa uma curva suave (ease-out)
            const progress = Math.min(excessHeight / 200, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 2); // easeOutQuad
            
            verticalOffset = easedProgress * this.maxCameraOffset;
        }
        
        // 2. Adiciona balanço ao pular
        let wobbleOffset = 0;
        if (this.jumpWobble.active) {
            // Usa uma função senoidal para movimento natural com decaimento
            const time = this.jumpWobble.time / this.jumpWobble.duration;
            const decay = 1 - Math.pow(time, 2); // Decai mais rápido no final
            
            // Movimento senoidal com decaimento
            wobbleOffset = Math.sin(this.jumpWobble.time * Math.PI * 2 * this.jumpWobble.frequency) 
                * this.jumpWobble.amplitude 
                * decay;
                
            // Adiciona um pequeno balanço horizontal também
            const horizontalWobble = Math.sin(this.jumpWobble.time * Math.PI * 2.5 * this.jumpWobble.frequency) 
                * (this.jumpWobble.amplitude * 0.3) 
                * decay;
                
            this.worldX += horizontalWobble * 0.1;
        }
        
        // 3. Combina ambos os offsets
        this.targetCameraOffsetY = verticalOffset + wobbleOffset;
        
        // 4. Suaviza o movimento com Lerp
        this.cameraOffsetY += (this.targetCameraOffsetY - this.cameraOffsetY) * this.cameraSmoothingY;
        
        // 5. Garante que não fique negativo
        this.cameraOffsetY = Math.max(0, this.cameraOffsetY);
    }
    
    updateCameraWobble(deltaTime) {
        // Ativa o balanço quando o jogador inicia o pulo
        if (this.player.velocityY > 12 && !this.jumpWobble.active && this.player.isJumping) {
            this.jumpWobble.active = true;
            this.jumpWobble.time = 0;
        }
        
        // Atualiza o temporizador do balanço
        if (this.jumpWobble.active) {
            this.jumpWobble.time += deltaTime / 1000; // Converter para segundos
            
            // Desativa o balanço após a duração
            if (this.jumpWobble.time > this.jumpWobble.duration) {
                this.jumpWobble.active = false;
            }
        }
    }

    checkProjectilesInPits(pit) {
        this.playerProjectiles.forEach(projectile => {
            if (!projectile.isMarkedForDeletion) {
                const projectileHitbox = projectile.getHitbox();

                if (projectileHitbox && checkCollision(projectileHitbox, pit)) {
                    console.log(`🎯 Projétil caiu no buraco!`);
                    projectile.destroy();
                    this.createPitEffect(projectile.x, projectile.y, 'projectile');
                }
            }
        });

        this.enemyProjectiles.forEach(projectile => {
            if (!projectile.isMarkedForDeletion) {
                const projectileHitbox = projectile.getHitbox();

                if (projectileHitbox && checkCollision(projectileHitbox, pit)) {
                    console.log(`🎯 Projétil inimigo caiu no buraco!`);
                    projectile.destroy();
                    this.createPitEffect(projectile.x, projectile.y, 'projectile');
                }
            }
        });
    }

    addPoints(points, source = null) {
        const bonusMultiplier = this.getPointsMultiplier(source);
        const totalPoints = points * bonusMultiplier;

        this.totalPoints += totalPoints;
        this.ui.addPoints(totalPoints);
        this.showPointsGained(points, source);

        console.log(`+${totalPoints} pontos! (Total: ${this.totalPoints})`);
    }

    spawnPointsPickup(x, y, value = 10) {
        const pickup = new PointsPickup(x, y, value);
        this.pickupItems.push(pickup);
        this.gameWorld.appendChild(pickup.element);
    }

    getPointsMultiplier(source) {
        let multiplier = 1;

        if (source === 'boss') {
            multiplier = 5;
        } else if (source === 'combo') {
            multiplier = 1.5;
        } else if (this.player.health <= 3) {
            multiplier = 2;
        }

        return multiplier;
    }

    showPointsGained(points, source) {
        const pointsPopup = document.createElement('div');
        pointsPopup.textContent = `+${points}`;

        let color = '#ffffff';
        let fontSize = '24px';

        if (source === 'boss') {
            color = '#FFD700';
            fontSize = '32px';
        } else if (points >= 20) {
            color = '#FF8C00';
            fontSize = '28px';
        }

        pointsPopup.style.cssText = `
            position: absolute;
            left: ${this.player.x + this.player.width / 2}px;
            bottom: ${this.player.y + this.player.height}px;
            color: ${color};
            font-size: ${fontSize};
            font-weight: bold;
            text-shadow: 0 0 5px #000;
            z-index: 100;
            animation: pointsFloat 1.5s ease-out forwards;
            pointer-events: none;
        `;

        this.gameWorld.appendChild(pointsPopup);

        setTimeout(() => {
            pointsPopup.remove();
        }, 1500);
    }

    enemyDestroyed(enemy, killer = 'player') {
        let points = CONFIG.POINTS_PER_ENEMY;

        if (enemy.width === 250) {
            points *= 2;
        } else if (enemy.typeName === 'flyer') {
            points *= 1.5;
        } else if (enemy.typeName === 'sky_faller') {
            points *= 1.2;
        }

        this.addPoints(points, enemy);
        this.addSpecialCharge(1);
    }

    spawnBoss(x, y) {
        this.boss = new Boss(x, y, this);
        this.gameWorld.appendChild(this.boss.element);
    }

    defineSpawnPoints() {
        this.spawnPoints = [
            { x: 1000, y: 500, type: 'sky_faller', active: true },
            { x: 1500, y: 450, type: 'sky_faller', active: true },
            { x: 2000, y: 400, type: 'sky_faller', active: true },
            { x: 2500, y: 500, type: 'sky_faller', active: true },
            { x: 3000, y: 450, type: 'sky_faller', active: true },
            { x: 3500, y: 400, type: 'sky_faller', active: true },
            { x: 4500, y: 500, type: 'sky_faller', active: true },
            { x: 1800, y: 400, type: 'flyer', active: true },
            { x: 2800, y: 350, type: 'flyer', active: true },
            { x: 3800, y: 450, type: 'flyer', active: true },
        ];

        this.spawnGroups = [
            {
                name: 'primeira_onda',
                points: [
                    { x: 2200, y: 500, type: 'sky_faller' },
                    { x: 2250, y: 450, type: 'sky_faller' },
                    { x: 2300, y: 300, type: 'flyer' },
                    { x: 2600, y: 400, type: 'sky_faller' }
                ],
                activated: false
            },
            {
                name: 'segunda_onda',
                points: [
                    { x: 3200, y: 550, type: 'sky_faller' },
                    { x: 3250, y: 450, type: 'sky_faller' },
                    { x: 3400, y: 450, type: 'sky_faller' },
                    { x: 3300, y: 250, type: 'flyer' },
                    { x: 3450, y: 500, type: 'sky_faller' }
                ],
                activated: false
            },
            {
                name: 'terceira_onda',
                points: [
                    { x: 4200, y: 500, type: 'sky_faller' },
                    { x: 4250, y: 350, type: 'flyer' },
                    { x: 4300, y: 450, type: 'sky_faller' },
                    { x: 4350, y: 350, type: 'flyer' },
                    { x: 4400, y: 500, type: 'sky_faller' }
                ],
                activated: false
            }
        ];
    }

    spawnEnemyAtPoint(spawnPoint) {
        const enemyType = enemyTypes[spawnPoint.type];
        if (!enemyType) return;

        const enemy = new Enemy(
            spawnPoint.x,
            spawnPoint.y,
            enemyTypes[spawnPoint.type],
            this.player,
            this
        );

        this.enemies.push(enemy);
        this.gameWorld.appendChild(enemy.element);

        console.log(`Inimigo spawnado em (${spawnPoint.x}, ${spawnPoint.y})`);
        return enemy;
    }

    spawnEnemyGroup(groupName) {
        const group = this.spawnGroups.find(g => g.name === groupName);
        if (!group || group.activated) return;

        group.activated = true;
        group.points.forEach(point => {
            this.spawnEnemyAtPoint(point);
        });

        console.log(`Grupo ${groupName} ativado com ${group.points.length} inimigos`);
    }

    spawnEnemyAtPosition(x, y, type = 'sky_faller') {
        const spawnPoint = { x, y, type, active: true };
        return this.spawnEnemyAtPoint(spawnPoint);
    }

    spawnEnemiesInLine(startX, startY, count, spacing = 200, type = 'sky_faller') {
        const enemies = [];
        for (let i = 0; i < count; i++) {
            const x = startX + (i * spacing);
            const enemy = this.spawnEnemyAtPosition(x, startY, type);
            if (enemy) enemies.push(enemy);
        }
        return enemies;
    }

    spawnEnemiesInArc(centerX, centerY, radius, count, type = 'sky_faller') {
        const enemies = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const enemy = this.spawnEnemyAtPosition(x, y, type);
            if (enemy) enemies.push(enemy);
        }
        return enemies;
    }

    createPlatforms() {
        LEVEL_DATA.platforms.forEach(d => {
            const e = document.createElement('div');
            e.className = 'platform';
            Object.assign(e.style, {
                left: `${d.x}px`,
                bottom: `${d.y}px`,
                width: `${d.width}px`,
                height: `${d.height}px`
            });
            this.gameWorld.appendChild(e);
            this.platforms.push(d);
        });
    }

    createPickupItems() {
        LEVEL_DATA.items.forEach(d => {
            const i = new PickupItem(d.x, d.y, d.type);
            this.pickupItems.push(i);
            this.gameWorld.appendChild(i.element);
        });
    }

    addSpecialCharge(amount) {
        if (this.specialCharge < CONFIG.SPECIAL_CHARGE_MAX) {
            this.specialCharge = Math.min(this.specialCharge + amount, CONFIG.SPECIAL_CHARGE_MAX);
            this.ui.updateSpecial(this.specialCharge);
        }
    }

    activateSpecial() {
        this.enemies.forEach(e => e.paralyze(CONFIG.SPECIAL_DURATION));
        this.specialCharge = 0;
        this.ui.updateSpecial(this.specialCharge);
    }

    spawnRandomEnemy() {
        const k = Object.keys(enemyTypes);
        const t = k[Math.floor(Math.random() * k.length)];
        const s = Math.random() < 0.5 ? 1 : -1;
        const x = this.player.x + (CONFIG.GAME_WIDTH * 0.7 * s) + (s * 200);
        const e = new Enemy(x, 0, enemyTypes[t], this.player, this);
        this.enemies.push(e);
        this.gameWorld.appendChild(e.element);
    }

    spawnPlayerProjectile(chargePower) {
        const weapon = WEAPONS[this.player.equippedWeapon];
        if (weapon.type !== 'ranged') return;

        let projX, projY;

        if (this.player.equippedWeapon === 'bow') {
            projX = this.player.direction > 0 ?
                this.player.x + this.player.width - 60 :
                this.player.x + 20;

            projY = this.player.y + this.player.height / 9.5;
        } else {
            projX = this.player.direction > 0 ?
                this.player.x + this.player.width - 150 :
                this.player.x + 100;

            projY = this.player.y + this.player.height / 15;
        }

        const projectile = new Projectile(projX, projY, weapon.projectileType,
            this.player.direction, chargePower, weapon.damage);

        projectile.game = this;
        this.playerProjectiles.push(projectile);
        this.gameWorld.appendChild(projectile.element);
    }

spawnEnemyProjectile(x, y) {
    console.log("🔫 Spawnando projétil da nave em:", x, y);
    
    // Cria o projétil com o tipo 'enemy_bullet'
    const p = new Projectile(x, y, 'enemy_bullet', 0);
    
    // Configurações específicas para o tiro da nave
    p.usesGravity = true;
    p.velocityY = -2;
    p.game = this;
    p.width = 60;  // Tamanho maior para ser visível
    p.height = 60; // Tamanho maior para ser visível
    
    // FORÇA a imagem - CORREÇÃO DO CAMINHO
    // Verifique qual é o caminho correto:
    // Opção 1: './webp/laser.webp' (se estiver na pasta webp)
    // Opção 2: 'webp/laser.webp' (sem o ponto)
    // Opção 3: 'laser.webp' (apenas o nome do arquivo)
    
    const imagePath = './webp/laser.webp'; // Tente este primeiro
    console.log("Tentando carregar imagem:", imagePath);
    
    p.element.style.backgroundImage = `url('${imagePath}')`;
    p.element.style.backgroundSize = "contain";
    p.element.style.backgroundRepeat = "no-repeat";
    p.element.style.backgroundPosition = "center";
    p.element.style.border = "none";
    
    // Adiciona classe CSS específica
    p.element.className = 'projectile enemy-laser';
    
    // Adiciona ao DOM primeiro
    this.gameWorld.appendChild(p.element);
    this.enemyProjectiles.push(p);
    
    // Testa se a imagem carrega
    const testImg = new Image();
    testImg.onload = () => {
        console.log("✅ Imagem laser.webp carregada com sucesso!");
        // Atualiza o elemento com a imagem carregada
        p.element.style.backgroundImage = `url('${imagePath}')`;
    };
    testImg.onerror = () => {
        console.warn("❌ Imagem laser.webp NÃO encontrada!");
        console.log("Tentando caminhos alternativos...");
        
        // Tenta caminhos alternativos
        const altPaths = [
            'webp/laser.webp',
            'laser.webp',
            './laser.webp',
            '../webp/laser.webp'
        ];
        
        for (let i = 0; i < altPaths.length; i++) {
            const altTest = new Image();
            altTest.onload = () => {
                console.log(`✅ Imagem encontrada em: ${altPaths[i]}`);
                p.element.style.backgroundImage = `url('${altPaths[i]}')`;
            };
            altTest.src = altPaths[i];
        }
    };
    testImg.src = imagePath;
    
    return p;
}
    createBossBarriers() {
        if (this.bossBarriers.length > 0) return;

        const leftBarrier = document.createElement('div');
        leftBarrier.className = 'boss-barrier';
        leftBarrier.style.cssText = `
            position: absolute;
            left: ${this.bossArena.leftBoundary - 250}px;
            bottom: -31px;
            width: 600px;
            height: 600px;
            background-image: url('${ASSETS.boss_barrier || ASSETS.arvore}');
            background-size: 100% 100%;
            z-index: 28;
            pointer-events: none;
            transform: scaleX(-1);
        `;

        const rightBarrier = document.createElement('div');
        rightBarrier.className = 'boss-barrier';
        rightBarrier.style.cssText = `
            position: absolute;
            left: ${this.bossArena.rightBoundary - 50}px;
            bottom: -31px;
            width: 600px;
            height: 600px;
            background-image: url('${ASSETS.boss_barrier || ASSETS.arvore}');
            background-repeat: repeat-y;
            background-size: contain;
            z-index: 28;
            pointer-events: none;
        `;

        this.gameWorld.appendChild(leftBarrier);
        this.gameWorld.appendChild(rightBarrier);
        this.bossBarriers.push(leftBarrier, rightBarrier);

        console.log('Barreiras visuais do boss criadas!');
    }

    removeBossBarriers() {
        this.bossBarriers.forEach(barrier => {
            if (barrier.parentElement) {
                barrier.remove();
            }
        });
        this.bossBarriers = [];
    }

    createPits() {
        LEVEL_DATA.pits.forEach(pitData => {
            const pit = {
                x: pitData.x,
                y: pitData.y,
                width: pitData.width,
                height: pitData.height,
                element: null,
                image: pitData.image
            };

            const pitElement = document.createElement('div');
            pitElement.className = 'pit';

            if (pit.image) {
                const img = imageCache.getImage(pit.image);

                pitElement.style.cssText = `
                    position: absolute;
                    left: ${pit.x}px;
                    bottom: ${pit.y}px;
                    width: ${pit.width}px;
                    height: ${pit.height}px;
                    background-image: url('${pit.image}');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    z-index: 15;
                    pointer-events: auto;
                `;
            } else {
                pitElement.style.cssText = `
                    position: absolute;
                    left: ${pit.x}px;
                    bottom: ${pit.y}px;
                    width: ${pit.width}px;
                    height: ${pit.height}px;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 15;
                    border-top: 2px dashed red;
                `;
            }

            this.gameWorld.appendChild(pitElement);
            pit.element = pitElement;
            this.pits.push(pit);
        });
    }

    checkPitCollisions() {
        if (this.isRespawning) return;

        const playerHitbox = this.player.getHitbox();

        for (const pit of this.pits) {
            if (!this.player.isInvulnerable && checkCollisionRect(playerHitbox, pit)) {
                console.log("Player colidiu com buraco!");
                this.playerFallsInPit();
                break;
            }

            this.checkEnemiesInPits(pit);
            this.checkProjectilesInPits(pit);
        }
    }

    checkEnemiesInPits(pit) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.isMarkedForDeletion || enemy.isParalyzed) continue;

            const enemyHitbox = enemy.getHitbox();
            if (!enemyHitbox) continue;

            if (checkCollisionRect(pit, enemyHitbox)) {
                console.log(`💀 Inimigo caiu no buraco! Tipo: ${enemy.typeName}`);

                const damageTaken = enemy.takeDamage(CONFIG.PIT_DAMAGE_TO_ENEMIES, 'pit');
                this.createPitEffect(enemy.x, enemy.y, 'enemy');

                if (damageTaken && enemy.currentHealth <= 0) {
                    this.addPoints(CONFIG.POINTS_PER_ENEMY, 'pit_kill');
                }
            }
        }
    }

    createPitEffect(x, y, type) {
        const effect = document.createElement('div');
        effect.className = 'pit-effect';

        effect.style.cssText = `
            position: absolute;
            left: ${x}px;
            bottom: ${y}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
            z-index: 20;
            animation: pitEffect 0.5s ease-in-out;
        `;

        this.gameWorld.appendChild(effect);

        setTimeout(() => {
            effect.remove();
        }, 500);
    }

    enemyFallsInPit(enemy, pit) {
        console.log(`💀 Inimigo caiu no buraco em (${pit.x}, ${pit.y})!`);

        const damageTaken = enemy.takeDamage(CONFIG.PIT_DAMAGE_TO_ENEMIES, 'pit');
        this.createPitEffect(enemy.x, enemy.y, 'enemy');

        if (damageTaken && enemy.currentHealth <= 0) {
            console.log(`🎯 Inimigo eliminado pelo buraco!`);
            this.addPoints(CONFIG.POINTS_PER_ENEMY * 0.5, 'pit_kill');
        }
    }

   playerFallsInPit() {
    if (this.isRespawning || this.player.isInvulnerable) return;

    console.log("💀 Player caiu em um buraco!");

    // Aplica dano
    const damageTaken = this.player.takeDamage(CONFIG.PIT_DAMAGE);
    
    if (damageTaken) {
        // Em vez de respawn, aplica um pequeno knockback para fora do buraco
        this.applyPitKnockback();
    }
}

applyPitKnockback() {
    // Encontra o buraco mais próximo
    const playerHitbox = this.player.getHitbox();
    let nearestPit = null;
    let minDistance = Infinity;
    
    for (const pit of this.pits) {
        if (checkCollisionRect(playerHitbox, pit)) {
            const pitCenter = pit.x + pit.width / 2;
            const playerCenter = this.player.x + this.player.width / 2;
            const distance = Math.abs(pitCenter - playerCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestPit = pit;
            }
        }
    }
    
    if (nearestPit) {
        // Determina a direção para empurrar (para longe do centro do buraco)
        const pitCenter = nearestPit.x + nearestPit.width / 2;
        const playerCenter = this.player.x + this.player.width / 2;
        const direction = playerCenter > pitCenter ? 1 : -1;
        
        // Aplica knockback horizontal
        this.player.velocityX = direction * 10; // Força do empurrão
        
        // Pequeno salto para sair do buraco
        this.player.velocityY = 8;
        this.player.isGrounded = false;
        
        // Efeito visual
        this.player.element.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            this.player.element.style.filter = '';
        }, 200);
        
        // Cria efeito visual no buraco
        this.createPitEffect(
            this.player.x + this.player.width / 2,
            this.player.y,
            'player'
        );
    }
}


    startRespawn() {
        this.isRespawning = true;
        this.respawnTimer = CONFIG.RESPAWN_DELAY;

        this.player.element.style.opacity = '0.5';
        this.player.element.style.filter = 'blur(2px)';
        this.player.isParalyzed = true;

        console.log("🔄 Iniciando respawn...");
    }

    updateRespawn(deltaTime) {
        if (!this.isRespawning) return;

        this.respawnTimer -= deltaTime;

        if (this.respawnTimer <= 0) {
            this.completeRespawn();
        }
    }

    createRespawnEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'respawn-effect';
        effect.style.cssText = `
            position: absolute;
            left: ${x - 50}px;
            bottom: ${y - 50}px;
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 100;
        `;

        this.gameWorld.appendChild(effect);

        setTimeout(() => {
            if (effect.parentElement) {
                effect.remove();
            }
        }, 500);
    }

    completeRespawn() {
        const safePosition = this.findSafeRespawnPosition();
        this.createRespawnEffect(safePosition.x, safePosition.y);

        this.player.x = safePosition.x;
        this.player.y = safePosition.y;
        this.player.velocityX = 0;
        this.player.velocityY = 0;

        this.player.element.style.opacity = '1';
        this.player.element.style.filter = 'none';
        this.player.isParalyzed = false;
        this.isRespawning = false;

        this.player.isInvulnerable = true;
        this.player.element.classList.add('invulnerable');

        // Reseta a câmera também
        this.cameraOffsetY = 0;
        this.targetCameraOffsetY = 0;

        setTimeout(() => {
            this.player.isInvulnerable = false;
            this.player.element.classList.remove('invulnerable');
        }, CONFIG.INVULNERABILITY_DURATION);

        console.log(`✅ Player respawned em (${safePosition.x}, ${safePosition.y})`);
    }

    findSafeRespawnPosition() {
        for (const platform of this.platforms) {
            if (platform.y > 50 && platform.width > 100) {
                return {
                    x: platform.x + platform.width / 2,
                    y: platform.y + platform.height
                };
            }
        }

        return {
            x: this.player.x > 0 ? this.player.x - 200 : 100,
            y: 100
        };
    }

    update(deltaTime) {
        if (this.isGameOver) return;
        
        this.updateRespawnAfterDeath(deltaTime);
        
        if (this.isRespawningFromDeath) {
            // Não atualiza o jogo durante o respawn
            return;
        }
        
        // =========== ATUALIZAÇÃO DA CÂMERA ===========
        this.updateCameraWobble(deltaTime);
        this.calculateCameraOffset();
        
        this.updateRespawn(deltaTime);
        
        if (this.parallaxSystem) {
            this.parallaxSystem.update(this.player.x, this.worldX);
        }

        if (!this.isRespawning) {
            this.checkPitCollisions();
        }

        if (!this.bossArena.active && !this.bossArena.isResolved && this.player.x > this.bossArena.xTrigger) {
            this.bossArena.active = true;
            const bossUI = document.getElementById('boss-ui');
            if (bossUI) bossUI.style.display = 'block';

            this.createBossBarriers();

            if (this.boss) {
                this.boss.stateMachine.setState('activating');
            }
        }

        if (this.bossArena.active) {
            if (this.player.x < this.bossArena.leftBoundary) {
                this.player.x = this.bossArena.leftBoundary;
                this.player.velocityX = 0;
            }
            if (this.player.x > this.bossArena.rightBoundary) {
                this.player.x = this.bossArena.rightBoundary;
                this.player.velocityX = 0;
            }

            if (this.boss) {
                const healthBar = document.getElementById('boss-health-bar');
                if (healthBar) {
                    const percent = (this.boss.health / this.boss.maxHealth) * 100;
                    healthBar.style.width = percent + "%";
                }

                if (this.boss.isDead) {
                    this.bossArena.active = false;
                    this.bossArena.isResolved = true;
                    const bossUI = document.getElementById('boss-ui');
                    if (bossUI) setTimeout(() => bossUI.style.display = 'none', 2000);
                }
                if (this.boss && this.boss.isDead && !this.transitionSystem) {
            this.createTransitionAfterBoss();
        }
        
        // Atualiza o sistema de transição
        
            }
        }

        this.controls.update();
        this.player.update(deltaTime, this.controls, this.platforms);

        if (this.boss) {
            this.boss.update(deltaTime);
            const bossHitbox = this.boss.getHitbox();

            this.playerProjectiles.forEach(p => {
                if (bossHitbox && checkCollision(p.getHitbox(), bossHitbox)) {
                    this.boss.takeDamage(p.damage);
                    p.destroy();
                }
            });
        }

        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > CONFIG.ENEMY_SPAWN_INTERVAL &&
            this.enemies.length < CONFIG.MAX_ENEMIES_ON_SCREEN) {

            this.enemySpawnTimer = 0;

            const spawnCount = Math.min(
                CONFIG.WAVE_SPAWN_COUNT,
                CONFIG.MAX_ENEMIES_ON_SCREEN - this.enemies.length
            );

            for (let i = 0; i < spawnCount; i++) {
                this.spawnRandomEnemy();
            }

            if (this.enemies.length > CONFIG.MAX_ENEMIES_ON_SCREEN * 0.7) {
                CONFIG.ENEMY_SPAWN_INTERVAL = Math.max(300, CONFIG.ENEMY_SPAWN_INTERVAL - 50);
            }
        }

        this.enemies.forEach(e => {
            e.update(deltaTime, this.platforms);

            if (checkCollision(this.player.getHitbox(), e.getHitbox()) && !e.isBeingKnockedBack) {
                this.player.takeDamage(1);
            }

            if (this.player.isBlocking && checkCollision(this.player.getDefenseHitbox(), e.getHitbox())) {
                e.applyKnockback(this.player.direction);
            }

            this.spawnPoints.forEach((point, index) => {
                if (point.active) {
                    const distanceToPlayer = Math.abs(this.player.x - point.x);

                    if (distanceToPlayer < 200) {
                        this.spawnEnemyAtPoint(point);
                        point.active = false;
                    }
                }
            });

            if (this.player.x > 800 && !this.spawnGroups[0].activated) {
                this.spawnEnemyGroup('primeira_onda');
            }

            if (this.player.x > 1500 && !this.spawnGroups[1].activated) {
                this.spawnEnemyGroup('segunda_onda');
            }

            if (this.player.x > 2500 && !this.spawnGroups[2]?.activated) {
                this.spawnEnemyGroup('terceira_onda');
            }

            const playerAttackHitbox = this.player.getAttackHitbox();
            if (playerAttackHitbox) {
                this.enemies.forEach(e => {
                    if (!this.player.enemiesHitInCurrentAttack.has(e)) {
                        if (checkCollision(playerAttackHitbox, e.getHitbox())) {

                            const weapon = WEAPONS[this.player.equippedWeapon];
                            const damage = weapon.damage || 1;

                            const enemyDied = e.takeDamage(damage, this.player);

                            const knockbackDir = this.player.direction;
                            e.applyKnockback(knockbackDir, 10);

                            this.player.enemiesHitInCurrentAttack.add(e);

                            if (enemyDied) {
                                this.addSpecialCharge(1);
                            }
                        }
                    }
                });
            } else {
                this.player.enemiesHitInCurrentAttack.clear();
            }
        });

        this.playerProjectiles.forEach(p => {
            p.update(deltaTime, this.platforms);
            this.enemies.forEach(e => {
                if (checkCollision(p.getHitbox(), e.getHitbox())) {
                    const damage = p.damage || 1;
                    const enemyDied = e.takeDamage(damage, p);
                    if (enemyDied) {
                        this.addSpecialCharge(1);
                    }
                    p.destroy();
                }
            });
        });

        this.enemyProjectiles.forEach(p => {
            p.update(deltaTime, this.platforms);
            if (checkCollision(this.player.getHitbox(), p.getHitbox())) {
                this.player.takeDamage(1);
                p.destroy();
            }
        });

        this.pickupItems.forEach(i => {
            if (checkCollision(this.player.getHitbox(), i.getHitbox())) {
                if (i instanceof PointsPickup) {
                    this.addPoints(i.pointsValue, 'pickup');
                    i.destroy();
                } else {
                    this.player.collectWeapon(i.weaponKey);
                    i.destroy();
                }
            }
        });

        this.enemies = this.enemies.filter(e => !e.isMarkedForDeletion);
        this.playerProjectiles = this.playerProjectiles.filter(p => !p.isMarkedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.isMarkedForDeletion);
        this.pickupItems = this.pickupItems.filter(i => !i.isMarkedForDeletion);
        
        if (this.transitionSystem) {
        this.transitionSystem.update(deltaTime);
    }
    }

draw() {
    if (this.isGameOver) return;

    const targetWorldX = -this.player.x + CONFIG.GAME_WIDTH / 4;
    this.worldX += (targetWorldX - this.worldX) * CONFIG.CAMERA_SMOOTHING;

    const minX = -6400 + CONFIG.GAME_WIDTH;
    const maxX = 50;
    this.worldX = Math.max(minX, Math.min(maxX, this.worldX));

    // Aplica offset vertical e horizontal
    this.gameWorld.style.transform = `translate3d(${this.worldX}px, ${this.cameraOffsetY}px, 0)`;

    // Atualiza elementos parallax (apenas background, não o chão)
// Atualiza elementos parallax com offsets
requestAnimationFrame(() => {
    const sky = document.getElementById('sky-background');
    // Removido ground e foreground desta seção
    
    // Apenas o céu tem parallax lento
    if (sky) {
        sky.style.transform = `translate3d(${this.worldX * 0.1}px, ${this.cameraOffsetY * 0.2}px, 0)`;
    }
});

    this.player.draw();
    if (this.boss) this.boss.draw();
    this.enemies.forEach(e => e.draw());
    this.playerProjectiles.forEach(p => p.draw());
    this.enemyProjectiles.forEach(p => p.draw());
    this.pickupItems.forEach(i => i.draw());
        if (this.transitionSystem) {
        this.transitionSystem.draw();
    }
}

    drawDebug() {
        if (!CONFIG.DEBUG_MODE) return;

        document.querySelectorAll('.debug-hitbox').forEach(el => el.remove());

        const drawBox = (hitbox, color, isFixed = false) => {
            if (!hitbox) return;

            const box = document.createElement('div');
            box.className = 'debug-hitbox';
            const container = isFixed ? document.getElementById('game-container') : this.gameWorld;

            Object.assign(box.style, {
                position: 'absolute',
                left: `${hitbox.x}px`,
                bottom: `${hitbox.y}px`,
                width: `${hitbox.width}px`,
                height: `${hitbox.height}px`,
                border: `2px solid ${color}`,
                zIndex: '9999'
            });

            container.appendChild(box);
        };

        drawBox(this.player.getHitbox(), 'cyan');
        drawBox(this.player.getAttackHitbox(), 'red');
        drawBox(this.player.getDefenseHitbox(), 'yellow');
        drawBox(this.boss?.getHitbox(), 'purple');

        const groundCheckHitbox = {
            x: this.player.x + this.player.width * 0.4,
            y: this.player.y - 5,
            width: this.player.width * 0.2,
            height: 1
        };

        drawBox(groundCheckHitbox, this.player.isGrounded ? 'lime' : 'orange');
        this.enemies.forEach(e => drawBox(e.getHitbox(), 'magenta'));
        this.playerProjectiles.forEach(p => drawBox(p.getHitbox(), 'lime'));
        this.enemyProjectiles.forEach(p => drawBox(p.getHitbox(), 'yellow'));
        this.pickupItems.forEach(i => drawBox(i.getHitbox(), 'white'));

        const chao = this.platforms[0];
        if (chao) {
            const groundBox = document.createElement('div');
            groundBox.className = 'debug-hitbox';
            Object.assign(groundBox.style, {
                position: 'absolute',
                left: `${chao.x}px`,
                bottom: `${chao.y}px`,
                width: `${chao.width}px`,
                height: `${chao.height + 5}px`,
                border: '2px solid lime',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                zIndex: '27'
            });
            this.gameWorld.appendChild(groundBox);
        }
        
        // Debug da câmera
        const cameraBox = document.createElement('div');
        cameraBox.className = 'debug-hitbox';
        Object.assign(cameraBox.style, {
            position: 'absolute',
            left: '50%',
            bottom: `${this.cameraOffsetY}px`,
            width: '200px',
            height: '5px',
            border: '2px solid cyan',
            backgroundColor: 'rgba(0, 255, 255, 0.3)',
            transform: 'translateX(-50%)',
            zIndex: '9998'
        });
        this.gameWorld.appendChild(cameraBox);
    }

    gameOver() {
        this.isGameOver = true;
        
        // Remove elementos de vida
        const livesDisplay = document.querySelector('.lives-display');
        if (livesDisplay) livesDisplay.remove();
        
        const gameOverScreen = document.createElement('div');
        gameOverScreen.className = 'game-over-screen';
        gameOverScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        gameOverScreen.innerHTML = `
            <h1 style="font-size: 48px; color: #ff5555; margin-bottom: 20px;">GAME OVER</h1>
            <p style="font-size: 24px; margin-bottom: 10px;">Vidas esgotadas!</p>
            <p style="font-size: 20px; margin-bottom: 30px;">Pontuação final: ${this.totalPoints}</p>
            <button id="restart-btn" style="
                padding: 15px 30px;
                font-size: 20px;
                background: #ff5555;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: transform 0.3s;
            ">REINICIAR JOGO</button>
        `;
        
        document.getElementById('game-container').appendChild(gameOverScreen);
        
        // Botão de reiniciar
        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload(); // Recarrega a página para reiniciar
        });
    }

    loop(currentTime) {
        requestAnimationFrame(this.loop);

        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        const clampedDelta = Math.min(deltaTime, 100);
        accumulator += clampedDelta;

        while (accumulator >= frameInterval) {
            this.update(frameInterval);
            accumulator -= frameInterval;
        }

        this.draw();
        if (CONFIG.DEBUG_MODE) {
            this.drawDebug();
        }
    }

    start() {
        this.ui.game = this; 
        this.ui.updateHealth(this.player.health);
        this.ui.updateSpecial(this.specialCharge);
        this.ui.updateWeapons(this.player);
        this.spawnRandomEnemy();
        this.boss = new Boss(5300, 0, this);
        this.gameWorld.appendChild(this.boss.element);
        this.updateLivesDisplay();
        
        this.loop(0);
    }
}

    // Iniciar o jogo
    const game = new Game();
    game.start();
    window.gameInstance = game; 
    window.game = game;
});
