/**
 * main.js
 * Main game entry point and game loop
 */

class Game {
    constructor() {
        // Core systems
        this.stateManager = new GameStateManager();
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager();

        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Game systems
        this.levelBuilder = null;
        this.player = null;
        this.stealthSystem = null;
        this.weaponSystem = null;

        // Entities
        this.enemies = [];
        this.target = null;

        // Level data
        this.levelData = null;

        // Timing
        this.clock = new THREE.Clock();
        this.lastTime = 0;

        // Bind methods
        this.update = this.update.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize the game
     */
    async init() {
        console.log('Initializing game...');

        // Setup Three.js
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();

        // Start loading
        this.stateManager.forceState(GameState.LOADING);
        await this.loadAssets();

        // Setup game systems
        this.setupLevel();
        this.setupPlayer();
        this.setupEnemies();
        this.setupSystems();

        // Setup event listeners
        this.setupEventListeners();

        // Ready to play
        this.stateManager.forceState(GameState.MENU);
        this.uiManager.showStartButton();

        // Start game loop
        this.update();

        console.log('Game initialized');
    }

    /**
     * Setup WebGL renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }

    /**
     * Setup camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
        this.camera.position.set(0, 5, 10);
    }

    /**
     * Setup scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
    }

    /**
     * Load game assets (simulated)
     */
    async loadAssets() {
        const steps = [
            { progress: 0.1, text: 'Initializing audio...' },
            { progress: 0.3, text: 'Loading level geometry...' },
            { progress: 0.5, text: 'Setting up lighting...' },
            { progress: 0.7, text: 'Spawning entities...' },
            { progress: 0.9, text: 'Finalizing...' },
            { progress: 1.0, text: 'Ready' }
        ];

        for (const step of steps) {
            this.uiManager.updateLoading(step.progress, step.text);
            await this.delay(200);
        }

        // Initialize audio
        await this.audioManager.init();
    }

    /**
     * Setup level
     */
    setupLevel() {
        this.levelBuilder = new LevelBuilder(this.scene);
        this.levelData = this.levelBuilder.build();
    }

    /**
     * Setup player
     */
    setupPlayer() {
        this.player = new PlayerController(
            this.scene,
            this.camera,
            this.levelData.colliders
        );

        // Set spawn position
        this.player.position.copy(this.levelData.spawnPoints.player);
        this.player.playerGroup.position.copy(this.player.position);
    }

    /**
     * Setup enemies
     */
    setupEnemies() {
        this.enemies = [];

        // Create guards from spawn points
        for (const spawnPoint of this.levelData.spawnPoints.guards) {
            const enemy = new EnemyAI(
                this.scene,
                spawnPoint.pos,
                spawnPoint.patrol,
                false
            );
            this.enemies.push(enemy);
        }

        // Create target
        this.target = new EnemyAI(
            this.scene,
            this.levelData.spawnPoints.target,
            this.levelBuilder.createPatrolRoute('office'),
            true
        );
        this.enemies.push(this.target);

        console.log(`Spawned ${this.enemies.length} enemies (including target)`);
    }

    /**
     * Setup game systems
     */
    setupSystems() {
        // Stealth system
        this.stealthSystem = new StealthSystem(this.scene, this.levelBuilder);

        // Create vision cones for all enemies
        for (const enemy of this.enemies) {
            this.stealthSystem.createVisionCone(enemy);
        }

        // Weapon system
        this.weaponSystem = new WeaponSystem(
            this.scene,
            this.player,
            this.audioManager
        );
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize);

        // Start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startGame();
            });
        }

        // State change listener
        this.stateManager.addListener((newState, oldState) => {
            this.onStateChange(newState, oldState);
        });
    }

    /**
     * Start the game
     */
    startGame() {
        this.audioManager.resume();
        this.audioManager.startAmbient();
        this.stateManager.setState(GameState.PLAYING);
        this.uiManager.hideStartScreen();
        this.uiManager.showHUD();
        this.uiManager.updateObjective('Eliminate the target');
    }

    /**
     * Handle state changes
     */
    onStateChange(newState, oldState) {
        console.log(`State changed: ${oldState} -> ${newState}`);

        switch (newState) {
            case GameState.PLAYING:
                document.body.style.cursor = 'none';
                break;

            case GameState.TARGET_ELIMINATED:
                this.uiManager.updateObjective('Escape the compound');
                this.uiManager.showNotification('TARGET ELIMINATED', 3000);
                this.uiManager.flashObjective();
                break;

            case GameState.ESCAPE:
                this.uiManager.updateObjective('Reach the exit point');
                break;

            case GameState.MISSION_COMPLETE:
                this.completeMission();
                break;

            case GameState.GAME_OVER:
                this.gameOver();
                break;
        }
    }

    /**
     * Main game loop
     */
    update() {
        requestAnimationFrame(this.update);

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        // Update based on state
        if (this.stateManager.isPlaying()) {
            this.updateGame(deltaTime);
        }

        // Always update UI
        this.uiManager.update(deltaTime);

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update game logic
     */
    updateGame(deltaTime) {
        // Update player
        this.player.update(deltaTime, this.audioManager);

        // Update weapon system
        this.weaponSystem.update(deltaTime);

        // Update enemies
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(
                    deltaTime,
                    this.player,
                    this.stealthSystem,
                    this.audioManager,
                    this.levelData.colliders
                );
            }
        }

        // Update stealth system
        const globalAlert = this.stealthSystem.updateGlobalAlert(this.enemies);
        const detectionMeter = this.stealthSystem.getDetectionMeter(this.enemies);

        // Track detection for stats
        if (globalAlert === AlertState.COMBAT) {
            if (!this._wasInCombat) {
                this.stateManager.incrementStat('timesDetected');
                this._wasInCombat = true;
            }
        } else if (globalAlert === AlertState.IDLE) {
            this._wasInCombat = false;
        }

        // Update UI
        this.uiManager.updateDetection(detectionMeter, globalAlert);
        this.uiManager.updateAlertStatus(globalAlert);
        this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
        this.uiManager.updateWeapon(this.weaponSystem.getDisplayInfo());
        this.uiManager.updateMinimap(this.player, this.enemies, this.levelData);

        // Check game conditions
        this.checkGameConditions();

        // Update stats
        this.stateManager.stateData.shotsFired = this.weaponSystem.getShotsFired();
    }

    /**
     * Check win/lose conditions
     */
    checkGameConditions() {
        // Check player death
        if (!this.player.isAlive) {
            this.audioManager.playDeath();
            this.stateManager.forceState(GameState.GAME_OVER);
            return;
        }

        // Check target elimination
        if (this.target && !this.target.isAlive) {
            if (this.stateManager.isState(GameState.PLAYING)) {
                // Determine if kill was silent
                const wasSilent = this.stealthSystem.globalAlertState !== AlertState.COMBAT;
                this.stateManager.setState(GameState.TARGET_ELIMINATED, { silent: wasSilent });
                this.stateManager.incrementStat('enemiesKilled');
            }
        }

        // Check escape
        if (this.stateManager.isState(GameState.TARGET_ELIMINATED) || 
            this.stateManager.isState(GameState.ESCAPE)) {
            
            if (this.levelBuilder.isInEscapeZone(this.player.position)) {
                if (this.stateManager.isState(GameState.TARGET_ELIMINATED)) {
                    this.stateManager.setState(GameState.ESCAPE);
                }
                // Small delay then complete
                if (this.stateManager.isState(GameState.ESCAPE)) {
                    this.stateManager.forceState(GameState.MISSION_COMPLETE);
                }
            }
        }

        // Track enemy kills
        for (const enemy of this.enemies) {
            if (!enemy.isAlive && !enemy._countedKill && !enemy.isTarget) {
                enemy._countedKill = true;
                this.stateManager.incrementStat('enemiesKilled');
            }
        }
    }

    /**
     * Complete the mission
     */
    completeMission() {
        document.body.style.cursor = 'default';
        document.exitPointerLock();

        this.audioManager.stopAmbient();
        this.audioManager.playMissionComplete();

        const stats = this.stateManager.getStats();
        const rating = this.stateManager.getRating();

        this.uiManager.showMissionComplete(stats, rating);
    }

    /**
     * Game over
     */
    gameOver() {
        document.body.style.cursor = 'default';
        document.exitPointerLock();

        this.audioManager.stopAmbient();
        this.uiManager.showGameOver();
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Utility: delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);

        // Cleanup systems
        this.stealthSystem.cleanup();
        this.weaponSystem.cleanup();

        // Cleanup enemies
        for (const enemy of this.enemies) {
            enemy.cleanup();
        }

        // Dispose renderer
        this.renderer.dispose();

        // Clear scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

// Export
window.Game = Game;
