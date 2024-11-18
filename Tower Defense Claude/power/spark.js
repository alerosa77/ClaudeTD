let firstSparkCreated = false;
let jumpCount = 0;
const MAX_LOGGED_JUMPS = 10;

class Spark {
    constructor(sourceBuilding, targetBuilding = null, originPowerPlant = null) {
        this.x = sourceBuilding.centerX;
        this.y = sourceBuilding.centerY;
        this.sourceBuilding = sourceBuilding;
        this.targetBuilding = targetBuilding;
        this.originPowerPlant = originPowerPlant || 
            (sourceBuilding.type === 'powerPlant' ? sourceBuilding : null);
        this.alpha = 1;
        this.randomAngle = null;
        this.bouncePairs = new Map();
        this.isFirstSpark = !firstSparkCreated;
        this.size = SPARK_SIZE * 2.3;
        this.glowSize = this.size * 1.15; // 15% larger than spark

        
        // Add sprite initialization
        this.sprite = new Image();
        this.sprite.src = SPARK_ASSETS.DEFAULT;
        
        if (this.isFirstSpark) {
            firstSparkCreated = true;
        }
        
        if (!targetBuilding) {
            this.randomAngle = Math.random() * Math.PI * 2;
        }
    }

    getBounceCount(source, target) {
        const pairKey = `${source.id}-${target.id}`;
        const reversePairKey = `${target.id}-${source.id}`;
        return (this.bouncePairs.get(pairKey) || 0) + 
               (this.bouncePairs.get(reversePairKey) || 0);
    }

    hasExceededBounces(source, target) {
        return this.getBounceCount(source, target) >= MAX_SPARK_BOUNCES;
    }

    trackBounce(source, target) {
        const pairKey = `${source.id}-${target.id}`;
        const currentCount = this.getBounceCount(source, target);
        this.bouncePairs.set(pairKey, (this.bouncePairs.get(pairKey) || 0) + 1);
        return currentCount + 1 >= MAX_SPARK_BOUNCES;
    }

    update(deltaTime) {
        if (this.randomAngle !== null) {
            // Move in tiles per second, then convert to pixels
            const moveDistance = (SPARK_SPEED * deltaTime / 1000);
            this.x += Math.cos(this.randomAngle) * moveDistance * TILE_SIZE;
            this.y += Math.sin(this.randomAngle) * moveDistance * TILE_SIZE;
            this.alpha -= SPARK_FADE_SPEED;
            return this.alpha <= 0;
        }

        const dx = this.targetBuilding.centerX - this.x;
        const dy = this.targetBuilding.centerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < SPARK_SPEED) {
            if (this.isFirstSpark && jumpCount < MAX_LOGGED_JUMPS) {
                jumpCount++;
            }

            if (this.targetBuilding.type === 'harvester' || this.targetBuilding.type === 'tower') {
                this.targetBuilding.sparkPower += 1;  // Direct power transfer
                return true;
            } else if (this.targetBuilding.type === 'pylon') {
                return this.redirectFromPylon();
            } else if (this.targetBuilding.type === 'powerPlant') {
                return this.redirectFromPowerPlant();
            }
        }

        const moveDistance = (SPARK_SPEED * deltaTime / 1000);
        this.x += (dx / distance) * moveDistance * TILE_SIZE;
        this.y += (dy / distance) * moveDistance * TILE_SIZE;
        return false;
    }

    redirectFromPowerPlant() {
        if (this.isFirstSpark && jumpCount < MAX_LOGGED_JUMPS) {
        }

        const pylonsInRange = BuildingPlacement.getValidPylonsInRange(
            this.targetBuilding, 
            POWER_PLANT_RANGE
        );

        if (pylonsInRange.length > 0) {
            const targetPylon = pylonsInRange[
                Math.floor(Math.random() * pylonsInRange.length)
            ];

            if (this.hasExceededBounces(this.targetBuilding, targetPylon)) {
                return true;
            }

            this.trackBounce(this.targetBuilding, targetPylon);
            this.sourceBuilding = this.targetBuilding;
            this.targetBuilding = targetPylon;
            
          return false;
        }

        return true;
    }

    redirectFromPylon() {
        let newTarget = PowerDistribution.findNextTarget(this, this.targetBuilding);
        if (!newTarget) {
            return true;
        }

        if (this.hasExceededBounces(this.targetBuilding, newTarget)) {
            return true;
        }

        this.trackBounce(this.targetBuilding, newTarget);
        this.sourceBuilding = this.targetBuilding;
        this.targetBuilding = newTarget;

        return false;
    }

    render(ctx) {
        const screenPos = camera.worldToScreen(
            this.x / TILE_SIZE, 
            this.y / TILE_SIZE
        );

        if (this.sprite && this.sprite.complete) {
            ctx.globalAlpha = this.alpha * 0.4;
            // Draw golden glow
            const gradient = ctx.createRadialGradient(
                screenPos.x,
                screenPos.y,
                0,
                screenPos.x,
                screenPos.y,
                this.glowSize * camera.zoom
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                screenPos.x,
                screenPos.y,
                this.glowSize * camera.zoom,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Draw sprite

            ctx.globalAlpha = this.alpha;
            ctx.drawImage(
                this.sprite,
                screenPos.x - (this.size * camera.zoom) / 2,
                screenPos.y - (this.size * camera.zoom) / 2,
                this.size * camera.zoom,
                this.size * camera.zoom
            );
            ctx.globalAlpha = 1;
        } else {
            // Fallback to original circle rendering
            ctx.fillStyle = `rgba(255, 255, 0, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(
                screenPos.x,
                screenPos.y,
                SPARK_SIZE * camera.zoom,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }
}
let sparks = [];