/**
 * WeaponSystem.js
 * Handles weapons, shooting, and damage
 */

class WeaponSystem {
    constructor(scene, player, audioManager) {
        this.scene = scene;
        this.player = player;
        this.audioManager = audioManager;

        // Weapons inventory
        this.weapons = [
            {
                name: 'Silenced Pistol',
                damage: 35,
                headshotMultiplier: 3,
                fireRate: 0.3,
                magSize: 12,
                reserveAmmo: 48,
                currentAmmo: 12,
                suppressed: true,
                reloadTime: 1.5,
                spread: 0.02,
                range: 50
            },
            {
                name: 'Pistol',
                damage: 45,
                headshotMultiplier: 2.5,
                fireRate: 0.2,
                magSize: 15,
                reserveAmmo: 60,
                currentAmmo: 15,
                suppressed: false,
                reloadTime: 1.2,
                spread: 0.03,
                range: 40
            }
        ];

        this.currentWeaponIndex = 0;
        this.fireCooldown = 0;
        this.isReloading = false;
        this.reloadProgress = 0;

        // Raycaster for shooting
        this.raycaster = new THREE.Raycaster();

        // Visual effects
        this.muzzleFlashes = [];
        this.bulletTrails = [];
        this.impactMarkers = [];

        // Stats
        this.shotsFired = 0;

        // Input handling
        this.setupInput();
    }

    /**
     * Setup input handlers
     */
    setupInput() {
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && window.game && window.game.stateManager.isPlaying()) {
                this.shoot();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!window.game || !window.game.stateManager.isPlaying()) return;

            switch (e.code) {
                case 'Digit1':
                    this.switchWeapon(0);
                    break;
                case 'Digit2':
                    this.switchWeapon(1);
                    break;
                case 'KeyR':
                    this.reload();
                    break;
            }
        });
    }

    /**
     * Get current weapon
     */
    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }

    /**
     * Switch weapon
     */
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && index !== this.currentWeaponIndex) {
            this.currentWeaponIndex = index;
            this.isReloading = false;
            this.reloadProgress = 0;

            if (this.audioManager) {
                this.audioManager.playUIClick();
            }
        }
    }

    /**
     * Shoot the current weapon
     */
    shoot() {
        if (!this.player.isAlive) return;
        if (this.fireCooldown > 0) return;
        if (this.isReloading) return;

        const weapon = this.getCurrentWeapon();

        // Check ammo
        if (weapon.currentAmmo <= 0) {
            if (this.audioManager) {
                this.audioManager.playEmptyClick();
            }
            // Auto reload
            this.reload();
            return;
        }

        // Fire
        weapon.currentAmmo--;
        this.fireCooldown = weapon.fireRate;
        this.shotsFired++;

        // Play sound
        if (this.audioManager) {
            this.audioManager.playGunshot(weapon.suppressed);
        }

        // Register sound for stealth system
        if (window.game && window.game.stealthSystem) {
            const loudness = weapon.suppressed ? 0.3 : 1.0;
            window.game.stealthSystem.registerSound(
                this.player.position,
                loudness,
                'gunshot'
            );
        }

        // Create muzzle flash
        this.createMuzzleFlash();

        // Raycast for hit detection
        const hit = this.performRaycast(weapon);

        // Camera recoil
        this.player.rotation.x += 0.02 + Math.random() * 0.01;
        this.player.cameraShake = 0.3;

        return hit;
    }

    /**
     * Perform raycast and check for hits
     */
    performRaycast(weapon) {
        const origin = this.player.getShootPosition();
        const direction = this.player.getAimDirection();

        // Add spread
        direction.x += (Math.random() - 0.5) * weapon.spread;
        direction.y += (Math.random() - 0.5) * weapon.spread;
        direction.z += (Math.random() - 0.5) * weapon.spread;
        direction.normalize();

        this.raycaster.set(origin, direction);
        this.raycaster.far = weapon.range;

        // Get all objects to check
        const objects = [];
        this.scene.traverse((obj) => {
            if (obj.isMesh) {
                objects.push(obj);
            }
        });

        const intersects = this.raycaster.intersectObjects(objects, false);

        if (intersects.length > 0) {
            const hit = intersects[0];

            // Create bullet trail
            this.createBulletTrail(origin, hit.point);

            // Check if hit an enemy
            if (hit.object.userData.isEnemy) {
                return this.handleEnemyHit(hit, weapon);
            } else {
                // Hit environment
                this.createImpactEffect(hit.point, hit.face.normal);
            }
        } else {
            // No hit - create trail to max range
            const endPoint = origin.clone().add(direction.multiplyScalar(weapon.range));
            this.createBulletTrail(origin, endPoint);
        }

        return null;
    }

    /**
     * Handle hitting an enemy
     */
    handleEnemyHit(hit, weapon) {
        const enemyId = hit.object.userData.enemyId;
        const isHeadshot = hit.object.userData.isHead;

        // Find enemy in game
        if (window.game && window.game.enemies) {
            const enemy = window.game.enemies.find(e => e.id === enemyId);
            if (enemy) {
                const damage = isHeadshot ? 
                    weapon.damage * weapon.headshotMultiplier : 
                    weapon.damage;

                const killed = enemy.takeDamage(damage, isHeadshot);

                // Play hit sound
                if (this.audioManager) {
                    this.audioManager.playHit(isHeadshot);
                }

                // Create blood effect
                this.createBloodEffect(hit.point);

                return {
                    enemy,
                    killed,
                    isHeadshot,
                    damage
                };
            }
        }

        return null;
    }

    /**
     * Reload current weapon
     */
    reload() {
        const weapon = this.getCurrentWeapon();

        if (this.isReloading) return;
        if (weapon.currentAmmo === weapon.magSize) return;
        if (weapon.reserveAmmo <= 0) return;

        this.isReloading = true;
        this.reloadProgress = 0;

        if (this.audioManager) {
            this.audioManager.playReload();
        }
    }

    /**
     * Update weapon system
     */
    update(deltaTime) {
        // Update fire cooldown
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime;
        }

        // Update reload
        if (this.isReloading) {
            const weapon = this.getCurrentWeapon();
            this.reloadProgress += deltaTime / weapon.reloadTime;

            if (this.reloadProgress >= 1) {
                // Complete reload
                const ammoNeeded = weapon.magSize - weapon.currentAmmo;
                const ammoToAdd = Math.min(ammoNeeded, weapon.reserveAmmo);

                weapon.currentAmmo += ammoToAdd;
                weapon.reserveAmmo -= ammoToAdd;

                this.isReloading = false;
                this.reloadProgress = 0;
            }
        }

        // Clean up effects
        this.updateEffects(deltaTime);
    }

    /**
     * Create muzzle flash effect
     */
    createMuzzleFlash() {
        const flashGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);

        const pos = this.player.getShootPosition();
        const dir = this.player.getAimDirection();
        pos.add(dir.multiplyScalar(0.3));

        flash.position.copy(pos);
        this.scene.add(flash);

        this.muzzleFlashes.push({
            mesh: flash,
            life: 0.05
        });

        // Point light for flash
        const light = new THREE.PointLight(0xffaa00, 2, 5);
        light.position.copy(pos);
        this.scene.add(light);

        setTimeout(() => {
            this.scene.remove(light);
        }, 50);
    }

    /**
     * Create bullet trail
     */
    createBulletTrail(start, end) {
        const points = [start.clone(), end.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xffff88,
            transparent: true,
            opacity: 0.6
        });

        const trail = new THREE.Line(geometry, material);
        this.scene.add(trail);

        this.bulletTrails.push({
            mesh: trail,
            life: 0.1
        });
    }

    /**
     * Create impact effect on environment
     */
    createImpactEffect(position, normal) {
        // Spark particles
        const sparkCount = 5;
        for (let i = 0; i < sparkCount; i++) {
            const sparkGeo = new THREE.SphereGeometry(0.02, 4, 4);
            const sparkMat = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 1
            });
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            spark.position.copy(position);

            // Random velocity based on normal
            const velocity = new THREE.Vector3(
                normal.x + (Math.random() - 0.5) * 2,
                normal.y + (Math.random() - 0.5) * 2 + 0.5,
                normal.z + (Math.random() - 0.5) * 2
            ).multiplyScalar(2);

            this.scene.add(spark);
            this.impactMarkers.push({
                mesh: spark,
                velocity,
                life: 0.3
            });
        }

        // Impact mark (decal)
        const markGeo = new THREE.PlaneGeometry(0.1, 0.1);
        const markMat = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.copy(position);
        mark.position.add(normal.multiplyScalar(0.01));
        mark.lookAt(position.clone().add(normal));
        this.scene.add(mark);

        // Fade out over time
        setTimeout(() => {
            const fadeOut = () => {
                mark.material.opacity -= 0.02;
                if (mark.material.opacity > 0) {
                    requestAnimationFrame(fadeOut);
                } else {
                    this.scene.remove(mark);
                }
            };
            fadeOut();
        }, 5000);
    }

    /**
     * Create blood effect
     */
    createBloodEffect(position) {
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.03, 4, 4);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0x880000,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(position);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2,
                (Math.random() - 0.5) * 3
            );

            this.scene.add(particle);
            this.impactMarkers.push({
                mesh: particle,
                velocity,
                life: 0.5,
                gravity: true
            });
        }
    }

    /**
     * Update visual effects
     */
    updateEffects(deltaTime) {
        // Update muzzle flashes
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            flash.life -= deltaTime;
            flash.mesh.material.opacity = flash.life / 0.05;
            flash.mesh.scale.multiplyScalar(1.2);

            if (flash.life <= 0) {
                this.scene.remove(flash.mesh);
                this.muzzleFlashes.splice(i, 1);
            }
        }

        // Update bullet trails
        for (let i = this.bulletTrails.length - 1; i >= 0; i--) {
            const trail = this.bulletTrails[i];
            trail.life -= deltaTime;
            trail.mesh.material.opacity = trail.life / 0.1;

            if (trail.life <= 0) {
                this.scene.remove(trail.mesh);
                this.bulletTrails.splice(i, 1);
            }
        }

        // Update impact particles
        for (let i = this.impactMarkers.length - 1; i >= 0; i--) {
            const particle = this.impactMarkers[i];
            particle.life -= deltaTime;

            // Apply velocity
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );

            // Apply gravity
            if (particle.gravity) {
                particle.velocity.y -= 9.8 * deltaTime;
            }

            // Fade out
            particle.mesh.material.opacity = particle.life / 0.5;

            if (particle.life <= 0) {
                this.scene.remove(particle.mesh);
                this.impactMarkers.splice(i, 1);
            }
        }
    }

    /**
     * Get weapon display info
     */
    getDisplayInfo() {
        const weapon = this.getCurrentWeapon();
        return {
            name: weapon.name,
            currentAmmo: weapon.currentAmmo,
            reserveAmmo: weapon.reserveAmmo,
            isReloading: this.isReloading,
            reloadProgress: this.reloadProgress
        };
    }

    /**
     * Add ammo to current weapon
     */
    addAmmo(amount) {
        const weapon = this.getCurrentWeapon();
        weapon.reserveAmmo += amount;
    }

    /**
     * Get total shots fired
     */
    getShotsFired() {
        return this.shotsFired;
    }

    /**
     * Clean up
     */
    cleanup() {
        // Remove all effects
        this.muzzleFlashes.forEach(f => this.scene.remove(f.mesh));
        this.bulletTrails.forEach(t => this.scene.remove(t.mesh));
        this.impactMarkers.forEach(m => this.scene.remove(m.mesh));

        this.muzzleFlashes = [];
        this.bulletTrails = [];
        this.impactMarkers = [];
    }
}

// Export
window.WeaponSystem = WeaponSystem;
