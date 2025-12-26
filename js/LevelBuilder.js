/**
 * LevelBuilder.js
 * Creates the game level geometry, lighting, and environment
 */

class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.coverObjects = [];
        this.spawnPoints = {
            player: new THREE.Vector3(0, 0, 25),
            guards: [],
            target: new THREE.Vector3(0, 0, -25)
        };
        this.escapeZone = null;
        this.restrictedZones = [];
        this.lightZones = []; // Areas with spotlights (increased detection)
        this.darkZones = [];  // Dark areas (reduced detection)
        
        // Materials
        this.materials = this.createMaterials();
    }

    /**
     * Create all materials for the level
     */
    createMaterials() {
        return {
            floor: new THREE.MeshStandardMaterial({
                color: 0x2a2a2a,
                roughness: 0.9,
                metalness: 0.1
            }),
            floorLight: new THREE.MeshStandardMaterial({
                color: 0x3a3a3a,
                roughness: 0.8,
                metalness: 0.1
            }),
            wall: new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.7,
                metalness: 0.2
            }),
            wallDark: new THREE.MeshStandardMaterial({
                color: 0x2a2a2a,
                roughness: 0.8,
                metalness: 0.1
            }),
            concrete: new THREE.MeshStandardMaterial({
                color: 0x5a5a5a,
                roughness: 0.95,
                metalness: 0.05
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.3,
                metalness: 0.8
            }),
            wood: new THREE.MeshStandardMaterial({
                color: 0x4a3020,
                roughness: 0.8,
                metalness: 0.0
            }),
            crate: new THREE.MeshStandardMaterial({
                color: 0x6a5040,
                roughness: 0.9,
                metalness: 0.0
            }),
            glass: new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.3,
                roughness: 0.1,
                metalness: 0.9
            }),
            red: new THREE.MeshStandardMaterial({
                color: 0x8b0000,
                roughness: 0.5,
                metalness: 0.3
            }),
            accent: new THREE.MeshStandardMaterial({
                color: 0xcc9900,
                roughness: 0.4,
                metalness: 0.6
            }),
            grass: new THREE.MeshStandardMaterial({
                color: 0x1a3d1a,
                roughness: 0.95,
                metalness: 0.0
            }),
            water: new THREE.MeshStandardMaterial({
                color: 0x1a3d5c,
                roughness: 0.1,
                metalness: 0.3,
                transparent: true,
                opacity: 0.8
            })
        };
    }

    /**
     * Build the complete level
     */
    build() {
        this.createGround();
        this.createCompound();
        this.createCourtyard();
        this.createInteriorRooms();
        this.createCoverObjects();
        this.createDecorations();
        this.createLighting();
        this.createEscapeZone();
        this.createRestrictedZones();
        
        return {
            colliders: this.colliders,
            coverObjects: this.coverObjects,
            spawnPoints: this.spawnPoints,
            escapeZone: this.escapeZone,
            restrictedZones: this.restrictedZones,
            lightZones: this.lightZones,
            darkZones: this.darkZones
        };
    }

    /**
     * Create ground/floor
     */
    createGround() {
        // Main ground
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const ground = new THREE.Mesh(groundGeo, this.materials.grass);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Courtyard floor
        const courtyardGeo = new THREE.PlaneGeometry(40, 50);
        const courtyard = new THREE.Mesh(courtyardGeo, this.materials.floorLight);
        courtyard.rotation.x = -Math.PI / 2;
        courtyard.position.set(0, 0.01, 5);
        courtyard.receiveShadow = true;
        this.scene.add(courtyard);
    }

    /**
     * Create the main compound walls
     */
    createCompound() {
        const wallHeight = 4;
        const wallThickness = 0.5;

        // Outer walls
        const outerWalls = [
            // North wall
            { pos: [0, wallHeight/2, -30], size: [50, wallHeight, wallThickness] },
            // South wall
            { pos: [0, wallHeight/2, 30], size: [50, wallHeight, wallThickness] },
            // East wall
            { pos: [25, wallHeight/2, 0], size: [wallThickness, wallHeight, 60] },
            // West wall
            { pos: [-25, wallHeight/2, 0], size: [wallThickness, wallHeight, 60] },
        ];

        outerWalls.forEach(wall => {
            this.createWall(wall.pos, wall.size, this.materials.concrete);
        });

        // Inner compound walls creating rooms
        const innerWalls = [
            // Main building back wall
            { pos: [0, wallHeight/2, -20], size: [30, wallHeight, wallThickness] },
            // Main building front wall with gap for entrance
            { pos: [-10, wallHeight/2, -5], size: [10, wallHeight, wallThickness] },
            { pos: [10, wallHeight/2, -5], size: [10, wallHeight, wallThickness] },
            // Side walls of main building
            { pos: [-15, wallHeight/2, -12.5], size: [wallThickness, wallHeight, 15] },
            { pos: [15, wallHeight/2, -12.5], size: [wallThickness, wallHeight, 15] },
            // Interior dividing walls
            { pos: [0, wallHeight/2, -15], size: [wallThickness, wallHeight, 10] },
            { pos: [-7.5, wallHeight/2, -10], size: [15, wallHeight, wallThickness] },
            { pos: [7.5, wallHeight/2, -10], size: [15, wallHeight, wallThickness] },
        ];

        innerWalls.forEach(wall => {
            this.createWall(wall.pos, wall.size, this.materials.wall);
        });

        // Guard towers at corners
        const towerPositions = [
            [-22, 0, -27],
            [22, 0, -27],
            [-22, 0, 27],
            [22, 0, 27]
        ];

        towerPositions.forEach(pos => {
            this.createGuardTower(pos);
        });
    }

    /**
     * Create a wall with collision
     */
    createWall(position, size, material) {
        const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(position[0], position[1], position[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Add to colliders
        this.colliders.push({
            mesh: mesh,
            type: 'wall',
            bounds: new THREE.Box3().setFromObject(mesh)
        });

        return mesh;
    }

    /**
     * Create guard tower
     */
    createGuardTower(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Base
        const baseGeo = new THREE.BoxGeometry(4, 6, 4);
        const base = new THREE.Mesh(baseGeo, this.materials.concrete);
        base.position.y = 3;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Platform
        const platformGeo = new THREE.BoxGeometry(5, 0.3, 5);
        const platform = new THREE.Mesh(platformGeo, this.materials.metal);
        platform.position.y = 6.15;
        platform.castShadow = true;
        group.add(platform);

        // Rails
        const railGeo = new THREE.BoxGeometry(5, 1, 0.1);
        const railPositions = [
            [0, 6.7, 2.5],
            [0, 6.7, -2.5],
            [2.5, 6.7, 0],
            [-2.5, 6.7, 0]
        ];
        railPositions.forEach((rPos, i) => {
            const rail = new THREE.Mesh(railGeo, this.materials.metal);
            rail.position.set(rPos[0], rPos[1], rPos[2]);
            if (i >= 2) rail.rotation.y = Math.PI / 2;
            group.add(rail);
        });

        this.scene.add(group);

        // Add base as collider
        const worldBase = base.clone();
        worldBase.position.add(group.position);
        this.colliders.push({
            mesh: worldBase,
            type: 'wall',
            bounds: new THREE.Box3().setFromObject(base).translate(group.position)
        });
    }

    /**
     * Create courtyard area
     */
    createCourtyard() {
        // Fountain in center
        this.createFountain([0, 0, 10]);

        // Benches
        this.createBench([-8, 0, 10], 0);
        this.createBench([8, 0, 10], 0);
        this.createBench([0, 0, 15], Math.PI / 2);

        // Planters
        const planterPositions = [
            [-12, 0, 5],
            [12, 0, 5],
            [-12, 0, 15],
            [12, 0, 15]
        ];
        planterPositions.forEach(pos => {
            this.createPlanter(pos);
        });

        // Guard spawn points in courtyard
        this.spawnPoints.guards.push(
            { pos: new THREE.Vector3(-10, 0, 5), patrol: this.createPatrolRoute('courtyard_left') },
            { pos: new THREE.Vector3(10, 0, 5), patrol: this.createPatrolRoute('courtyard_right') }
        );
    }

    /**
     * Create fountain decoration
     */
    createFountain(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Base
        const baseGeo = new THREE.CylinderGeometry(3, 3.5, 0.5, 16);
        const base = new THREE.Mesh(baseGeo, this.materials.concrete);
        base.position.y = 0.25;
        base.receiveShadow = true;
        group.add(base);

        // Basin
        const basinGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.8, 16);
        const basin = new THREE.Mesh(basinGeo, this.materials.concrete);
        basin.position.y = 0.9;
        group.add(basin);

        // Water
        const waterGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.6, 16);
        const water = new THREE.Mesh(waterGeo, this.materials.water);
        water.position.y = 0.9;
        group.add(water);

        // Center pillar
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const pillar = new THREE.Mesh(pillarGeo, this.materials.concrete);
        pillar.position.y = 1.8;
        pillar.castShadow = true;
        group.add(pillar);

        this.scene.add(group);

        // Add as cover
        this.coverObjects.push({
            position: new THREE.Vector3(position[0], position[1], position[2]),
            radius: 3,
            height: 1.5
        });

        this.colliders.push({
            type: 'cylinder',
            position: new THREE.Vector3(position[0], 0, position[2]),
            radius: 3,
            height: 1.5
        });
    }

    /**
     * Create bench
     */
    createBench(position, rotation) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);
        group.rotation.y = rotation;

        // Seat
        const seatGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
        const seat = new THREE.Mesh(seatGeo, this.materials.wood);
        seat.position.y = 0.5;
        seat.castShadow = true;
        group.add(seat);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const legPositions = [[-0.8, 0.25, 0.15], [0.8, 0.25, 0.15], [-0.8, 0.25, -0.15], [0.8, 0.25, -0.15]];
        legPositions.forEach(lPos => {
            const leg = new THREE.Mesh(legGeo, this.materials.metal);
            leg.position.set(lPos[0], lPos[1], lPos[2]);
            group.add(leg);
        });

        this.scene.add(group);
    }

    /**
     * Create planter with plant
     */
    createPlanter(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Pot
        const potGeo = new THREE.BoxGeometry(1.5, 1, 1.5);
        const pot = new THREE.Mesh(potGeo, this.materials.concrete);
        pot.position.y = 0.5;
        pot.castShadow = true;
        pot.receiveShadow = true;
        group.add(pot);

        // Plant (simple sphere for now)
        const plantGeo = new THREE.SphereGeometry(0.8, 8, 6);
        const plantMat = new THREE.MeshStandardMaterial({ color: 0x2d5a2d, roughness: 0.9 });
        const plant = new THREE.Mesh(plantGeo, plantMat);
        plant.position.y = 1.3;
        plant.castShadow = true;
        group.add(plant);

        this.scene.add(group);

        // Add as cover
        this.coverObjects.push({
            position: new THREE.Vector3(position[0], position[1], position[2]),
            radius: 0.75,
            height: 1.5
        });
    }

    /**
     * Create interior rooms
     */
    createInteriorRooms() {
        // Target's office (back room)
        this.createTargetOffice();

        // Side rooms
        this.createSideRoom([-10, 0, -15], 'left');
        this.createSideRoom([10, 0, -15], 'right');

        // Main hall floor
        const hallFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 15),
            this.materials.floor
        );
        hallFloor.rotation.x = -Math.PI / 2;
        hallFloor.position.set(0, 0.02, -12.5);
        hallFloor.receiveShadow = true;
        this.scene.add(hallFloor);

        // Guard spawns in interior
        this.spawnPoints.guards.push(
            { pos: new THREE.Vector3(-5, 0, -12), patrol: this.createPatrolRoute('interior_left') },
            { pos: new THREE.Vector3(5, 0, -12), patrol: this.createPatrolRoute('interior_right') }
        );
    }

    /**
     * Create target's office
     */
    createTargetOffice() {
        // Office floor
        const officeFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 8),
            this.materials.wood
        );
        officeFloor.rotation.x = -Math.PI / 2;
        officeFloor.position.set(0, 0.02, -24);
        officeFloor.receiveShadow = true;
        this.scene.add(officeFloor);

        // Desk
        this.createDesk([0, 0, -25]);

        // Chairs
        this.createChair([-2, 0, -25], Math.PI);
        this.createChair([0, 0, -22], 0);

        // Bookshelf
        this.createBookshelf([-8, 0, -27]);
        this.createBookshelf([8, 0, -27]);

        // Set target spawn
        this.spawnPoints.target = new THREE.Vector3(0, 0, -25);

        // Office guard
        this.spawnPoints.guards.push(
            { pos: new THREE.Vector3(-5, 0, -22), patrol: this.createPatrolRoute('office') }
        );

        // Mark as restricted zone
        this.restrictedZones.push({
            min: new THREE.Vector3(-10, 0, -28),
            max: new THREE.Vector3(10, 4, -18)
        });

        // Dark zone (office has less lighting)
        this.darkZones.push({
            center: new THREE.Vector3(0, 0, -25),
            radius: 8
        });
    }

    /**
     * Create desk
     */
    createDesk(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Desktop
        const topGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
        const top = new THREE.Mesh(topGeo, this.materials.wood);
        top.position.y = 0.8;
        top.castShadow = true;
        group.add(top);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const legPositions = [[-1.4, 0.4, 0.6], [1.4, 0.4, 0.6], [-1.4, 0.4, -0.6], [1.4, 0.4, -0.6]];
        legPositions.forEach(lPos => {
            const leg = new THREE.Mesh(legGeo, this.materials.wood);
            leg.position.set(lPos[0], lPos[1], lPos[2]);
            group.add(leg);
        });

        // Drawers panel
        const panelGeo = new THREE.BoxGeometry(1.2, 0.6, 1.3);
        const panel = new THREE.Mesh(panelGeo, this.materials.wood);
        panel.position.set(0.8, 0.45, 0);
        group.add(panel);

        this.scene.add(group);

        this.coverObjects.push({
            position: new THREE.Vector3(position[0], position[1], position[2]),
            radius: 1.5,
            height: 0.8
        });
    }

    /**
     * Create chair
     */
    createChair(position, rotation) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);
        group.rotation.y = rotation;

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        const seat = new THREE.Mesh(seatGeo, this.materials.red);
        seat.position.y = 0.5;
        group.add(seat);

        // Back
        const backGeo = new THREE.BoxGeometry(0.5, 0.6, 0.1);
        const back = new THREE.Mesh(backGeo, this.materials.red);
        back.position.set(0, 0.8, -0.2);
        group.add(back);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
        const legPositions = [[-0.2, 0.25, 0.2], [0.2, 0.25, 0.2], [-0.2, 0.25, -0.2], [0.2, 0.25, -0.2]];
        legPositions.forEach(lPos => {
            const leg = new THREE.Mesh(legGeo, this.materials.metal);
            leg.position.set(lPos[0], lPos[1], lPos[2]);
            group.add(leg);
        });

        this.scene.add(group);
    }

    /**
     * Create bookshelf
     */
    createBookshelf(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Frame
        const frameGeo = new THREE.BoxGeometry(2, 2.5, 0.4);
        const frame = new THREE.Mesh(frameGeo, this.materials.wood);
        frame.position.y = 1.25;
        frame.castShadow = true;
        group.add(frame);

        // Shelves
        for (let i = 0; i < 4; i++) {
            const shelfGeo = new THREE.BoxGeometry(1.8, 0.05, 0.35);
            const shelf = new THREE.Mesh(shelfGeo, this.materials.wood);
            shelf.position.set(0, 0.5 + i * 0.55, 0);
            group.add(shelf);
        }

        this.scene.add(group);

        this.colliders.push({
            type: 'box',
            bounds: new THREE.Box3(
                new THREE.Vector3(position[0] - 1, 0, position[2] - 0.2),
                new THREE.Vector3(position[0] + 1, 2.5, position[2] + 0.2)
            )
        });
    }

    /**
     * Create side room
     */
    createSideRoom(position, side) {
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(7, 8),
            this.materials.floor
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(position[0], 0.02, position[2]);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Some crates for cover
        const crateOffset = side === 'left' ? -2 : 2;
        this.createCrate([position[0] + crateOffset, 0, position[2] - 2]);
        this.createCrate([position[0] + crateOffset, 0.8, position[2] - 2]);
        this.createCrate([position[0] - crateOffset, 0, position[2] + 1]);
    }

    /**
     * Create cover objects throughout level
     */
    createCoverObjects() {
        // Crates in courtyard
        const cratePositions = [
            [-15, 0, 20],
            [-14.2, 0, 20],
            [-14.6, 0.8, 20],
            [15, 0, 20],
            [16, 0, 20],
            [-18, 0, 0],
            [18, 0, 0],
            [-18, 0, 1],
        ];

        cratePositions.forEach(pos => {
            this.createCrate(pos);
        });

        // Barrels
        const barrelPositions = [
            [-20, 0, 15],
            [-20, 0, 16.5],
            [20, 0, 10],
            [19, 0, -5],
        ];

        barrelPositions.forEach(pos => {
            this.createBarrel(pos);
        });

        // Vehicles (simple boxes)
        this.createVehicle([18, 0, 20], 0.3);
        this.createVehicle([-5, 0, 25], -0.2);
    }

    /**
     * Create a crate
     */
    createCrate(position) {
        const size = 0.8 + Math.random() * 0.4;
        const geo = new THREE.BoxGeometry(size, size, size);
        const crate = new THREE.Mesh(geo, this.materials.crate);
        crate.position.set(position[0], position[1] + size/2, position[2]);
        crate.rotation.y = Math.random() * 0.3;
        crate.castShadow = true;
        crate.receiveShadow = true;
        this.scene.add(crate);

        this.colliders.push({
            mesh: crate,
            type: 'box',
            bounds: new THREE.Box3().setFromObject(crate)
        });

        this.coverObjects.push({
            position: crate.position.clone(),
            radius: size/2,
            height: size
        });
    }

    /**
     * Create a barrel
     */
    createBarrel(position) {
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
        const barrel = new THREE.Mesh(geo, this.materials.metal);
        barrel.position.set(position[0], 0.6, position[2]);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        this.scene.add(barrel);

        this.colliders.push({
            type: 'cylinder',
            position: barrel.position.clone(),
            radius: 0.4,
            height: 1.2
        });

        this.coverObjects.push({
            position: barrel.position.clone(),
            radius: 0.4,
            height: 1.2
        });
    }

    /**
     * Create a simple vehicle
     */
    createVehicle(position, rotation) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);
        group.rotation.y = rotation;

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const body = new THREE.Mesh(bodyGeo, this.materials.wallDark);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.8, 2);
        const cabin = new THREE.Mesh(cabinGeo, this.materials.wallDark);
        cabin.position.set(0, 1.7, -0.5);
        cabin.castShadow = true;
        group.add(cabin);

        // Windows
        const windowGeo = new THREE.BoxGeometry(1.9, 0.5, 0.05);
        const windowMesh = new THREE.Mesh(windowGeo, this.materials.glass);
        windowMesh.position.set(0, 1.7, 0.5);
        group.add(windowMesh);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
        const wheelPositions = [[-1, 0.3, 1.2], [1, 0.3, 1.2], [-1, 0.3, -1.2], [1, 0.3, -1.2]];
        wheelPositions.forEach(wPos => {
            const wheel = new THREE.Mesh(wheelGeo, this.materials.wallDark);
            wheel.position.set(wPos[0], wPos[1], wPos[2]);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
        });

        this.scene.add(group);

        this.colliders.push({
            type: 'box',
            bounds: new THREE.Box3(
                new THREE.Vector3(position[0] - 1, 0, position[2] - 2),
                new THREE.Vector3(position[0] + 1, 2, position[2] + 2)
            )
        });

        this.coverObjects.push({
            position: new THREE.Vector3(position[0], 0, position[2]),
            radius: 2,
            height: 1.5
        });
    }

    /**
     * Create decorative elements
     */
    createDecorations() {
        // Light poles
        const polePositions = [
            [-10, 0, 0],
            [10, 0, 0],
            [-10, 0, 20],
            [10, 0, 20],
            [0, 0, -5]
        ];

        polePositions.forEach(pos => {
            this.createLightPole(pos);
        });

        // Pipes along walls
        this.createPipe([-24.5, 2, -15], 30, true);
        this.createPipe([24.5, 2, -15], 30, true);
    }

    /**
     * Create light pole
     */
    createLightPole(position) {
        const group = new THREE.Group();
        group.position.set(position[0], position[1], position[2]);

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        const pole = new THREE.Mesh(poleGeo, this.materials.metal);
        pole.position.y = 2;
        pole.castShadow = true;
        group.add(pole);

        // Light fixture
        const fixtureGeo = new THREE.BoxGeometry(0.4, 0.2, 0.4);
        const fixture = new THREE.Mesh(fixtureGeo, this.materials.metal);
        fixture.position.y = 4;
        group.add(fixture);

        this.scene.add(group);

        // Mark light zone
        this.lightZones.push({
            center: new THREE.Vector3(position[0], 0, position[2]),
            radius: 5
        });
    }

    /**
     * Create pipe decoration
     */
    createPipe(position, length, vertical) {
        const geo = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
        const pipe = new THREE.Mesh(geo, this.materials.metal);
        pipe.position.set(position[0], position[1], position[2]);
        if (!vertical) {
            pipe.rotation.z = Math.PI / 2;
        }
        this.scene.add(pipe);
    }

    /**
     * Create all lighting for the level
     */
    createLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404050, 0.4);
        this.scene.add(ambient);

        // Main directional light (moon)
        const directional = new THREE.DirectionalLight(0x8888aa, 0.6);
        directional.position.set(-20, 30, 10);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 100;
        directional.shadow.camera.left = -40;
        directional.shadow.camera.right = 40;
        directional.shadow.camera.top = 40;
        directional.shadow.camera.bottom = -40;
        directional.shadow.bias = -0.001;
        this.scene.add(directional);

        // Spotlight at entrance
        const entranceSpot = new THREE.SpotLight(0xffeecc, 1, 15, Math.PI / 6, 0.5);
        entranceSpot.position.set(0, 6, -5);
        entranceSpot.target.position.set(0, 0, 0);
        entranceSpot.castShadow = true;
        entranceSpot.shadow.mapSize.width = 512;
        entranceSpot.shadow.mapSize.height = 512;
        this.scene.add(entranceSpot);
        this.scene.add(entranceSpot.target);

        // Courtyard lights
        const courtyardLight1 = new THREE.PointLight(0xffddaa, 0.8, 15);
        courtyardLight1.position.set(-10, 4, 0);
        courtyardLight1.castShadow = true;
        this.scene.add(courtyardLight1);

        const courtyardLight2 = new THREE.PointLight(0xffddaa, 0.8, 15);
        courtyardLight2.position.set(10, 4, 0);
        courtyardLight2.castShadow = true;
        this.scene.add(courtyardLight2);

        // Interior lights
        const interiorLight = new THREE.PointLight(0xffffee, 0.6, 20);
        interiorLight.position.set(0, 3, -12);
        this.scene.add(interiorLight);

        // Office light (dimmer)
        const officeLight = new THREE.PointLight(0xffeedd, 0.4, 15);
        officeLight.position.set(0, 3, -25);
        this.scene.add(officeLight);

        // Red accent lights in corners
        const redLight1 = new THREE.PointLight(0xff0000, 0.3, 10);
        redLight1.position.set(-22, 2, -27);
        this.scene.add(redLight1);

        const redLight2 = new THREE.PointLight(0xff0000, 0.3, 10);
        redLight2.position.set(22, 2, -27);
        this.scene.add(redLight2);

        // Fog for atmosphere
        this.scene.fog = new THREE.Fog(0x0a0a15, 20, 60);
    }

    /**
     * Create escape zone
     */
    createEscapeZone() {
        // Escape zone at the south end
        const escapeGeo = new THREE.PlaneGeometry(10, 5);
        const escapeMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const escapePlane = new THREE.Mesh(escapeGeo, escapeMat);
        escapePlane.rotation.x = -Math.PI / 2;
        escapePlane.position.set(0, 0.1, 27);
        this.scene.add(escapePlane);

        // Visual marker
        const markerGeo = new THREE.BoxGeometry(0.3, 2, 0.3);
        const markerMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        
        const marker1 = new THREE.Mesh(markerGeo, markerMat);
        marker1.position.set(-5, 1, 27);
        this.scene.add(marker1);

        const marker2 = new THREE.Mesh(markerGeo, markerMat);
        marker2.position.set(5, 1, 27);
        this.scene.add(marker2);

        this.escapeZone = {
            min: new THREE.Vector3(-5, 0, 24),
            max: new THREE.Vector3(5, 3, 30)
        };
    }

    /**
     * Create restricted zones
     */
    createRestrictedZones() {
        // Office already added
        
        // Side rooms
        this.restrictedZones.push({
            min: new THREE.Vector3(-15, 0, -20),
            max: new THREE.Vector3(-5, 4, -10)
        });

        this.restrictedZones.push({
            min: new THREE.Vector3(5, 0, -20),
            max: new THREE.Vector3(15, 4, -10)
        });
    }

    /**
     * Create patrol route
     */
    createPatrolRoute(type) {
        const routes = {
            'courtyard_left': [
                new THREE.Vector3(-10, 0, 5),
                new THREE.Vector3(-10, 0, 15),
                new THREE.Vector3(-15, 0, 15),
                new THREE.Vector3(-15, 0, 5),
            ],
            'courtyard_right': [
                new THREE.Vector3(10, 0, 5),
                new THREE.Vector3(10, 0, 15),
                new THREE.Vector3(15, 0, 15),
                new THREE.Vector3(15, 0, 5),
            ],
            'interior_left': [
                new THREE.Vector3(-5, 0, -12),
                new THREE.Vector3(-5, 0, -8),
                new THREE.Vector3(-10, 0, -8),
                new THREE.Vector3(-10, 0, -15),
                new THREE.Vector3(-5, 0, -15),
            ],
            'interior_right': [
                new THREE.Vector3(5, 0, -12),
                new THREE.Vector3(5, 0, -8),
                new THREE.Vector3(10, 0, -8),
                new THREE.Vector3(10, 0, -15),
                new THREE.Vector3(5, 0, -15),
            ],
            'office': [
                new THREE.Vector3(-5, 0, -22),
                new THREE.Vector3(-5, 0, -26),
                new THREE.Vector3(5, 0, -26),
                new THREE.Vector3(5, 0, -22),
            ],
            'perimeter': [
                new THREE.Vector3(-20, 0, 25),
                new THREE.Vector3(-20, 0, -25),
                new THREE.Vector3(20, 0, -25),
                new THREE.Vector3(20, 0, 25),
            ]
        };

        return routes[type] || routes['courtyard_left'];
    }

    /**
     * Check if point is in a light zone
     */
    isInLightZone(position) {
        for (const zone of this.lightZones) {
            const dist = position.distanceTo(zone.center);
            if (dist < zone.radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if point is in a dark zone
     */
    isInDarkZone(position) {
        for (const zone of this.darkZones) {
            const dist = position.distanceTo(zone.center);
            if (dist < zone.radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if point is in restricted zone
     */
    isInRestrictedZone(position) {
        for (const zone of this.restrictedZones) {
            if (position.x >= zone.min.x && position.x <= zone.max.x &&
                position.y >= zone.min.y && position.y <= zone.max.y &&
                position.z >= zone.min.z && position.z <= zone.max.z) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if point is in escape zone
     */
    isInEscapeZone(position) {
        if (!this.escapeZone) return false;
        return (
            position.x >= this.escapeZone.min.x && position.x <= this.escapeZone.max.x &&
            position.z >= this.escapeZone.min.z && position.z <= this.escapeZone.max.z
        );
    }

    /**
     * Get lighting modifier for position
     */
    getLightingModifier(position) {
        if (this.isInLightZone(position)) {
            return 1.5; // Easier to detect
        }
        if (this.isInDarkZone(position)) {
            return 0.5; // Harder to detect
        }
        return 1.0;
    }
}

// Export for use
window.LevelBuilder = LevelBuilder;
