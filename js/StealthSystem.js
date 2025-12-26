/**
 * StealthSystem.js
 * Manages stealth detection, vision cones, and alert states
 */

const AlertState = {
    IDLE: 'IDLE',
    SUSPICIOUS: 'SUSPICIOUS',
    ALERTED: 'ALERTED',
    COMBAT: 'COMBAT'
};

class StealthSystem {
    constructor(scene, levelBuilder) {
        this.scene = scene;
        this.levelBuilder = levelBuilder;

        // Global alert level
        this.globalAlertState = AlertState.IDLE;
        this.globalAlertLevel = 0;
        this.globalAlertDecayRate = 0.1;

        // Detection parameters
        this.baseDetectionRange = 15;
        this.baseDetectionAngle = Math.PI / 3; // 60 degrees
        this.detectionSpeed = {
            [AlertState.IDLE]: 0.5,
            [AlertState.SUSPICIOUS]: 0.8,
            [AlertState.ALERTED]: 1.2,
            [AlertState.COMBAT]: 2.0
        };

        // Alert thresholds
        this.suspiciousThreshold = 0.3;
        this.alertedThreshold = 0.7;
        this.combatThreshold = 1.0;

        // Vision cone visualization
        this.visionCones = new Map();

        // Sound detection
        this.soundSources = [];

        // Raycaster for line of sight
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Create vision cone visualization for an enemy
     */
    createVisionCone(enemy) {
        const coneGroup = new THREE.Group();

        // Vision cone geometry
        const coneGeo = new THREE.ConeGeometry(
            Math.tan(enemy.detectionAngle) * enemy.detectionRange,
            enemy.detectionRange,
            16,
            1,
            true
        );

        // Rotate cone to point forward
        coneGeo.rotateX(Math.PI / 2);
        coneGeo.translate(0, 0, -enemy.detectionRange / 2);

        const coneMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.renderOrder = 1;
        coneGroup.add(cone);

        // Add cone edge lines for better visibility
        const edgeGeo = new THREE.BufferGeometry();
        const edgePoints = [];
        const segments = 16;
        const angleStep = (enemy.detectionAngle * 2) / segments;

        for (let i = 0; i <= segments; i++) {
            const angle = -enemy.detectionAngle + angleStep * i;
            const x = Math.sin(angle) * enemy.detectionRange;
            const z = -Math.cos(angle) * enemy.detectionRange;
            edgePoints.push(new THREE.Vector3(0, 0, 0));
            edgePoints.push(new THREE.Vector3(x, 0, z));
        }

        edgeGeo.setFromPoints(edgePoints);
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3
        });

        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        coneGroup.add(edges);

        this.scene.add(coneGroup);
        this.visionCones.set(enemy.id, { group: coneGroup, cone, edges });

        return coneGroup;
    }

    /**
     * Update vision cone visualization
     */
    updateVisionCone(enemy) {
        const visionCone = this.visionCones.get(enemy.id);
        if (!visionCone) return;

        // Position and rotate cone
        visionCone.group.position.copy(enemy.position);
        visionCone.group.position.y = 1;
        visionCone.group.rotation.y = enemy.rotation;

        // Color based on alert state
        let color;
        let opacity;

        switch (enemy.alertState) {
            case AlertState.IDLE:
                color = 0x00ff00;
                opacity = 0.1;
                break;
            case AlertState.SUSPICIOUS:
                color = 0xffff00;
                opacity = 0.15;
                break;
            case AlertState.ALERTED:
                color = 0xff8800;
                opacity = 0.2;
                break;
            case AlertState.COMBAT:
                color = 0xff0000;
                opacity = 0.25;
                break;
        }

        visionCone.cone.material.color.setHex(color);
        visionCone.cone.material.opacity = opacity;
        visionCone.edges.material.color.setHex(color);
    }

    /**
     * Check if player is detected by an enemy
     */
    checkDetection(enemy, player, deltaTime) {
        if (!player.isAlive) return 0;

        const enemyPos = enemy.position.clone();
        enemyPos.y = 1; // Eye level

        const playerPos = player.position.clone();
        playerPos.y = player.isCrouching ? 0.5 : 1.2;

        // Calculate distance
        const distance = enemyPos.distanceTo(playerPos);

        // Check if in range
        if (distance > enemy.detectionRange) {
            return 0;
        }

        // Calculate angle to player
        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();
        const enemyForward = new THREE.Vector3(
            -Math.sin(enemy.rotation),
            0,
            -Math.cos(enemy.rotation)
        );

        const angle = Math.acos(dirToPlayer.dot(enemyForward));

        // Check if in field of view
        if (angle > enemy.detectionAngle) {
            return 0;
        }

        // Check line of sight
        if (!this.hasLineOfSight(enemyPos, playerPos)) {
            return 0;
        }

        // Calculate detection amount
        let detectionRate = this.detectionSpeed[enemy.alertState];

        // Distance modifier (closer = faster detection)
        const distanceModifier = 1 - (distance / enemy.detectionRange);
        detectionRate *= (1 + distanceModifier);

        // Angle modifier (center of vision = faster)
        const angleModifier = 1 - (angle / enemy.detectionAngle);
        detectionRate *= (0.5 + angleModifier * 0.5);

        // Player visibility modifier
        detectionRate *= player.getVisibilityMultiplier();

        // Lighting modifier
        const lightMod = this.levelBuilder.getLightingModifier(player.position);
        detectionRate *= lightMod;

        return detectionRate * deltaTime;
    }

    /**
     * Check line of sight between two points
     */
    hasLineOfSight(from, to) {
        const direction = new THREE.Vector3().subVectors(to, from).normalize();
        const distance = from.distanceTo(to);

        this.raycaster.set(from, direction);
        this.raycaster.far = distance;

        // Get meshes to check
        const meshes = [];
        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.geometry && !obj.userData.isEnemy && !obj.userData.isPlayer) {
                meshes.push(obj);
            }
        });

        const intersects = this.raycaster.intersectObjects(meshes, false);

        // If any intersection is closer than the target, no line of sight
        for (const intersect of intersects) {
            if (intersect.distance < distance - 0.1) {
                return false;
            }
        }

        return true;
    }

    /**
     * Register a sound event
     */
    registerSound(position, loudness, type) {
        this.soundSources.push({
            position: position.clone(),
            loudness,
            type,
            time: Date.now(),
            radius: loudness * 20 // Sound travel distance
        });

        // Clean old sounds
        const now = Date.now();
        this.soundSources = this.soundSources.filter(s => now - s.time < 3000);
    }

    /**
     * Check if enemy can hear any sounds
     */
    checkSoundDetection(enemy) {
        const now = Date.now();
        const heardSounds = [];

        for (const sound of this.soundSources) {
            // Check if sound is still "audible"
            const age = now - sound.time;
            if (age > 2000) continue;

            // Check distance
            const distance = enemy.position.distanceTo(sound.position);
            if (distance > sound.radius) continue;

            // Calculate loudness at enemy position
            const effectiveLoudness = sound.loudness * (1 - distance / sound.radius);

            heardSounds.push({
                position: sound.position,
                loudness: effectiveLoudness,
                type: sound.type
            });
        }

        // Return loudest sound
        if (heardSounds.length === 0) return null;

        heardSounds.sort((a, b) => b.loudness - a.loudness);
        return heardSounds[0];
    }

    /**
     * Update global alert state
     */
    updateGlobalAlert(enemies) {
        // Find highest alert state among enemies
        let highestState = AlertState.IDLE;
        let highestLevel = 0;

        for (const enemy of enemies) {
            if (enemy.alertLevel > highestLevel) {
                highestLevel = enemy.alertLevel;
                highestState = enemy.alertState;
            }
        }

        this.globalAlertLevel = highestLevel;
        this.globalAlertState = highestState;

        return this.globalAlertState;
    }

    /**
     * Get detection meter value (0-1)
     */
    getDetectionMeter(enemies) {
        let maxDetection = 0;

        for (const enemy of enemies) {
            if (enemy.alertLevel > maxDetection) {
                maxDetection = enemy.alertLevel;
            }
        }

        return Math.min(1, maxDetection);
    }

    /**
     * Calculate alert state from alert level
     */
    getStateFromLevel(level) {
        if (level >= this.combatThreshold) {
            return AlertState.COMBAT;
        } else if (level >= this.alertedThreshold) {
            return AlertState.ALERTED;
        } else if (level >= this.suspiciousThreshold) {
            return AlertState.SUSPICIOUS;
        }
        return AlertState.IDLE;
    }

    /**
     * Check if position is in cover from a viewer
     */
    isInCover(position, viewerPosition, coverObjects) {
        const direction = new THREE.Vector3().subVectors(position, viewerPosition).normalize();
        const distance = position.distanceTo(viewerPosition);

        for (const cover of coverObjects) {
            const coverDist = viewerPosition.distanceTo(cover.position);
            
            // Cover must be between viewer and target
            if (coverDist > distance) continue;

            // Check if cover blocks line of sight
            const toCover = new THREE.Vector3().subVectors(cover.position, viewerPosition).normalize();
            const dot = direction.dot(toCover);

            if (dot > 0.8 && coverDist < distance) {
                // Check if cover is tall enough
                if (position.y < cover.height + cover.position.y) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Alert all enemies to a position
     */
    alertAllEnemies(enemies, position, alertLevel = 0.5) {
        for (const enemy of enemies) {
            enemy.lastKnownPlayerPos = position.clone();
            enemy.alertLevel = Math.max(enemy.alertLevel, alertLevel);
            enemy.alertState = this.getStateFromLevel(enemy.alertLevel);
        }
    }

    /**
     * Remove vision cone when enemy dies
     */
    removeVisionCone(enemyId) {
        const visionCone = this.visionCones.get(enemyId);
        if (visionCone) {
            this.scene.remove(visionCone.group);
            this.visionCones.delete(enemyId);
        }
    }

    /**
     * Check if player is in restricted zone
     */
    isInRestrictedZone(position) {
        return this.levelBuilder.isInRestrictedZone(position);
    }

    /**
     * Clean up all vision cones
     */
    cleanup() {
        for (const [id, cone] of this.visionCones) {
            this.scene.remove(cone.group);
        }
        this.visionCones.clear();
        this.soundSources = [];
    }
}

// Export
window.AlertState = AlertState;
window.StealthSystem = StealthSystem;
