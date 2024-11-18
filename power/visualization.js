class PowerVisualization {
    static findClosestBuilding(x, y, type) {
        let closest = null;
        let minDist = Infinity;

        buildings.forEach(building => {
            if (building.type === type) {
                const dist = Math.sqrt(
                    Math.pow(building.centerX - x * TILE_SIZE, 2) +
                    Math.pow(building.centerY - y * TILE_SIZE, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    closest = building;
                }
            }
        });

        return closest;
    }

    static drawRangeCircle(ctx, x, y, radius, color) {
        const screenX = x * camera.zoom - camera.x;
        const screenY = y * camera.zoom - camera.y;
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.arc(
            screenX,
            screenY,
            radius * TILE_SIZE * camera.zoom,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }

    static renderRanges(ctx) {
        if (!ui.hoveredTile) return;

        const mouseX = ui.hoveredTile.x;
        const mouseY = ui.hoveredTile.y;
        let closestPylon, closestPowerPlant;

        switch(selectedBuilding) {
            case 'powerPlant':
                closestPylon = this.findClosestBuilding(mouseX, mouseY, 'pylon');
                if (closestPylon) {
                    this.drawRangeCircle(
                        ctx,
                        closestPylon.centerX,
                        closestPylon.centerY,
                        PYLON_RANGE,
                        'rgba(33, 150, 243, 0.8)'
                    );
                }
                break;

            case 'pylon':
                // Show range of closest existing pylon
                closestPylon = this.findClosestBuilding(mouseX, mouseY, 'pylon');
                if (closestPylon) {
                    this.drawRangeCircle(
                        ctx,
                        closestPylon.centerX,
                        closestPylon.centerY,
                        PYLON_RANGE,
                        'rgba(33, 150, 243, 0.8)'
                    );
                }

                // Show range of closest power plant
                closestPowerPlant = this.findClosestBuilding(mouseX, mouseY, 'powerPlant');
                if (closestPowerPlant) {
                    this.drawRangeCircle(
                        ctx,
                        closestPowerPlant.centerX,
                        closestPowerPlant.centerY,
                        POWER_PLANT_RANGE,
                        'rgba(255, 87, 34, 0.8)'
                    );
                }

                // Show range of pylon being placed
                const centerX = (mouseX + 0.5) * TILE_SIZE;
                const centerY = (mouseY + 0.5) * TILE_SIZE;
                this.drawRangeCircle(
                    ctx,
                    centerX,
                    centerY,
                    PYLON_RANGE,
                    'rgba(33, 150, 243, 0.4)'
                );
                break;

            case 'harvester':
            case 'tower':
                closestPylon = this.findClosestBuilding(mouseX, mouseY, 'pylon');
                if (closestPylon) {
                    this.drawRangeCircle(
                        ctx,
                        closestPylon.centerX,
                        closestPylon.centerY,
                        PYLON_RANGE,
                        'rgba(33, 150, 243, 0.8)'
                    );
                }
                break;
        }
    }

    static render(ctx) {
        this.renderRanges(ctx);

        sparks.forEach(spark => {
            if (gameMap.isVisible(Math.floor(spark.x / TILE_SIZE), Math.floor(spark.y / TILE_SIZE))) {
                spark.render(ctx);
            }
        });
    }
}