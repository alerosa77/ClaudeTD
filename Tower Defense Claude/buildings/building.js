class Building {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = BUILDING_TYPES[type].size;
        this.lastSparkTime = 0;
        this.sparkPower = 0;
        this.id = Math.random().toString(36);
        this.harvestingTargets = new Set();
        
        // Tower specific properties
        this.lastAttackTime = 0;
        // this.lastRotationTime = Date.now();
        this.currentTarget = null;
        this.targetAngle = 0;
        this.currentAngle = 0;
        this.rotationSpeed = Math.PI / 4000; // PI/1000 radians per ms = full rotation in 2 seconds
        this.canFire = false; // Only true when properly aimed
        this.shouldRenderLaser = false;
        // this.lastUpdateTime = Date.now();


        // Load sprite if it's a tower or harvester
        if (BUILDING_ASSETS[type]) {
            this.sprite = new Image();
            this.sprite.src = BUILDING_ASSETS[type];
        }
    }

   get centerX() {
    if (this.size === 2) {
        // For 2x2 buildings, center is one tile right from top-left corner
        return (this.x + 1) * TILE_SIZE;
    } else {
        // For other buildings, center is in middle of their tile
        return this.x * TILE_SIZE + TILE_SIZE / 2;
    }
}

    get centerY() {
    if (this.size === 2) {
        // For 2x2 buildings, center is one tile down from top-left corner
        return (this.y + 1) * TILE_SIZE;
    } else {
        // For other buildings, center is in middle of their tile
        return this.y * TILE_SIZE + TILE_SIZE / 2;
    }
}

    canReceivePower() {
        if (this.type === 'harvester' || this.type === 'tower') {
            return this.sparkPower < 10.0;
        }
        return false;
    }

    findClosestEnemy() {
        if (!waveManager || !waveManager.enemies) return null;
        
        let closestDist = TOWER_RANGE;
        let closest = null;

        waveManager.enemies.forEach(enemy => {
            if (enemy.isVisible()) {
                const dx = enemy.x - this.centerX;
                const dy = enemy.y - this.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        });

        return closest;
    }

    updateTower(currentTime) {
        if (this.sparkPower <= 0) {
            this.currentTarget = null;
            this.canFire = false;
            this.shouldRenderLaser = false;
            return;
        }

        if (!this.currentTarget || !this.currentTarget.isVisible()) {
            const previousAngle = this.currentAngle;
            const newTarget = this.findClosestEnemy();
            if (newTarget) {
                this.currentTarget = newTarget;
                const dx = this.currentTarget.x - this.centerX;
                const dy = this.currentTarget.y - this.centerY;
                this.targetAngle = Math.atan2(dy, dx) - Math.PI/2;
                this.shouldRenderLaser = false;
                this.canFire = false;
                this.lastUpdateTime = Date.now(); // Reset timer when new target acquired
            } else {
                this.canFire = false;
                this.shouldRenderLaser = false;
                return;
            }
        }

        if (this.currentTarget) {
            const dx = this.currentTarget.x - this.centerX;
            const dy = this.currentTarget.y - this.centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > TOWER_RANGE) {
                const previousAngle = this.currentAngle;
                this.currentTarget = this.findClosestEnemy();
                if (!this.currentTarget) {
                    this.canFire = false;
                    this.shouldRenderLaser = false;
                    this.currentAngle = previousAngle;
                    return;
                }
            }

            this.targetAngle = Math.atan2(dy, dx) - Math.PI/2;
            let angleDiff = ((this.targetAngle - this.currentAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
            
            if (Math.abs(angleDiff) > 0.05) {
                const deltaTime = currentTime - this.lastUpdateTime;
                const rotationStep = this.rotationSpeed * deltaTime;
                this.currentAngle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationStep);
                this.lastUpdateTime = currentTime;
                this.canFire = false;
                this.shouldRenderLaser = false;
                } else {
                this.canFire = true;
                this.shouldRenderLaser = true;
            }
        }

        if (this.currentTarget && this.canFire && currentTime - this.lastAttackTime >= TOWER_ATTACK_RATE) {
            if (this.currentTarget.takeDamage(TOWER_DAMAGE)) {
                const index = waveManager.enemies.indexOf(this.currentTarget);
                if (index > -1) {
                    waveManager.enemies.splice(index, 1);
                }
                this.currentTarget = null;
                this.canFire = false;
                this.shouldRenderLaser = false;
            }

            const secondsElapsed = TOWER_ATTACK_RATE / 1000;
            this.sparkPower = Math.max(0, this.sparkPower - TOWER_POWER_CONSUMPTION_RATE * secondsElapsed);
            this.lastAttackTime = currentTime;
        }
    }

    updateHarvesting(deltaTime) {
        const secondsElapsed = deltaTime / 1000;
        this.harvestingTargets.clear();

        // Find resources in range
        const range = BUILDING_TYPES.harvester.collectionRange;
        for (let y = Math.floor(this.y - range); y <= Math.ceil(this.y + range); y++) {
            for (let x = Math.floor(this.x - range); x <= Math.ceil(this.x + range); x++) {
                const tile = gameMap.getTile(x, y);
                if (!tile || tile.type !== 'resource' || tile.resource.depleted) continue;

                const distance = Math.sqrt(
                    Math.pow((x + 0.5) - (this.x + this.size/2), 2) + 
                    Math.pow((y + 0.5) - (this.y + this.size/2), 2)
                );

                if (distance <= range) {
                    this.harvestingTargets.add({x, y});
                    
                    const collectionAmount = RESOURCE_COLLECTION_RATE * secondsElapsed;
                    if (tile.resource.amount >= collectionAmount) {
                        tile.resource.amount -= collectionAmount;
                        dnaUnits += collectionAmount;
                        
                        if (tile.resource.amount <= 0) {
                            tile.resource.depleted = true;
                        }
                    }
                }
            }
        }

        // Consume power if actively harvesting
        if (this.harvestingTargets.size > 0) {
            this.sparkPower = Math.max(0, this.sparkPower - POWER_CONSUMPTION_RATE * secondsElapsed);
        }
    }

    update(deltaTime) {
        const currentTime = Date.now();

        if (this.type === 'harvester' && this.sparkPower > 0) {
            this.updateHarvesting(deltaTime);
        } else if (this.type === 'tower') {
            this.updateTower(currentTime);
        }
    }

    renderLaserBeam(ctx, startX, startY, endX, endY, color, hasGlow = true) {

        // Calculate adjusted start position if this is a harvester
        if (this.type === 'harvester') {
            const dx = endX - startX;
            const dy = endY - startY;
            const angle = Math.atan2(dy, dx);
            const radius = (TILE_SIZE * 0.3) * camera.zoom; // Radius from center where laser starts
            
            // Adjust start position to be on the circle around harvester center
            startX += Math.cos(angle) * radius;
            startY += Math.sin(angle) * radius;
        }

   
            // Get correct values based on type
            const isHarvester = color === HARVESTER_LASER_COLOR;
            const glowWidth = isHarvester ? HARVESTER_LASER_GLOW_WIDTH : TOWER_LASER_GLOW_WIDTH;
            const glowIntensity = isHarvester ? HARVESTER_GLOW_INTENSITY : TOWER_GLOW_INTENSITY;

            // Outermost glow
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = glowWidth * camera.zoom;
            ctx.globalAlpha = glowIntensity;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Middle glow
            ctx.beginPath();
            ctx.lineWidth = (glowWidth / 2) * camera.zoom;
            ctx.globalAlpha = glowIntensity * 2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Inner glow
            ctx.beginPath();
            ctx.lineWidth = (glowWidth / 4) * camera.zoom;
            ctx.globalAlpha = glowIntensity * 4;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        

        // Core beam
        const laserWidth = color === HARVESTER_LASER_COLOR ? HARVESTER_LASER_WIDTH : TOWER_LASER_WIDTH;
        ctx.beginPath();
        ctx.lineWidth = laserWidth * camera.zoom;
        ctx.globalAlpha = 1;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }

    render(ctx) {
        const screenPos = camera.worldToScreen(this.x, this.y);
        
        let drawPos;
        if (this.size === 2) {
            drawPos = {
                x: screenPos.x + (TILE_SIZE * camera.zoom) - (TILE_SIZE * this.size * camera.zoom) / 2,
                y: screenPos.y + (TILE_SIZE * camera.zoom) - (TILE_SIZE * this.size * camera.zoom) / 2
            };
        } else {
            const tileCenter = {
                x: screenPos.x + (TILE_SIZE * camera.zoom) / 2,
                y: screenPos.y + (TILE_SIZE * camera.zoom) / 2
            };
            const buildingSizePixels = TILE_SIZE * this.size;
            drawPos = {
                x: tileCenter.x - (buildingSizePixels * camera.zoom) / 2,
                y: tileCenter.y - (buildingSizePixels * camera.zoom) / 2
            };
        }
        
        if (this.sprite && (this.type === 'tower' || this.type === 'harvester' || this.type === 'powerPlant' || this.type === 'pylon')) {
            if (this.type === 'pylon') {
                ctx.save();
                const centerX = drawPos.x + (TILE_SIZE * this.size * camera.zoom) / 2;
                const centerY = drawPos.y + (TILE_SIZE * this.size * camera.zoom) / 2;
                const glowSize = TILE_SIZE * this.size * 1.3;
                
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, glowSize * camera.zoom
                );
                gradient.addColorStop(0, `${PYLON_GLOW.COLOR}${Math.floor(PYLON_GLOW.INTENSITY * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, `${PYLON_GLOW.COLOR}00`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, glowSize * camera.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            if (this.type === 'tower') {
                ctx.save();
                const centerX = drawPos.x + (TILE_SIZE * this.size * camera.zoom) / 2;
                const centerY = drawPos.y + (TILE_SIZE * this.size * camera.zoom) / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(this.currentAngle);
                ctx.translate(-centerX, -centerY);
                ctx.drawImage(
                    this.sprite,
                    0, 0,
                    this.sprite.width - 1,
                    this.sprite.height - 1,
                    drawPos.x,
                    drawPos.y,
                    TILE_SIZE * this.size * camera.zoom - 1,
                    TILE_SIZE * this.size * camera.zoom - 1
                );
                ctx.restore();
            } else {
                ctx.drawImage(
                    this.sprite,
                    0, 0,
                    this.sprite.width - 1,
                    this.sprite.height - 1,
                    drawPos.x,
                    drawPos.y,
                    TILE_SIZE * this.size * camera.zoom - 1,
                    TILE_SIZE * this.size * camera.zoom - 1
                );
            }
        } else {
            ctx.fillStyle = BUILDING_TYPES[this.type].color;
            ctx.fillRect(
                drawPos.x,
                drawPos.y,
                TILE_SIZE * this.size * camera.zoom,
                TILE_SIZE * this.size * camera.zoom
            );
        }
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = PREVIEW_LINE_WIDTH / camera.zoom;
    }
}