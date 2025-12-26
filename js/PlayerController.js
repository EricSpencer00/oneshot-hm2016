/**
 * PlayerController.js
 * Handles player movement, camera, and input
 */

class PlayerController {
    constructor(scene, camera, colliders) {
        this.scene = scene;
        this.camera = camera;
        this.colliders = colliders;

        // Player state
        this.position = new THREE.Vector3(0, 0, 25);
        this.velocity = new THREE.Vector3();
        this.rotation = { x: 0, y: Math.PI }; // Face north initially
        
        // Movement parameters
        this.walkSpeed = 4;
        this.runSpeed = 8;
        this.crouchSpeed = 2;
        this.acceleration = 20;
        this.deceleration = 15;
        
        // Player properties
        this.height = 1.7;
        this.crouchHeight = 0.9;
        this.currentHeight = this.height;
        this.radius = 0.3;
        
        // State flags
        this.isRunning = false;
        this.isCrouching = false;
        this.isMoving = false;
        this.isAlive = true;
        
        // Health
        this.maxHealth = 100;
        this.health = 100;
        
        // Camera settings
        this.cameraDistance = 3;
        this.cameraHeight = 1.5;
        this.cameraOffset = new THREE.Vector3(0.5, 0, 0); // Over-the-shoulder offset
        this.cameraSway = { x: 0, y: 0 };
        this.cameraShake = 0;
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            run: false,
            crouch: false
        };
        this.mouseSensitivity = 0.002;
        this.isPointerLocked = false;
        
        // Animation state
        this.animationState = 'idle';
        this.legSwing = 0;
        this.armSwing = 0;
        
        // Footstep timing
        this.footstepTimer = 0;
        this.footstepInterval = 0.5;
        
        // Create player mesh
        this.createPlayerMesh();
        
        // Setup input handlers
        this.setupInputHandlers();
    }

    /**
     * Create the player character mesh
     */
    createPlayerMesh() {
        this.playerGroup = new THREE.Group();
        
        // Materials
        const suitMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const shirtMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const tieMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.6,
            metalness: 0.2
        });

        // Body (torso)
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        this.body = new THREE.Mesh(bodyGeo, suitMaterial);
        this.body.position.y = 1.1;
        this.body.castShadow = true;
        this.playerGroup.add(this.body);

        // Shirt collar
        const collarGeo = new THREE.BoxGeometry(0.2, 0.1, 0.25);
        const collar = new THREE.Mesh(collarGeo, shirtMaterial);
        collar.position.set(0, 0.35, 0.05);
        this.body.add(collar);

        // Tie
        const tieGeo = new THREE.BoxGeometry(0.08, 0.3, 0.05);
        const tie = new THREE.Mesh(tieGeo, tieMaterial);
        tie.position.set(0, 0.15, 0.15);
        this.body.add(tie);

        // Head
        const headGeo = new THREE.BoxGeometry(0.25, 0.3, 0.25);
        this.head = new THREE.Mesh(headGeo, skinMaterial);
        this.head.position.y = 1.55;
        this.head.castShadow = true;
        this.playerGroup.add(this.head);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        this.leftLeg = new THREE.Mesh(legGeo, suitMaterial);
        this.leftLeg.position.set(-0.12, 0.55, 0);
        this.leftLeg.castShadow = true;
        this.playerGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, suitMaterial);
        this.rightLeg.position.set(0.12, 0.55, 0);
        this.rightLeg.castShadow = true;
        this.playerGroup.add(this.rightLeg);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        this.leftArm = new THREE.Mesh(armGeo, suitMaterial);
        this.leftArm.position.set(-0.35, 1.1, 0);
        this.leftArm.castShadow = true;
        this.playerGroup.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, suitMaterial);
        this.rightArm.position.set(0.35, 1.1, 0);
        this.rightArm.castShadow = true;
        this.playerGroup.add(this.rightArm);

        // Hands
        const handGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);
        const leftHand = new THREE.Mesh(handGeo, skinMaterial);
        leftHand.position.set(0, -0.28, 0);
        this.leftArm.add(leftHand);

        const rightHand = new THREE.Mesh(handGeo, skinMaterial);
        rightHand.position.set(0, -0.28, 0);
        this.rightArm.add(rightHand);

        // Position player
        this.playerGroup.position.copy(this.position);
        this.scene.add(this.playerGroup);
    }

    /**
     * Setup keyboard and mouse input handlers
     */
    setupInputHandlers() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse movement
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Pointer lock
        document.addEventListener('click', () => {
            if (!this.isPointerLocked && window.game && window.game.stateManager.isPlaying()) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
        });
    }

    /**
     * Handle key down events
     */
    onKeyDown(event) {
        if (!this.isAlive) return;

        switch (event.code) {
            case 'KeyW':
                this.keys.forward = true;
                break;
            case 'KeyS':
                this.keys.backward = true;
                break;
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = true;
                break;
            case 'ControlLeft':
            case 'ControlRight':
            case 'KeyC':
                this.keys.crouch = true;
                this.isCrouching = true;
                break;
        }
    }

    /**
     * Handle key up events
     */
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.keys.forward = false;
                break;
            case 'KeyS':
                this.keys.backward = false;
                break;
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = false;
                break;
            case 'ControlLeft':
            case 'ControlRight':
            case 'KeyC':
                this.keys.crouch = false;
                this.isCrouching = false;
                break;
        }
    }

    /**
     * Handle mouse movement
     */
    onMouseMove(event) {
        if (!this.isPointerLocked || !this.isAlive) return;

        this.rotation.y -= event.movementX * this.mouseSensitivity;
        this.rotation.x -= event.movementY * this.mouseSensitivity;

        // Clamp vertical rotation
        this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x));
    }

    /**
     * Update player state
     */
    update(deltaTime, audioManager) {
        if (!this.isAlive) return;

        // Update movement
        this.updateMovement(deltaTime);

        // Update crouch
        this.updateCrouch(deltaTime);

        // Update animations
        this.updateAnimations(deltaTime);

        // Update camera
        this.updateCamera(deltaTime);

        // Update footsteps
        this.updateFootsteps(deltaTime, audioManager);

        // Update camera shake
        if (this.cameraShake > 0) {
            this.cameraShake -= deltaTime * 5;
            if (this.cameraShake < 0) this.cameraShake = 0;
        }
    }

    /**
     * Update player movement
     */
    updateMovement(deltaTime) {
        // Calculate movement direction
        const moveDirection = new THREE.Vector3();

        if (this.keys.forward) moveDirection.z -= 1;
        if (this.keys.backward) moveDirection.z += 1;
        if (this.keys.left) moveDirection.x -= 1;
        if (this.keys.right) moveDirection.x += 1;

        // Determine if moving
        this.isMoving = moveDirection.length() > 0;

        if (this.isMoving) {
            moveDirection.normalize();

            // Rotate direction based on player facing
            moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

            // Determine speed
            let speed = this.walkSpeed;
            if (this.isCrouching) {
                speed = this.crouchSpeed;
                this.isRunning = false;
            } else if (this.keys.run) {
                speed = this.runSpeed;
                this.isRunning = true;
            } else {
                this.isRunning = false;
            }

            // Apply acceleration
            const targetVelocity = moveDirection.multiplyScalar(speed);
            this.velocity.lerp(targetVelocity, this.acceleration * deltaTime);
        } else {
            // Decelerate
            this.velocity.lerp(new THREE.Vector3(), this.deceleration * deltaTime);
            this.isRunning = false;
        }

        // Calculate new position
        const newPosition = this.position.clone().add(
            this.velocity.clone().multiplyScalar(deltaTime)
        );

        // Check collisions
        if (!this.checkCollision(newPosition)) {
            this.position.copy(newPosition);
        } else {
            // Try sliding along walls
            const slideX = this.position.clone();
            slideX.x = newPosition.x;
            if (!this.checkCollision(slideX)) {
                this.position.x = slideX.x;
            }

            const slideZ = this.position.clone();
            slideZ.z = newPosition.z;
            if (!this.checkCollision(slideZ)) {
                this.position.z = slideZ.z;
            }

            this.velocity.multiplyScalar(0.5);
        }

        // Update mesh position
        this.playerGroup.position.copy(this.position);
        this.playerGroup.rotation.y = this.rotation.y;
    }

    /**
     * Check collision with level geometry
     */
    checkCollision(position) {
        const playerBounds = new THREE.Box3(
            new THREE.Vector3(
                position.x - this.radius,
                position.y,
                position.z - this.radius
            ),
            new THREE.Vector3(
                position.x + this.radius,
                position.y + this.currentHeight,
                position.z + this.radius
            )
        );

        for (const collider of this.colliders) {
            if (collider.type === 'cylinder') {
                // Cylinder collision
                const dx = position.x - collider.position.x;
                const dz = position.z - collider.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < this.radius + collider.radius) {
                    return true;
                }
            } else if (collider.bounds) {
                // Box collision
                if (playerBounds.intersectsBox(collider.bounds)) {
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
     * Update crouch state
     */
    updateCrouch(deltaTime) {
        const targetHeight = this.isCrouching ? this.crouchHeight : this.height;
        this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, deltaTime * 10);

        // Scale player mesh
        const scale = this.currentHeight / this.height;
        this.playerGroup.scale.y = scale;
    }

    /**
     * Update walking/running animations
     */
    updateAnimations(deltaTime) {
        if (this.isMoving) {
            // Determine animation speed
            let animSpeed = 8;
            if (this.isRunning) animSpeed = 14;
            if (this.isCrouching) animSpeed = 5;

            this.legSwing += deltaTime * animSpeed;
            this.armSwing = this.legSwing;

            // Animate legs
            const legAngle = Math.sin(this.legSwing) * 0.4;
            this.leftLeg.rotation.x = legAngle;
            this.rightLeg.rotation.x = -legAngle;

            // Animate arms (opposite to legs)
            const armAngle = Math.sin(this.armSwing) * 0.3;
            this.leftArm.rotation.x = -armAngle;
            this.rightArm.rotation.x = armAngle;

            this.animationState = this.isRunning ? 'run' : 'walk';
        } else {
            // Return to idle
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, deltaTime * 5);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, deltaTime * 5);
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, deltaTime * 5);
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, deltaTime * 5);

            this.animationState = 'idle';
        }

        // Subtle idle breathing animation
        if (!this.isMoving) {
            const breathe = Math.sin(Date.now() * 0.002) * 0.01;
            this.body.position.y = 1.1 + breathe;
        }
    }

    /**
     * Update camera position
     */
    updateCamera(deltaTime) {
        // Calculate camera position (third-person, over-the-shoulder)
        const cameraTargetHeight = this.isCrouching ? this.cameraHeight * 0.6 : this.cameraHeight;
        
        // Camera follows behind player
        const cameraOffsetZ = Math.cos(this.rotation.y) * this.cameraDistance;
        const cameraOffsetX = Math.sin(this.rotation.y) * this.cameraDistance;
        
        // Add shoulder offset
        const shoulderOffsetX = Math.cos(this.rotation.y + Math.PI / 2) * this.cameraOffset.x;
        const shoulderOffsetZ = Math.sin(this.rotation.y + Math.PI / 2) * this.cameraOffset.x;

        const targetCameraPos = new THREE.Vector3(
            this.position.x + cameraOffsetX + shoulderOffsetX,
            this.position.y + cameraTargetHeight,
            this.position.z + cameraOffsetZ + shoulderOffsetZ
        );

        // Add camera sway based on movement
        if (this.isMoving) {
            const swayAmount = this.isRunning ? 0.05 : 0.02;
            this.cameraSway.x = Math.sin(this.legSwing * 2) * swayAmount;
            this.cameraSway.y = Math.abs(Math.sin(this.legSwing)) * swayAmount * 0.5;
        } else {
            this.cameraSway.x *= 0.9;
            this.cameraSway.y *= 0.9;
        }

        // Add camera shake
        if (this.cameraShake > 0) {
            targetCameraPos.x += (Math.random() - 0.5) * this.cameraShake * 0.1;
            targetCameraPos.y += (Math.random() - 0.5) * this.cameraShake * 0.1;
        }

        targetCameraPos.x += this.cameraSway.x;
        targetCameraPos.y += this.cameraSway.y;

        // Smooth camera movement
        this.camera.position.lerp(targetCameraPos, deltaTime * 10);

        // Camera looks at player head + forward direction
        const lookAtPoint = new THREE.Vector3(
            this.position.x - Math.sin(this.rotation.y) * 5,
            this.position.y + cameraTargetHeight + Math.sin(this.rotation.x) * 3,
            this.position.z - Math.cos(this.rotation.y) * 5
        );

        // Smooth look-at
        const currentLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(currentLookAt);
        this.camera.lookAt(lookAtPoint);
    }

    /**
     * Update footstep sounds
     */
    updateFootsteps(deltaTime, audioManager) {
        if (!this.isMoving || !audioManager) return;

        // Adjust footstep timing based on speed
        let interval = this.footstepInterval;
        if (this.isRunning) interval = 0.3;
        if (this.isCrouching) interval = 0.7;

        this.footstepTimer += deltaTime;
        if (this.footstepTimer >= interval) {
            this.footstepTimer = 0;
            audioManager.playFootstep(this.isRunning);
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (!this.isAlive) return;

        this.health -= amount;
        this.cameraShake = 1;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    /**
     * Heal player
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Player death
     */
    die() {
        this.isAlive = false;
        this.velocity.set(0, 0, 0);

        // Ragdoll effect - tip over
        const fallAnimation = () => {
            if (this.playerGroup.rotation.x > -Math.PI / 2) {
                this.playerGroup.rotation.x -= 0.05;
                requestAnimationFrame(fallAnimation);
            }
        };
        fallAnimation();
    }

    /**
     * Respawn player
     */
    respawn(position) {
        this.position.copy(position);
        this.health = this.maxHealth;
        this.isAlive = true;
        this.velocity.set(0, 0, 0);
        this.playerGroup.rotation.x = 0;
        this.rotation = { x: 0, y: Math.PI };
    }

    /**
     * Get player forward direction
     */
    getForwardDirection() {
        return new THREE.Vector3(
            -Math.sin(this.rotation.y),
            0,
            -Math.cos(this.rotation.y)
        );
    }

    /**
     * Get aiming direction (includes vertical look)
     */
    getAimDirection() {
        const dir = new THREE.Vector3(
            -Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            Math.sin(this.rotation.x),
            -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        );
        return dir.normalize();
    }

    /**
     * Get position for shooting origin
     */
    getShootPosition() {
        const offset = new THREE.Vector3(0.3, this.currentHeight - 0.3, 0);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        return this.position.clone().add(offset);
    }

    /**
     * Get current movement speed
     */
    getSpeed() {
        return this.velocity.length();
    }

    /**
     * Check if player is visible (not fully behind cover)
     */
    isVisible() {
        return !this.isCrouching || this.isMoving;
    }

    /**
     * Get visibility multiplier for stealth
     */
    getVisibilityMultiplier() {
        let multiplier = 1;

        if (this.isCrouching) multiplier *= 0.5;
        if (this.isRunning) multiplier *= 1.5;
        if (!this.isMoving) multiplier *= 0.7;

        return multiplier;
    }
}

// Export for use
window.PlayerController = PlayerController;
