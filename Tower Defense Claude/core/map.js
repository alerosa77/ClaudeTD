class Resource {
    constructor() {
        this.amount = 100 + Math.floor(Math.random() * 100);
        this.depleted = false;
    }
}

class PerlinNoise {
    constructor() {
        this.perm = new Array(512);
        const permutation = new Array(256).fill(0)
            .map((_, i) => i)
            .sort(() => Math.random() - 0.5);
            
        for (let i = 0; i < 512; i++) {
            this.perm[i] = permutation[i & 255];
        }
    }

    noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;
        
        return this.lerp(v,
            this.lerp(u,
                this.grad(this.perm[A], x, y),
                this.grad(this.perm[B], x - 1, y)
            ),
            this.lerp(u,
                this.grad(this.perm[A + 1], x, y - 1),
                this.grad(this.perm[B + 1], x - 1, y - 1)
            )
        );
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : 0;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }
}

class GameMap {
    constructor(width = MAP_SIZE, height = MAP_SIZE) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.visibilityMap = new Array(height).fill(null).map(() => 
            new Array(width).fill(Infinity)
        );
        
        // Initialize textures
        this.plainTextures = {};
        this.texturesLoaded = 0;
        this.totalTextures = Object.keys(PLAIN_TILE_TEXTURES).length + 1; // +1 for resource

        // Load plain textures
        for (const [key, url] of Object.entries(PLAIN_TILE_TEXTURES)) {
            this.plainTextures[key] = new Image();
            this.plainTextures[key].onload = () => {
                this.texturesLoaded++;
            };
            this.plainTextures[key].src = url;
        }

        // Load resource texture
        this.resourceTexture = new Image();
        this.resourceTexture.onload = () => {
            this.texturesLoaded++;
        };
        this.resourceTexture.src = RESOURCE_TEXTURE;
        
        // Initialize noise generator for resources only
        this.resourceNoise = new PerlinNoise();
        
        this.generate();
    }
    
    isTextureLoaded(texture) {
        return texture && texture.complete && texture.naturalHeight !== 0;
    }

    generate() {
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                let edgeDistance = Math.min(
                    Math.min(x, this.width - x),
                    Math.min(y, this.height - y)
                );
                
                // Check for resources using Perlin noise
                const resourceNoise = this.resourceNoise.noise2D(
                    x * RESOURCE_CLUSTER.NOISE_SCALE, 
                    y * RESOURCE_CLUSTER.NOISE_SCALE
                );

                if (edgeDistance >= 5 && resourceNoise > RESOURCE_CLUSTER.THRESHOLD) {
                    this.tiles[y][x] = {
                        type: 'resource',
                        resource: new Resource(),
                        rotation: Math.floor(Math.random() * 4) * 90,
                        darkness: Math.random() * 0.05
                    };
                } else {
                    // Default to grass
                    let tileType = 'GRASS';
                    
                    // Check each alternative type with its random chance
                    for (const [type, chance] of Object.entries(ALTERNATIVE_TILE_CHANCES)) {
                        if (Math.random() < chance) {
                            tileType = type;
                            break;
                        }
                    }

                    this.tiles[y][x] = {
                        type: 'plain',
                        plainType: tileType,
                        rotation: Math.floor(Math.random() * 4) * 90,
                        darkness: Math.random() * 0.05
                    };
                }
            }
        }
    }

    updateVisibility() {
        this.visibilityMap = new Array(this.height).fill(null).map(() => 
            new Array(this.width).fill(Infinity)
        );

        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const distFromCenterX = Math.abs(x - centerX);
                const distFromCenterY = Math.abs(y - centerY);
                if (distFromCenterX <= CENTER_VISIBILITY_RANGE && 
                    distFromCenterY <= CENTER_VISIBILITY_RANGE) {
                    this.visibilityMap[y][x] = 0;
                }
            }
        }

        buildings.forEach(building => {
            const range = VISIBILITY_RANGE + 2;
            for (let dy = -range; dy <= range; dy++) {
                for (let dx = -range; dx <= range; dx++) {
                    const x = Math.floor(building.x + dx);
                    const y = Math.floor(building.y + dy);
                    
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        this.visibilityMap[y][x] = Math.min(
                            this.visibilityMap[y][x], 
                            dist
                        );
                    }
                }
            }
        });
    }

    isVisible(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.visibilityMap[y][x] <= VISIBILITY_RANGE;
    }

    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }

    render(ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    this.updateVisibility();

    const startX = Math.floor(camera.x / (TILE_SIZE * camera.zoom));
    const startY = Math.floor(camera.y / (TILE_SIZE * camera.zoom));
    const endX = Math.ceil((camera.x + canvas.width) / (TILE_SIZE * camera.zoom));
    const endY = Math.ceil((camera.y + canvas.height) / (TILE_SIZE * camera.zoom));

    // First render all tiles
    for (let y = Math.max(0, startY); y < Math.min(endY, this.height); y++) {
        for (let x = Math.max(0, startX); x < Math.min(endX, this.width); x++) {
            const tile = this.tiles[y][x];
            const screenPos = camera.worldToScreen(x, y);

            if (tile.type === 'plain') {
                const texture = this.plainTextures[tile.plainType];
                if (this.isTextureLoaded(texture)) {
                    ctx.save();
                    
                    const centerX = screenPos.x + (TILE_SIZE * camera.zoom) / 2;
                    const centerY = screenPos.y + (TILE_SIZE * camera.zoom) / 2;
                    
                    ctx.translate(centerX, centerY);
                    ctx.rotate((tile.rotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);
                    
                    ctx.drawImage(
                        texture,
                        screenPos.x - 0.5,
                        screenPos.y - 0.5,
                        (TILE_SIZE * camera.zoom) + 1,
                        (TILE_SIZE * camera.zoom) + 1
                    );
                    
                    if (tile.darkness > 0) {
                        ctx.fillStyle = `rgba(0, 0, 0, ${tile.darkness})`;
                        ctx.fillRect(
                            screenPos.x - 0.5,
                            screenPos.y - 0.5,
                            (TILE_SIZE * camera.zoom) + 1,
                            (TILE_SIZE * camera.zoom) + 1
                        );
                    }
                    
                    ctx.restore();
                }
            } else if (tile.type === 'resource') {
                if (this.isTextureLoaded(this.resourceTexture)) {
                    ctx.save();
                    
                    const centerX = screenPos.x + (TILE_SIZE * camera.zoom) / 2;
                    const centerY = screenPos.y + (TILE_SIZE * camera.zoom) / 2;
                    
                    ctx.translate(centerX, centerY);
                    ctx.rotate((tile.rotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);

                    ctx.drawImage(
                        this.resourceTexture,
                        screenPos.x - 0.5,
                        screenPos.y - 0.5,
                        (TILE_SIZE * camera.zoom) + 1,
                        (TILE_SIZE * camera.zoom) + 1
                    );

                    // Apply darkness based on resource amount
                    const darkness = this.getResourceDarkness(tile.resource.amount);
                    if (darkness > 0) {
                        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
                        ctx.fillRect(
                            screenPos.x - 0.1,
                            screenPos.y - 0.1,
                            (TILE_SIZE * camera.zoom) + 0.2,
                            (TILE_SIZE * camera.zoom) + 0.2
                        );
                    }

                    ctx.restore();
                }
            }
        }
    }

    // Draw all fog of war at once
    ctx.beginPath();
    for (let y = Math.max(0, startY); y < Math.min(endY, this.height); y++) {
        for (let x = Math.max(0, startX); x < Math.min(endX, this.width); x++) {
            const distance = this.visibilityMap[y][x];
            if (distance > VISIBILITY_RANGE) {
                const screenPos = camera.worldToScreen(x, y);
                // For completely dark areas
                if (distance > VISIBILITY_RANGE + 2) {
                    ctx.rect(
                        screenPos.x,
                        screenPos.y,
                        TILE_SIZE * camera.zoom,
                        TILE_SIZE * camera.zoom
                    );
                }
            }
        }
    }
    ctx.fillStyle = `rgba(0, 0, 0, ${FOG_DARKNESS})`;
    ctx.fill();

    // Draw partially dark areas separately
    ctx.beginPath();
    for (let y = Math.max(0, startY); y < Math.min(endY, this.height); y++) {
        for (let x = Math.max(0, startX); x < Math.min(endX, this.width); x++) {
            const distance = this.visibilityMap[y][x];
            const screenPos = camera.worldToScreen(x, y);
            
            if (distance > VISIBILITY_RANGE && distance <= VISIBILITY_RANGE + 1) {
                ctx.rect(
                    screenPos.x,
                    screenPos.y,
                    TILE_SIZE * camera.zoom,
                    TILE_SIZE * camera.zoom
                );
            }
        }
    }
    ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
    ctx.fill();

    // Draw medium dark areas
    ctx.beginPath();
    for (let y = Math.max(0, startY); y < Math.min(endY, this.height); y++) {
        for (let x = Math.max(0, startX); x < Math.min(endX, this.width); x++) {
            const distance = this.visibilityMap[y][x];
            const screenPos = camera.worldToScreen(x, y);
            
            if (distance > VISIBILITY_RANGE + 1 && distance <= VISIBILITY_RANGE + 2) {
                ctx.rect(
                    screenPos.x,
                    screenPos.y,
                    TILE_SIZE * camera.zoom,
                    TILE_SIZE * camera.zoom
                );
            }
        }
    }
    ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
    ctx.fill();
}

    getResourceDarkness(amount) {
        if (amount >= 150) return RESOURCE_DARKENING.FULL;
        if (amount >= 100) return RESOURCE_DARKENING.HIGH;
        if (amount >= 50) return RESOURCE_DARKENING.MEDIUM;
        if (amount > 0) return RESOURCE_DARKENING.LOW;
        return RESOURCE_DARKENING.DEPLETED;
    }
}

const gameMap = new GameMap();