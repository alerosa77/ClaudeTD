class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = 15;
        this.maxHealth = 15;
        this.speed = (TILE_SIZE / 3) * 1.2;
        this.targetBuilding = null;
        this.buildingDamageTimer = 0;
        this.glowIntensity = 0.5;
        this.glowDirection = 1;
        this.scale = 1.0;
        this.baseSize = TILE_SIZE * 0.8;
        
        this.sprite = new Image();
        this.sprite.src = ENEMY_ASSETS.normal;
        
        // Add movement angle tracking
        this.angle = 0;
    }

    get size() {
        return this.baseSize * this.scale;
    }

    isVisible() {
        return gameMap.isVisible(Math.floor(this.x / TILE_SIZE), Math.floor(this.y / TILE_SIZE));
    }

    findClosestBuilding() {
        let closestDist = Infinity;
        let closest = null;

        buildings.forEach(building => {
            const dx = building.centerX - this.x;
            const dy = building.centerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestDist = dist;
                closest = building;
            }
        });

        return closest;
    }

    update(deltaTime) {
        this.targetBuilding = this.findClosestBuilding();

        if (this.targetBuilding) {
            const dx = this.targetBuilding.centerX - this.x;
            const dy = this.targetBuilding.centerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < TILE_SIZE) {
                this.buildingDamageTimer += deltaTime;
                if (this.buildingDamageTimer >= 1000) {
                    const index = buildings.indexOf(this.targetBuilding);
                    if (index > -1) {
                        buildings.splice(index, 1);
                    }
                    this.buildingDamageTimer = 0;
                }
            } else {
                const moveDistance = this.speed * (deltaTime / 1000);
                this.x += (dx / dist) * moveDistance;
                this.y += (dy / dist) * moveDistance;
                
                // Update angle (subtract PI/2 because sprite faces down by default)
                this.angle = Math.atan2(dy, dx) - Math.PI/2;
                
                this.buildingDamageTimer = 0;
            }
        }
        
        this.glowIntensity += this.glowDirection * deltaTime * 0.001;
        if (this.glowIntensity <= 0.5) {
            this.glowIntensity = 0.5;
            this.glowDirection = 1;
        } else if (this.glowIntensity >= 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    render(ctx) {
        if (!this.isVisible()) return;

        const screenPos = camera.worldToScreen(
            this.x / TILE_SIZE, 
            this.y / TILE_SIZE
        );

        if (this.sprite && this.sprite.complete) {
            ctx.save();
            
            // Calculate center point for rotation
            const centerX = screenPos.x;
            const centerY = screenPos.y;
            
            // Apply rotation around center
            ctx.translate(centerX, centerY);
            ctx.rotate(this.angle);
            
            // Draw the sprite centered on rotation point
            ctx.drawImage(
                this.sprite,
                -this.size * camera.zoom / 2,
                -this.size * camera.zoom / 2,
                this.size * camera.zoom,
                this.size * camera.zoom
            );
            
            ctx.restore();
        } else {
            // Fallback to original rendering if sprite not loaded
            // Draw outer glow
            const gradient = ctx.createRadialGradient(
                screenPos.x,
                screenPos.y,
                0,
                screenPos.x,
                screenPos.y,
                this.size * camera.zoom
            );
            
            const alpha = this.glowIntensity * ENEMY_BASE_ALPHA;
            gradient.addColorStop(0, `${ENEMY_COLOR}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.5, `${ENEMY_COLOR}${Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${ENEMY_COLOR}00`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.size * camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            // Draw core
            ctx.fillStyle = `${ENEMY_COLOR}${Math.floor(this.glowIntensity * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, ENEMY_CORE_SIZE * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}