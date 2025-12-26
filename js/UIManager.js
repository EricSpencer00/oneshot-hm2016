/**
 * UIManager.js
 * Manages all UI elements and HUD updates
 */

class UIManager {
    constructor() {
        // Cache DOM elements
        this.elements = {
            // Detection
            detectionContainer: document.getElementById('detection-container'),
            detectionFill: document.getElementById('detection-fill'),
            detectionLabel: document.getElementById('detection-label'),

            // Health
            healthFill: document.getElementById('health-fill'),

            // Weapon
            weaponName: document.getElementById('weapon-name'),
            ammoCurrent: document.querySelector('#ammo-display .current'),
            ammoReserve: document.querySelector('#ammo-display .reserve'),

            // Objective
            objectiveText: document.getElementById('objective-text'),

            // Alert status
            alertStatus: document.getElementById('alert-status'),

            // Damage overlay
            damageOverlay: document.getElementById('damage-overlay'),

            // Screens
            screenOverlay: document.getElementById('screen-overlay'),
            startButton: document.getElementById('start-button'),
            loadingBar: document.getElementById('loading-bar'),
            loadingText: document.getElementById('loading-text'),
            missionComplete: document.getElementById('mission-complete'),
            gameOver: document.getElementById('game-over'),

            // Stats
            statTime: document.getElementById('stat-time'),
            statKills: document.getElementById('stat-kills'),
            statShots: document.getElementById('stat-shots'),
            statDetected: document.getElementById('stat-detected'),

            // Crosshair
            crosshair: document.getElementById('crosshair'),

            // HUD
            hud: document.getElementById('hud'),

            // Minimap
            minimapCanvas: document.getElementById('minimap-canvas'),

            // Interaction
            interactionPrompt: document.getElementById('interaction-prompt')
        };

        // Minimap setup
        this.setupMinimap();

        // Animation state
        this.damageFlashTimer = 0;
        this.lastHealth = 100;
    }

    /**
     * Setup minimap canvas
     */
    setupMinimap() {
        if (this.elements.minimapCanvas) {
            this.minimapCtx = this.elements.minimapCanvas.getContext('2d');
            this.elements.minimapCanvas.width = 150;
            this.elements.minimapCanvas.height = 150;
        }
    }

    /**
     * Update loading progress
     */
    updateLoading(progress, text = 'Loading...') {
        if (this.elements.loadingBar) {
            this.elements.loadingBar.style.width = `${progress * 100}%`;
        }
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
    }

    /**
     * Show start button
     */
    showStartButton() {
        if (this.elements.loadingText) {
            this.elements.loadingText.style.display = 'none';
        }
        if (this.elements.startButton) {
            this.elements.startButton.style.display = 'block';
        }
    }

    /**
     * Hide start screen
     */
    hideStartScreen() {
        if (this.elements.screenOverlay) {
            this.elements.screenOverlay.classList.add('hidden');
        }
    }

    /**
     * Show HUD
     */
    showHUD() {
        if (this.elements.hud) {
            this.elements.hud.style.display = 'block';
        }
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'block';
        }
    }

    /**
     * Hide HUD
     */
    hideHUD() {
        if (this.elements.hud) {
            this.elements.hud.style.display = 'none';
        }
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = 'none';
        }
    }

    /**
     * Update detection meter
     */
    updateDetection(value, alertState) {
        // Show/hide detection container
        if (value > 0.05) {
            this.elements.detectionContainer.classList.add('visible');
        } else {
            this.elements.detectionContainer.classList.remove('visible');
        }

        // Update fill
        this.elements.detectionFill.style.width = `${value * 100}%`;

        // Update color based on alert state
        switch (alertState) {
            case AlertState.SUSPICIOUS:
                this.elements.detectionFill.style.background = 
                    'linear-gradient(90deg, #ffcc00, #ff8800)';
                this.elements.detectionLabel.textContent = 'SUSPICIOUS';
                break;
            case AlertState.ALERTED:
                this.elements.detectionFill.style.background = 
                    'linear-gradient(90deg, #ff8800, #ff4400)';
                this.elements.detectionLabel.textContent = 'ALERTED';
                break;
            case AlertState.COMBAT:
                this.elements.detectionFill.style.background = 
                    'linear-gradient(90deg, #ff4400, #ff0000)';
                this.elements.detectionLabel.textContent = 'COMBAT';
                break;
            default:
                this.elements.detectionFill.style.background = 
                    'linear-gradient(90deg, #ff6b00, #ff0000)';
                this.elements.detectionLabel.textContent = 'DETECTED';
        }
    }

    /**
     * Update health bar
     */
    updateHealth(current, max) {
        const percentage = (current / max) * 100;
        this.elements.healthFill.style.width = `${percentage}%`;

        // Change color when low
        if (percentage <= 25) {
            this.elements.healthFill.classList.add('low');
        } else {
            this.elements.healthFill.classList.remove('low');
        }

        // Flash damage overlay when taking damage
        if (current < this.lastHealth) {
            this.showDamageOverlay();
        }
        this.lastHealth = current;
    }

    /**
     * Show damage overlay
     */
    showDamageOverlay() {
        this.elements.damageOverlay.style.opacity = '0.6';
        this.damageFlashTimer = 0.3;
    }

    /**
     * Update weapon display
     */
    updateWeapon(info) {
        this.elements.weaponName.textContent = info.name;
        this.elements.ammoCurrent.textContent = info.currentAmmo;
        this.elements.ammoReserve.textContent = info.reserveAmmo;

        // Show reload progress
        if (info.isReloading) {
            this.elements.weaponName.textContent = `${info.name} (Reloading...)`;
        }
    }

    /**
     * Update objective text
     */
    updateObjective(text) {
        this.elements.objectiveText.textContent = text;
    }

    /**
     * Update alert status indicator
     */
    updateAlertStatus(state) {
        const el = this.elements.alertStatus;

        // Remove all classes
        el.classList.remove('visible', 'suspicious', 'alerted', 'combat');

        if (state === AlertState.IDLE) {
            return;
        }

        el.classList.add('visible');

        switch (state) {
            case AlertState.SUSPICIOUS:
                el.classList.add('suspicious');
                el.textContent = 'SUSPICIOUS';
                break;
            case AlertState.ALERTED:
                el.classList.add('alerted');
                el.textContent = 'ALERTED';
                break;
            case AlertState.COMBAT:
                el.classList.add('combat');
                el.textContent = 'COMBAT';
                break;
        }
    }

    /**
     * Update minimap
     */
    updateMinimap(player, enemies, levelData) {
        if (!this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const width = 150;
        const height = 150;
        const scale = 2.5; // How many units per pixel
        const centerX = width / 2;
        const centerY = height / 2;

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        // Draw level bounds
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(5, 5, width - 10, height - 10);

        // Convert world position to minimap position
        const toMinimap = (worldPos) => {
            return {
                x: centerX + (worldPos.x - player.position.x) / scale,
                y: centerY + (worldPos.z - player.position.z) / scale
            };
        };

        // Draw escape zone
        if (levelData.escapeZone) {
            const ez = levelData.escapeZone;
            const ezCenter = toMinimap({
                x: (ez.min.x + ez.max.x) / 2,
                z: (ez.min.z + ez.max.z) / 2
            });
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(
                ezCenter.x - 10,
                ezCenter.y - 5,
                20, 10
            );
        }

        // Draw enemies
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const pos = toMinimap(enemy.position);

            // Skip if outside minimap
            if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) continue;

            // Color based on state
            let color = '#00ff00';
            if (enemy.alertState === AlertState.SUSPICIOUS) color = '#ffff00';
            if (enemy.alertState === AlertState.ALERTED) color = '#ff8800';
            if (enemy.alertState === AlertState.COMBAT) color = '#ff0000';
            if (enemy.isTarget) color = '#ff00ff';

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, enemy.isTarget ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw facing direction
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(
                pos.x - Math.sin(enemy.rotation) * 8,
                pos.y - Math.cos(enemy.rotation) * 8
            );
            ctx.stroke();
        }

        // Draw player (always centered)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Player facing direction
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX - Math.sin(player.rotation.y) * 10,
            centerY - Math.cos(player.rotation.y) * 10
        );
        ctx.stroke();

        // Draw field of view
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const fovAngle = Math.PI / 4;
        ctx.lineTo(
            centerX - Math.sin(player.rotation.y - fovAngle) * 30,
            centerY - Math.cos(player.rotation.y - fovAngle) * 30
        );
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX - Math.sin(player.rotation.y + fovAngle) * 30,
            centerY - Math.cos(player.rotation.y + fovAngle) * 30
        );
        ctx.stroke();
    }

    /**
     * Show mission complete screen
     */
    showMissionComplete(stats, rating) {
        this.hideHUD();

        this.elements.statTime.textContent = stats.time;
        this.elements.statKills.textContent = stats.enemiesKilled;
        this.elements.statShots.textContent = stats.shotsFired;
        this.elements.statDetected.textContent = stats.timesDetected;

        // Update rating
        const ratingEl = this.elements.missionComplete.querySelector('.rating');
        if (ratingEl) {
            ratingEl.textContent = rating;
        }

        this.elements.missionComplete.classList.add('visible');
    }

    /**
     * Show game over screen
     */
    showGameOver() {
        this.hideHUD();
        this.elements.gameOver.classList.add('visible');
    }

    /**
     * Show interaction prompt
     */
    showInteraction(text) {
        const actionSpan = this.elements.interactionPrompt.querySelector('.action');
        if (actionSpan) {
            actionSpan.textContent = text;
        }
        this.elements.interactionPrompt.classList.add('visible');
    }

    /**
     * Hide interaction prompt
     */
    hideInteraction() {
        this.elements.interactionPrompt.classList.remove('visible');
    }

    /**
     * Update frame (called every frame)
     */
    update(deltaTime) {
        // Update damage overlay fade
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            this.elements.damageOverlay.style.opacity = 
                Math.max(0, this.damageFlashTimer / 0.3 * 0.6);
        }
    }

    /**
     * Update crosshair style
     */
    updateCrosshair(isAiming, isShooting) {
        const crosshair = this.elements.crosshair;

        if (isShooting) {
            crosshair.style.transform = 'translate(-50%, -50%) scale(1.3)';
        } else if (isAiming) {
            crosshair.style.transform = 'translate(-50%, -50%) scale(0.8)';
        } else {
            crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
        }
    }

    /**
     * Flash objective for attention
     */
    flashObjective() {
        const container = this.elements.objectiveText.parentElement;
        container.style.animation = 'none';
        container.offsetHeight; // Trigger reflow
        container.style.animation = 'pulse 0.5s ease 3';
    }

    /**
     * Show notification message
     */
    showNotification(message, duration = 3000) {
        // Create notification element
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 16px;
            letter-spacing: 2px;
            text-transform: uppercase;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);

        // Animate in
        requestAnimationFrame(() => {
            notif.style.opacity = '1';
        });

        // Remove after duration
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notif);
            }, 300);
        }, duration);
    }
}

// Export
window.UIManager = UIManager;
