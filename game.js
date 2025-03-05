let playerHP = 100;
let scene, camera, renderer, controls, player, gun;
let move = { forward: false, backward: false, left: false, right: false };
let bullets = [];
let aliens = [];
const gravity = -0.02;
const floorY = 0;
const bulletSpeed = 10;
let touchStartX = 0;
let touchStartY = 0;
let playerVelocity = new THREE.Vector3(0, 0, 0);
const jumpPower = 0.5;
let isOnGround = false;
const treePositions = [];
const collisionObjects = [];

function updatePlayerHP(damage) {
    playerHP -= damage;
    console.log("Player HP:", playerHP);
}

function init() {
    // Initialize scene, camera, renderer, and controls
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    document.getElementById("startButton").addEventListener("click", () => {
        controls.lock();
        document.getElementById("startButton").style.display = "none";
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({ color: 0x228B22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = floorY;
    scene.add(ground);

    scene.background = new THREE.Color(0x000011);

    player = new THREE.Object3D();
    player.position.set(0, 2, 5);
    scene.add(player);
    player.add(camera);

    // New Gun Model (More detailed version)
    const gun = new THREE.Group();
    gun.name = "Gun"; // Important for bullets.js

    // 🔫 Gun Body (Main Frame)
    const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, 0.6), // ✅ Slimmer gun body
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    gunBody.position.set(0, -0.15, -0.3);
    gun.add(gunBody);

    // 🔫 Barrel (Longer & Rounded)
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.8), // 🔥 Increased length from 0.5 to 0.8
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -0.15, -0.9); // 🔥 Adjusted position to match longer barrel
    gun.add(barrel);
    
    // 🔫 Grip (Curved for a Realistic Feel)
    const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.3, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    grip.position.set(0, -0.3, 0);
    gun.add(grip);

    // ✅ Fix Gun Position in FPS View (Move it Right & Lower)
    gun.position.set(0.4, -0.2, -0.7); // ✅ Gun no longer inside the face 💀

    camera.add(gun); // Attach Gun to Camera

    // Load textures for buildings
    const textureLoader = new THREE.TextureLoader();
    const diffuseTexture = textureLoader.load('textures/color/brick-diffuse.jpg');
    const normalTextureDX = textureLoader.load('textures/normal/brick-normal-dx.jpg'); // DirectX normal
    const normalTextureGL = textureLoader.load('textures/normal/brick-normal-gl.jpg'); // OpenGL normal
    const roughnessTexture = textureLoader.load('textures/roughness/brick-roughness.jpg');
    const aoTexture = textureLoader.load('textures/ambient_occlusion/brick-ao.jpg'); // Ambient Occlusion
    const displacementTexture = textureLoader.load('textures/displacement/brick-displacement.jpg'); // Displacement map

    // Flip Y for DirectX normal texture
    normalTextureDX.flipY = true;

    // Select normal map based on your environment or preference
    const isDirectX = true; // Set to true if you're using DirectX style normal maps
    const normalTexture = isDirectX ? normalTextureDX : normalTextureGL;

    // Create a new building with textures
    function createBuilding(x, z) {
        const buildingHeight = Math.random() * 10 + 5;
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(10, buildingHeight, 10),
            new THREE.MeshStandardMaterial({
                map: diffuseTexture,
                normalMap: normalTexture, // Apply the correct normal map
                roughnessMap: roughnessTexture,
                aoMap: aoTexture,
                displacementMap: displacementTexture
            })
        );
        building.position.set(x, buildingHeight / 2, z);
        scene.add(building);
    }

    // Spawn the initial aliens and trees after scene is set up
    for (let i = 0; i < 5; i++) spawnAlien();
    animate();

    for (let i = 0; i < 20; i++) {
        let x = Math.random() * 80 - 40;
        let z = Math.random() * 80 - 40;
        createTree(x, z);
    }

    // Simple Map with Buildings and Collision (Now within init())
    const citySize = 5;
    const blockSize = 15;
    const roadWidth = 5;
    for (let x = -citySize; x <= citySize; x++) {
        for (let z = -citySize; z <= citySize; z++) {
            // Skip roads (leave gaps)
            if (x % 2 === 0 && z % 2 === 0) {
                createBuilding(x * blockSize, z * blockSize);
            } else {
                createRoad(x * blockSize, z * blockSize);
            }
        }
    }

    // Tree Placement and Collision
    for (let x = -citySize; x <= citySize; x++) {
        for (let z = -citySize; z <= citySize; z++) {
            if (x % 2 !== 0 && z % 2 === 0) { // Trees only on sidewalks
                createTree(x * blockSize + 5, z * blockSize);
                createTree(x * blockSize - 5, z * blockSize);
            }
        }
    }
}

function spawnAlien() {
    let alien = new THREE.Group();

    let body = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    body.position.y = 1.6;
    alien.add(body);

    let eyeL = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    eyeL.position.set(-0.3, 2.2, 0.6);
    alien.add(eyeL);

    let eyeR = eyeL.clone();
    eyeR.position.x = 0.3;
    alien.add(eyeR);

    let legL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    legL.position.set(-0.4, 0.5, 0);
    alien.add(legL);

    let legR = legL.clone();
    legR.position.x = 0.4;
    alien.add(legR);

    let armL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    armL.position.set(-0.8, 1.5, 0);
    armL.rotation.z = Math.PI / 4;
    alien.add(armL);

    let armR = armL.clone();
    armR.position.x = 0.8;
    armR.rotation.z = -Math.PI / 4;
    alien.add(armR);

    alien.position.set(Math.random() * 20 - 10, 0, Math.random() * -20);
    scene.add(alien);
    aliens.push({ entity: alien, hitbox: new THREE.Sphere(alien.position, 1.5) });
}

function moveAliens(delta) {
    aliens.forEach(alien => {
        let direction = new THREE.Vector3();
        let playerPos = new THREE.Vector3();
        player.getWorldPosition(playerPos);
        direction.subVectors(playerPos, alien.entity.position).normalize();
        alien.entity.position.addScaledVector(direction, delta * 2);
        alien.entity.lookAt(playerPos);

        if (alien.entity.position.distanceTo(playerPos) < 1.5) {
            updatePlayerHP(10);
        }
    });
}

function checkCollision(newX, newZ) {
    // Check against tree collision
    for (let tree of treePositions) {
        let distance = Math.sqrt((newX - tree.x) ** 2 + (newZ - tree.z) ** 2);
        // Adjust the collision radius if needed based on player size or tree size
        const treeCollisionRadius = 2; // Adjust based on tree size
        if (distance < treeCollisionRadius) return true; // If player is too close to a tree, stop movement
    }

    // Check against building collisions
    for (let building of collisionObjects) {
        // Ensure the bounding box exists and the point is a valid Vector3
        if (building.boundingBox) {
            // Create a player bounding box for better collision checks
            const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(newX, 0, newZ), 
                new THREE.Vector3(1, 2, 1) // Assume player's size (adjust as needed)
            );
            
            // Check if the player's bounding box intersects the building's bounding box
            if (building.boundingBox.intersectsBox(playerBoundingBox)) {
                return true; // If player collides with any building
            }
        }
    }

    return false; // No collision detected
}

// Simple Map with Buildings and Collision
const citySize = 5;
const blockSize = 15;
const roadWidth = 5;

function createBuilding(x, z) {
    const buildingHeight = Math.random() * 10 + 5; // Random height between 5 and 15
    const buildingWidth = Math.random() * 5 + 5; // Random width between 5 and 10
    const buildingDepth = Math.random() * 5 + 5; // Random depth between 5 and 10

    const building = new THREE.Group();

    // Load textures
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('textures/brick-wall.jpg'); // Path to your texture
    const windowTexture = textureLoader.load('textures/window-glass.jpg'); // Path to window texture
    const roofTexture = textureLoader.load('textures/roof-tile.jpg'); // Path to roof texture

    // Main Building Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth + 0.1, buildingHeight + 0.1, buildingDepth + 0.1), // Increased size to cover gaps
        new THREE.MeshStandardMaterial({
            map: wallTexture, // Apply the wall texture
            roughness: 0.7,
            metalness: 0.2
        })
    );
    building.add(body);

    // Windows
    for (let i = 0; i < Math.random() * 3 + 2; i++) { // Random number of windows
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 0.1),
            new THREE.MeshStandardMaterial({
                map: windowTexture, // Apply the window texture (glass)
                transparent: true,
                opacity: 0.6
            })
        );
        window.position.set(
            Math.random() * (buildingWidth - 2) - (buildingWidth / 2), // Random X
            Math.random() * (buildingHeight - 4) - (buildingHeight / 2), // Random Y
            Math.random() * (buildingDepth - 2) - (buildingDepth / 2) // Random Z
        );
        building.add(window);
    }

    // Roof
    const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(buildingWidth / 2, buildingWidth / 2, 1, 6),
        new THREE.MeshStandardMaterial({
            map: roofTexture, // Apply roof texture
            roughness: 0.8,
            metalness: 0.5
        })
    );
    roof.position.y = buildingHeight / 2 + 0.5; // Position it on top
    building.add(roof);

    // Snapping Position to Grid to Prevent Gaps
    const gridSize = 10; // You can change this value based on your needs
    building.position.set(Math.floor(x / gridSize) * gridSize, floorY, Math.floor(z / gridSize) * gridSize);

    scene.add(building);
}

function createRoad(x, z) {
    if (!scene) {
        console.error("Scene is not initialized yet!");
        return;
    }

    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(blockSize, blockSize),
        new THREE.MeshStandardMaterial({ color: 0x333333 }) // Darker roads
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, z);
    scene.add(road);

    // Sidewalks
    const sidewalk = new THREE.Mesh(
        new THREE.PlaneGeometry(blockSize - roadWidth, blockSize - roadWidth),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(x, 0.02, z);
    scene.add(sidewalk);
}

function createTree(x, z) {
    // Tree Trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 2), // Thin cylinder for trunk
        new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown color
    );
    trunk.position.set(x, 1, z);
    
    // Tree Leaves (Sphere)
    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8), // Round canopy
        new THREE.MeshStandardMaterial({ color: 0x228B22 }) // Green color
    );
    leaves.position.set(x, 2.5, z);

    scene.add(trunk);
    scene.add(leaves);

    // Add tree collision
    collisionObjects.push(trunk);
    collisionObjects.push(leaves);

    // Store tree position for collision checks
    treePositions.push({ x, z });
}

function applyGravity() {
    if (player.position.y > floorY + 1.6) {
        player.position.y += gravity;
    } else {
        player.position.y = floorY + 1.6;
    }
}

const clock = new THREE.Clock();

function shoot() {
    if (!camera) {
        console.error("Camera is not defined.");
        return;
    }

    let bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffff00 })
    );
    let bulletDir = new THREE.Vector3();
    camera.getWorldDirection(bulletDir);
    let camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    bullet.position.copy(camPos).addScaledVector(bulletDir, 1);
    bullet.velocity = bulletDir.clone().multiplyScalar(bulletSpeed);
    scene.add(bullet);
    bullets.push(bullet);
}

function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        bullet.position.addScaledVector(bullet.velocity, delta);

        for (let j = aliens.length - 1; j >= 0; j--) {
            let alien = aliens[j];
            if (bullet.position.distanceTo(alien.entity.position) < 1.5) {
                scene.remove(alien.entity);
                aliens.splice(j, 1);
                scene.remove(bullet);
                bullets.splice(i, 1);
                setTimeout(spawnAlien, 3000);
                return;
            }
        }

        if (bullet.position.z < -50) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function movePlayer(delta) {
    const speed = 4 * delta;
    let moveDirection = new THREE.Vector3();

    if (move.forward) moveDirection.z -= 1;
    if (move.backward) moveDirection.z += 1;
    if (move.left) moveDirection.x -= 1;
    if (move.right) moveDirection.x += 1;

    if (moveDirection.length() === 0) return;

    moveDirection.normalize();
    moveDirection.applyQuaternion(camera.quaternion);
    moveDirection.y = 0;

    // Predict new position (without instantaneous jumps)
    let newPosition = player.position.clone().addScaledVector(moveDirection, speed);

    // Collision check with a smoother response
    if (!checkCollision(newPosition.x, newPosition.z)) {
        player.position.copy(newPosition);
    } else {
        // Handle stopping or sliding if collision is detected
        player.position.addScaledVector(moveDirection, -speed * 0.5); // Slide back a little or stop the player
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = 0.05;
    movePlayer(delta);
    applyGravity();
    updateBullets(delta);
    moveAliens(delta);
    renderer.render(scene, camera);
}

document.addEventListener("keydown", (event) => {
if (event.code === "KeyW") move.forward = true;
if (event.code === "KeyS") move.backward = true;
if (event.code === "KeyA") move.left = true;
if (event.code === "KeyD") move.right = true;
});

document.addEventListener("keyup", (event) => {
if (event.code === "KeyW") move.forward = false;
if (event.code === "KeyS") move.backward = false;
if (event.code === "KeyA") move.left = false;
if (event.code === "KeyD") move.right = false;
});

document.addEventListener("mousedown", (event) => {
if (event.button === 0) shoot(); 
});

document.addEventListener("keydown", (event) => {
if (event.code === "Space" && isOnGround) { 
playerVelocity.y = jumpPower;
isOnGround = false;
}
});

window.onload = function() {
    setupMobileControls();
};

function setupMobileControls() {
    const mobileButtonSize = 100;

    const mobileMoveUpButton = createButton('Move Up', 'moveUp', window.innerWidth - mobileButtonSize - 20, window.innerHeight - mobileButtonSize - 20);
    const mobileMoveLeftButton = createButton('Move Left', 'moveLeft', 20, window.innerHeight - mobileButtonSize - 20);
    const mobileMoveRightButton = createButton('Move Right', 'moveRight', 120, window.innerHeight - mobileButtonSize - 20);
    const mobileMoveBackButton = createButton('Move Back', 'moveBack', 220, window.innerHeight - mobileButtonSize - 20); // Added back button
    const mobileJumpButton = createButton('Jump', 'jump', window.innerWidth - mobileButtonSize - 20, 20);

    // Add buttons to the body
    document.body.appendChild(mobileMoveUpButton);
    document.body.appendChild(mobileMoveLeftButton);
    document.body.appendChild(mobileMoveRightButton);
    document.body.appendChild(mobileMoveBackButton); // Add to the DOM
    document.body.appendChild(mobileJumpButton);
}

function createButton(label, id, left, top) {
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = label;
    button.style.position = 'absolute';
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.width = '100px';
    button.style.height = '100px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '10px';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';
    button.addEventListener('touchstart', onTouchStart);
    button.addEventListener('touchend', onTouchEnd);
    return button;
}

let initialCameraPosition = new THREE.Vector3(); // Store initial camera position
let mobileYaw = 0, mobilePitch = 0;
const mobileSensitivity = 0.004;  // Same as your mouse sensitivity
const mobileMaxPitch = 0;
const mobileMinPitch = 0;

let mobileTouchStartX = 0, mobileTouchStartY = 0;
let isMoving = false;

// Initialize camera position at the start
function initializeCamera() {
    initialCameraPosition = camera.position.clone();
}

// Touch start listener to track touch positions and movement
document.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
        mobileTouchStartX = event.touches[0].clientX;
        mobileTouchStartY = event.touches[0].clientY;
        isMoving = false; // Reset moving flag on touch start
    }
});

// Touch move listener to update yaw and pitch for camera rotation
document.addEventListener("touchmove", (event) => {
    if (event.touches.length === 1) {
        const mobileDeltaX = event.touches[0].clientX - mobileTouchStartX;
        const mobileDeltaY = event.touches[0].clientY - mobileTouchStartY;

        // If the swipe distance is substantial enough, mark as moving
        if (Math.abs(mobileDeltaX) > 10 || Math.abs(mobileDeltaY) > 10) {
            isMoving = true;
        }

        // Only update camera if we are moving
        if (isMoving) {
            mobileYaw -= mobileDeltaX * mobileSensitivity;
            mobilePitch -= mobileDeltaY * mobileSensitivity;

            mobilePitch = Math.max(mobileMinPitch, Math.min(mobileMaxPitch, mobilePitch));

            const mobileQuaternion = new THREE.Quaternion();
            mobileQuaternion.setFromEuler(new THREE.Euler(mobilePitch, mobileYaw, 0, 'YXZ'));
            camera.rotation.setFromQuaternion(mobileQuaternion);
        }
    }
});

// Handle touch start events for movement actions (up, left, right, back, jump)
function onTouchStart(event) {
    switch (event.target.id) {
        case 'moveUp':
            move.forward = true;
            break;
        case 'moveLeft':
            move.left = true;
            break;
        case 'moveRight':
            move.right = true;
            break;
        case 'moveBack': // Handle moving back
            move.backward = true;
            break;
        case 'jump':
            if (isOnGround) {
                playerVelocity.y = jumpPower;
                isOnGround = false;
            }
            break;
    }
}

// Handle touch end events for movement actions (stop movement)
function onTouchEnd(event) {
    switch (event.target.id) {
        case 'moveUp':
            move.forward = false;
            break;
        case 'moveLeft':
            move.left = false;
            break;
        case 'moveRight':
            move.right = false;
            break;
        case 'moveBack': // Stop moving backward when touch ends
            move.backward = false;
            break;
    }

    // Ensure camera position remains intact
    if (camera.position.equals(initialCameraPosition)) {
        console.log("Camera position is intact.");
    }
}

// Initialize camera once on startup
initializeCamera();

let yaw = 0, pitch = 0;
const sensitivity = 0.004;
const maxPitch = Math.PI / 2;
const minPitch = -Math.PI / 2;

document.addEventListener("mousemove", (event) => {
    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;

    // Prevent camera flipping by clamping pitch
    pitch = Math.max(minPitch, Math.min(maxPitch, pitch));

    // Update camera rotation using Quaternions
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.rotation.setFromQuaternion(quaternion);
});

init();
