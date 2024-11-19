let lastTime = Date.now();
let waveManager;
let gameStarted = false;

class UI {    
    constructor() {
        this.isTouchDevice = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) || 
                            (navigator.msMaxTouchPoints > 0);
        this.hoveredTile = { x: 0, y: 0 };
        this.setupEventListeners();
        this.resizeCanvas();
        if (this.isTouchDevice) {
                    document.body.classList.add('touch-device');
                }

        // Start screen handler
    document.getElementById('startScreen').addEventListener('click', () => {
        gameStarted = true;
        document.getElementById('startScreen').style.display = 'none';
        this.startGame();
        });
    this.hasPlacedFirstBuilding = false;
    }

    checkGameOver() {
            if (this.hasPlacedFirstBuilding && buildings.length === 0) {
                this.gameOver();
            }
        }

    gameOver() {  
        console.log('Game Over method started');
        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center';
        overlay.innerHTML = `
            <div class="text-cyan-400 text-2xl">
                Game Over!<br>
                You survived ${waveManager.waveNumber} waves
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Stop the game loop first
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;  // Clear the ID
        
        // Stop wave timer
        if (waveManager) {
            waveManager.timeUntilNextWave = Infinity;  // Or some other way to stop wave timer
        }
        
        console.log('Game Over method completed');
    }

    startGame() {
        document.getElementById('gameContent').style.display = 'block';
        waveManager = new WaveManager();
        gameLoopId = requestAnimationFrame(gameLoop);  // Initialize it here too
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    selectedBuilding = null;
                }
            });

        canvas.addEventListener('mousemove', (e) => {
            const worldPos = camera.screenToWorld(e.clientX, e.clientY);
            this.hoveredTile = worldPos;
        });

        canvas.addEventListener('click', (e) => {
            if (selectedBuilding) {
                const worldPos = camera.screenToWorld(e.clientX, e.clientY);
                const buildingCost = BUILDING_TYPES[selectedBuilding].cost;
                
                if (BuildingPlacement.canPlaceBuilding(worldPos.x, worldPos.y, selectedBuilding)) {
                    if (dnaUnits >= buildingCost) {
                        console.log('Before placing first building:', this.hasPlacedFirstBuilding);
                        buildings.push(new Building(selectedBuilding, worldPos.x, worldPos.y));
                        dnaUnits -= buildingCost;
                        this.updateResourceDisplay();
                        this.hasPlacedFirstBuilding = true;
                        console.log('After placing first building:', this.hasPlacedFirstBuilding);
                    }
                }
            }
        });
    }

    resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    updateResourceDisplay() {
        document.getElementById('duDisplay').textContent = Math.floor(dnaUnits);
    }

    renderWaveInfo(ctx) {
        const padding = 8;
        const width = 90;
        const height = 50;
        const x = canvas.width - width - padding;
        const y = padding;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = 'rgba(0,150,255,0.3)';
        ctx.lineWidth = 1;

        // Draw background with border
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 3);
        ctx.fill();
        ctx.stroke();

        // Draw wave info text
        ctx.font = '16px Saira';
        ctx.fillStyle = '#00FFFF';
        ctx.textAlign = 'center';
        const centerX = x + width / 2;
        ctx.textBaseline = 'top';
        
        const waveText = `Wave ${waveManager.waveNumber}`;
        const timeText = `Next: ${Math.ceil(waveManager.timeUntilNextWave)}s`;
        
        ctx.fillText(waveText, centerX, y + 8);
        ctx.fillText(timeText, centerX, y + 28);
    }

    renderBuildingPreview(ctx) {
        if (!selectedBuilding || !this.hoveredTile) return;

        const screenPos = camera.worldToScreen(
            this.hoveredTile.x,
            this.hoveredTile.y
        );

        const buildingSize = BUILDING_TYPES[selectedBuilding].size;
        const canPlace = BuildingPlacement.canPlaceBuilding(
            this.hoveredTile.x,
            this.hoveredTile.y,
            selectedBuilding
        );

        // Calculate centered position
        let drawPos;
        if (buildingSize === 2) {
            // For 2x2 buildings, center on vertex
            drawPos = {
                x: screenPos.x + (TILE_SIZE * camera.zoom) - (TILE_SIZE * buildingSize * camera.zoom) / 2,
                y: screenPos.y + (TILE_SIZE * camera.zoom) - (TILE_SIZE * buildingSize * camera.zoom) / 2
            };
        } else {
            // For other buildings, center on tile
            const tileCenter = {
                x: screenPos.x + (TILE_SIZE * camera.zoom) / 2,
                y: screenPos.y + (TILE_SIZE * camera.zoom) / 2
            };
            const buildingSizePixels = TILE_SIZE * buildingSize;
            drawPos = {
                x: tileCenter.x - (buildingSizePixels * camera.zoom) / 2,
                y: tileCenter.y - (buildingSizePixels * camera.zoom) / 2
            };
        }

        // Load and render sprite with transparency
        if (BUILDING_ASSETS[selectedBuilding]) {
            const sprite = new Image();
            sprite.src = BUILDING_ASSETS[selectedBuilding];
            
            if (sprite.complete) {
                ctx.globalAlpha = canPlace ? 0.6 : 0.3;
                
                ctx.drawImage(
                    sprite,
                    0,
                    0,
                    sprite.width - 1,
                    sprite.height - 1,
                    drawPos.x,
                    drawPos.y,
                    TILE_SIZE * buildingSize * camera.zoom - 1,
                    TILE_SIZE * buildingSize * camera.zoom - 1
                );
                
                ctx.globalAlpha = 1;
            }
        } else {
            // Fallback to colored rectangle if sprite not available
            ctx.fillStyle = BUILDING_TYPES[selectedBuilding].color + 
                           (canPlace ? '80' : '40');
            ctx.fillRect(
                drawPos.x,
                drawPos.y,
                TILE_SIZE * buildingSize * camera.zoom,
                TILE_SIZE * buildingSize * camera.zoom
            );
        }

        // Draw invalid placement indicator
        if (!canPlace) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = PREVIEW_LINE_WIDTH / camera.zoom;
            ctx.strokeRect(
                drawPos.x,
                drawPos.y,
                TILE_SIZE * buildingSize * camera.zoom,
                TILE_SIZE * buildingSize * camera.zoom
            );
        }

        // Draw range preview for relevant buildings
        BuildingPlacement.renderBuildingPreview(ctx, this.hoveredTile.x, this.hoveredTile.y, selectedBuilding);
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gameMap.render(ctx);
        buildings.forEach(building => building.render(ctx));

        // Render tower/harvester lasers above buildings
        buildings.forEach(building => {
            if (building.type === 'harvester' && building.sparkPower > 0) {
                building.harvestingTargets.forEach(target => {
                    if (gameMap.isVisible(target.x, target.y)) {
                        const sourcePos = {
                            x: (building.x * TILE_SIZE + building.size * TILE_SIZE / 2) * camera.zoom - camera.x,
                            y: (building.y * TILE_SIZE + building.size * TILE_SIZE / 2) * camera.zoom - camera.y
                        };
                        const targetPos = {
                            x: (target.x * TILE_SIZE + TILE_SIZE / 2) * camera.zoom - camera.x,
                            y: (target.y * TILE_SIZE + TILE_SIZE / 2) * camera.zoom - camera.y
                        };
                        building.renderLaserBeam(ctx, sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, HARVESTER_LASER_COLOR);
                    }
                });
            }

            if (building.type === 'tower' && building.currentTarget && building.sparkPower > 0 && 
                building.currentTarget.isVisible() && building.shouldRenderLaser) {
                const angle = building.currentAngle + Math.PI/2;
                const laserRadius = TILE_SIZE * 0.3;
                
                const sourcePos = {
                    x: (building.centerX + Math.cos(angle) * laserRadius) * camera.zoom - camera.x,
                    y: (building.centerY + Math.sin(angle) * laserRadius) * camera.zoom - camera.y
                };
                const targetPos = {
                    x: building.currentTarget.x * camera.zoom - camera.x,
                    y: building.currentTarget.y * camera.zoom - camera.y
                };
                building.renderLaserBeam(ctx, sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, TOWER_LASER_COLOR);
            }
        });

        waveManager.render(ctx);
        this.renderBuildingPreview(ctx);
        PowerVisualization.render(ctx);
        this.renderWaveInfo(ctx);
    }

    update(deltaTime) {
        buildings.forEach(building => building.update(deltaTime));
        this.updateResourceDisplay();
    }
}

// Create global UI instance
const ui = new UI();

function selectBuilding(type) {
    selectedBuilding = type;
}

// In game loop
let gameLoopId;


function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    
    camera.update(gameMap.width, gameMap.height);
    PowerDistribution.update(deltaTime);
    waveManager.update(deltaTime);
    ui.update(deltaTime);
    ui.render();
    
    lastTime = currentTime;
    gameLoopId = requestAnimationFrame(gameLoop);  // Set it here
}

window.addEventListener('load', () => {
});