/**
 * EnemyAI.js
 * Handles enemy behavior, patrol, and combat
 */

let enemyIdCounter = 0;

class EnemyAI {
    constructor(scene, position, patrol, isTarget = false) {
        this.scene = scene;
        this.id = ++enemyIdCounter;
        this.isTarget = isTarget;

        // Position and movement
        this.position = position.clone();
        this.rotation = 0;
        this.velocity = new THREE.Vector3();

        // Patrol
        this.patrolRoute = patrol || [];
        this.currentPatrolIndex = 0;
        this.patrolWaitTime = 0;
        this.patrolWaitDuration = 2;

        // Detection
        this.detectionRange = isTarget ? 8 : 12;
        this.detectionAngle = Math.PI / 3;
        this.alertLevel = 0;
        this.alertState = AlertState.IDLE;
        this.alertDecayRate = 0.15;

        // Combat
        this.health = isTarget ? 50 : 100;
        this.maxHealth = this.health;
        this.isAlive = true;
        this.shootCooldown = 0;
        this.shootInterval = 0.8;
        this.shootRange = 20;
        this.damage = 10;
        this.accuracy = 0.7;

        // AI State
        this.lastKnownPlayerPos = null;
        this.investigateTime = 0;
        this.investigateDuration = 5;
        this.lostPlayerTime = 0;
        this.searchTime = 0;

        // Movement
        this.walkSpeed = 2;
        this.runSpeed = 5;
        this.turnSpeed = 3;

        // Cover
        this.inCover = false;
        this.coverPosition = null;
        this.coverTime = 0;

        // Create mesh
        this.createMesh();
    }

    /**
     * Create enemy mesh
     */
    createMesh() {
        this.group = new THREE.Group();

        // Different appearance for target
        const bodyColor = this.isTarget ? 0x4a0000 : 0x2a3a2a;
        const uniformColor = this.isTarget ? 0x1a0000 : 0x1a2a1a;

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.7,
            metalness: 0.2
        });

        const uniformMaterial = new THREE.MeshStandardMaterial({
            color: uniformColor,
            roughness: 0.8,
            metalness: 0.1
        });

        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xc4956a,
            roughness: 0.8,
            metalness: 0.1
        });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        this.body = new THREE.Mesh(bodyGeo, uniformMaterial);
        this.body.position.y = 1.1;
        this.body.castShadow = true;
        this.body.userData.isEnemy = true;
        this.body.userData.enemyId = this.id;
        this.group.add(this.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.25, 0.28, 0.25);
        this.head = new THREE.Mesh(headGeo, skinMaterial);
        this.head.position.y = 1.55;
        this.head.castShadow = true;
        this.head.userData.isEnemy = true;
        this.head.userData.enemyId = this.id;
        this.head.userData.isHead = true;
        this.group.add(this.head);

        // Hat/helmet for guards, bald for target
        if (!this.isTarget) {
            const hatGeo = new THREE.BoxGeometry(0.28, 0.1, 0.28);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.y = 1.73;
            this.group.add(hat);
        } else {
            // Target has a distinctive appearance
            const crownGeo = new THREE.BoxGeometry(0.26, 0.05, 0.26);
            const crownMat = new THREE.MeshStandardMaterial({ 
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2
            });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            crown.position.y = 1.72;
            this.group.add(crown);
        }

        // Legs
        const legGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
        this.leftLeg = new THREE.Mesh(legGeo, uniformMaterial);
        this.leftLeg.position.set(-0.12, 0.55, 0);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, uniformMaterial);
        this.rightLeg.position.set(0.12, 0.55, 0);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.11, 0.4, 0.11);
        this.leftArm = new THREE.Mesh(armGeo, uniformMaterial);
        this.leftArm.position.set(-0.33, 1.1, 0);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, uniformMaterial);
        this.rightArm.position.set(0.33, 1.1, 0);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);

        // Weapon (simple box)
        if (!this.isTarget) {
            const weaponGeo = new THREE.BoxGeometry(0.05, 0.05, 0.3);
            const weaponMat = new THREE.MeshStandardMaterial({ 
                color: 0x2a2a2a, 
                metalness: 0.9,
                roughness: 0.3
            });
            this.weapon = new THREE.Mesh(weaponGeo, weaponMat);
            this.weapon.position.set(0.02, -0.15, 0.1);
            this.rightArm.add(this.weapon);
        }

        // Position group
        this.group.position.copy(this.position);
        this.scene.add(this.group);

        // Animation state
        this.legSwing = 0;
    }

    /**
     * Update enemy AI
     */
    update(deltaTime, player, stealthSystem, audioManager, colliders) {
        if (!this.isAlive) return;

        // Decay alert level
        if (this.alertLevel > 0 && this.alertState !== AlertState.COMBAT) {
            this.alertLevel -= this.alertDecayRate * deltaTime;
            if (this.alertLevel < 0) this.alertLevel = 0;
        }

        // Check for player detection
        const detectionAmount = stealthSystem.checkDetection(this, player, deltaTime);
        if (detectionAmount > 0) {
            this.alertLevel += detectionAmount;
            this.lastKnownPlayerPos = player.position.clone();
        }

        // Check for sounds
        const sound = stealthSystem.checkSoundDetection(this);
        if (sound && sound.type === 'gunshot') {
            this.alertLevel = Math.max(this.alertLevel, 0.5);
            if (!this.lastKnownPlayerPos) {
                this.lastKnownPlayerPos = sound.position.clone();
            }
        }

        // Update alert state
        this.alertState = stealthSystem.getStateFromLevel(this.alertLevel);

        // Execute behavior based on state
        switch (this.alertState) {
            case AlertState.IDLE:
                this.patrol(deltaTime, colliders);
                break;
            case AlertState.SUSPICIOUS:
                this.investigate(deltaTime, colliders);
                break;
            case AlertState.ALERTED:
                this.search(deltaTime, player, colliders);
                break;
            case AlertState.COMBAT:
                this.combat(deltaTime, player, audioManager, colliders);
                break;
        }

        // Update cooldowns
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        // Update mesh
        this.updateMesh(deltaTime);

        // Update vision cone
        stealthSystem.updateVisionCone(this);
    }

    /**
     * Patrol behavior
     */
    patrol(deltaTime, colliders) {
        if (this.patrolRoute.length === 0) {
            // Idle rotation
            this.rotation += Math.sin(Date.now() * 0.001) * 0.01;
            return;
        }

        // Check if waiting at patrol point
        if (this.patrolWaitTime > 0) {
            this.patrolWaitTime -= deltaTime;
            // Look around while waiting
            this.rotation += Math.sin(Date.now() * 0.002) * 0.02;
            return;
        }

        // Move to current patrol point
        const target = this.patrolRoute[this.currentPatrolIndex];
        const distance = this.position.distanceTo(target);

        if (distance < 0.5) {
            // Reached patrol point
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolRoute.length;
            this.patrolWaitTime = this.patrolWaitDuration;
        } else {
            // Move towards target
            this.moveTowards(target, this.walkSpeed, deltaTime, colliders);
        }
    }

    /**
     * Investigate behavior
     */
    investigate(deltaTime, colliders) {
        if (!this.lastKnownPlayerPos) {
            this.patrol(deltaTime, colliders);
            return;
        }

        this.investigateTime += deltaTime;

        // Move towards last known position
        const distance = this.position.distanceTo(this.lastKnownPlayerPos);

        if (distance > 1) {
            this.moveTowards(this.lastKnownPlayerPos, this.walkSpeed * 1.5, deltaTime, colliders);
        } else {
            // Look around
            this.rotation += Math.sin(Date.now() * 0.003) * 0.05;
        }

        // Give up investigating after duration
        if (this.investigateTime > this.investigateDuration) {
            this.investigateTime = 0;
            this.lastKnownPlayerPos = null;
            this.alertLevel = 0;
        }
    }

    /**
     * Search behavior
     */
    search(deltaTime, player, colliders) {
        this.searchTime += deltaTime;

        if (this.lastKnownPlayerPos) {
            const distance = this.position.distanceTo(this.lastKnownPlayerPos);

            if (distance > 1) {
                this.moveTowards(this.lastKnownPlayerPos, this.runSpeed * 0.8, deltaTime, colliders);
            } else {
                // Search area
                this.rotation += deltaTime * 2;
            }
        }

        // Escalate or calm down
        if (this.searchTime > 10) {
            this.searchTime = 0;
            this.alertLevel -= 0.3;
        }
    }

    /**
     * Combat behavior
     */
    combat(deltaTime, player, audioManager, colliders) {
        if (!player.isAlive) {
            this.alertLevel = 0.5;
            return;
        }

        // Update last known position
        this.lastKnownPlayerPos = player.position.clone();

        const distance = this.position.distanceTo(player.position);

        // Face player
        this.facePosition(player.position, deltaTime);

        // Combat logic
        if (distance > this.shootRange) {
            // Move closer
            this.moveTowards(player.position, this.runSpeed, deltaTime, colliders);
        } else if (distance < 8) {
            // Take cover or strafe
            this.coverTime += deltaTime;
            if (this.coverTime > 2) {
                // Strafe
                const strafeDir = new THREE.Vector3(
                    Math.cos(this.rotation + Math.PI / 2),
                    0,
                    -Math.sin(this.rotation + Math.PI / 2)
                ).multiplyScalar(this.walkSpeed * deltaTime);

                const newPos = this.position.clone().add(strafeDir);
                if (!this.checkCollision(newPos, colliders)) {
                    this.position.add(strafeDir);
                }

                if (this.coverTime > 4) {
                    this.coverTime = 0;
                }
            }

            // Shoot at player
            if (this.shootCooldown <= 0 && !this.isTarget) {
                this.shoot(player, audioManager);
            }
        } else {
            // Optimal range - shoot
            if (this.shootCooldown <= 0 && !this.isTarget) {
                this.shoot(player, audioManager);
            }
        }
    }

    /**
     * Shoot at player
     */
    shoot(player, audioManager) {
        this.shootCooldown = this.shootInterval;

        // Play sound
        if (audioManager) {
            audioManager.playGunshot(false);
        }

        // Calculate hit chance
        const distance = this.position.distanceTo(player.position);
        let hitChance = this.accuracy * (1 - distance / this.shootRange * 0.5);

        // Reduce accuracy if player is moving
        if (player.isMoving) hitChance *= 0.7;
        if (player.isCrouching) hitChance *= 0.6;

        // Check if hit
        if (Math.random() < hitChance) {
            player.takeDamage(this.damage);
        }

        // Muzzle flash effect
        this.createMuzzleFlash();
    }

    /**
     * Create muzzle flash effect
     */
    createMuzzleFlash() {
        const flashGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);

        // Position at weapon
        const weaponWorldPos = new THREE.Vector3();
        if (this.weapon) {
            this.weapon.getWorldPosition(weaponWorldPos);
        } else {
            weaponWorldPos.copy(this.position);
            weaponWorldPos.y = 1.2;
        }

        flash.position.copy(weaponWorldPos);
        flash.position.z -= 0.2;
        this.scene.add(flash);

        // Animate and remove
        let opacity = 1;
        const animate = () => {
            opacity -= 0.15;
            flash.material.opacity = opacity;
            flash.scale.multiplyScalar(1.1);
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(flash);
            }
        };
        animate();
    }

    /**
     * Move towards a target position
     */
    moveTowards(target, speed, deltaTime, colliders) {
        // Face target
        this.facePosition(target, deltaTime);

        // Move forward
        const direction = new THREE.Vector3()
            .subVectors(target, this.position)
            .normalize();

        const newPosition = this.position.clone().add(
            direction.multiplyScalar(speed * deltaTime)
        );

        // Check collision
        if (!this.checkCollision(newPosition, colliders)) {
            this.position.copy(newPosition);
        } else {
            // Try to move around obstacle
            const slideDir = new THREE.Vector3(direction.z, 0, -direction.x);
            const slidePos = this.position.clone().add(
                slideDir.multiplyScalar(speed * deltaTime * 0.5)
            );
            if (!this.checkCollision(slidePos, colliders)) {
                this.position.copy(slidePos);
            }
        }
    }

    /**
     * Face a position
     */
    facePosition(target, deltaTime) {
        const direction = new THREE.Vector3()
            .subVectors(target, this.position);

        const targetRotation = Math.atan2(-direction.x, -direction.z);

        // Smooth rotation
        let diff = targetRotation - this.rotation;

        // Normalize to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        this.rotation += diff * this.turnSpeed * deltaTime;
    }

    /**
     * Check collision
     */
    checkCollision(position, colliders) {
        const radius = 0.3;

        for (const collider of colliders) {
            if (collider.type === 'cylinder') {
                const dx = position.x - collider.position.x;
                const dz = position.z - collider.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < radius + collider.radius) {
                    return true;
                }
            } else if (collider.bounds) {
                const testBounds = new THREE.Box3(
                    new THREE.Vector3(position.x - radius, 0, position.z - radius),
                    new THREE.Vector3(position.x + radius, 2, position.z + radius)
                );
                if (testBounds.intersectsBox(collider.bounds)) {
                    return true;
                }
            }
        }

        // Level bounds
        if (Math.abs(position.x) > 24 || Math.abs(position.z) > 29) {
            return true;
        }

        return false;
    }

    /**
     * Update mesh position and animation
     */
    updateMesh(deltaTime) {
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;

        // Walking animation
        const isMoving = this.velocity.length() > 0.1 || 
            (this.alertState !== AlertState.IDLE && this.patrolWaitTime <= 0);

        if (isMoving) {
            this.legSwing += deltaTime * 8;
            const swing = Math.sin(this.legSwing) * 0.4;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;
            this.leftArm.rotation.x = -swing * 0.5;
            this.rightArm.rotation.x = swing * 0.5;
        } else {
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
        }

        // Combat pose
        if (this.alertState === AlertState.COMBAT && !this.isTarget) {
            this.rightArm.rotation.x = -Math.PI / 3;
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount, isHeadshot = false) {
        if (!this.isAlive) return false;

        // Headshot multiplier
        if (isHeadshot) {
            amount *= 2;
        }

        this.health -= amount;

        // Hit reaction
        this.group.position.y += 0.05;
        setTimeout(() => {
            if (this.group) {
                this.group.position.y = this.position.y;
            }
        }, 50);

        // Flash red
        const originalColor = this.body.material.color.getHex();
        this.body.material.color.setHex(0xff0000);
        setTimeout(() => {
            if (this.body) {
                this.body.material.color.setHex(originalColor);
            }
        }, 100);

        if (this.health <= 0) {
            this.die();
            return true;
        }

        // Alert on being hit
        this.alertLevel = 1;
        this.alertState = AlertState.COMBAT;

        return false;
    }

    /**
     * Enemy death
     */
    die() {
        this.isAlive = false;

        // Ragdoll effect
        let fallProgress = 0;
        const fallAnimation = () => {
            fallProgress += 0.05;
            this.group.rotation.x = -fallProgress * (Math.PI / 2);
            this.group.position.y = Math.max(0, 0.3 - fallProgress * 0.5);

            if (fallProgress < 1) {
                requestAnimationFrame(fallAnimation);
            }
        };
        fallAnimation();
    }

    /**
     * Clean up
     */
    cleanup() {
        if (this.group) {
            this.scene.remove(this.group);
        }
    }
}

// Export
window.EnemyAI = EnemyAI;
