class BuildingPlacement {
    static canPlaceBuilding(x, y, buildingType) {
        const size = BUILDING_TYPES[buildingType].size;
        
        // Check map bounds
        if (x < 0 || y < 0 || x + size > gameMap.width || y + size > gameMap.height) {
            return false;
        }

        // Check if all tiles are visible
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                if (!gameMap.isVisible(x + dx, y + dy)) {
                    return false;
                }
            }
        }

        // Check for resource tiles
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tile = gameMap.getTile(x + dx, y + dy);
                if (tile && tile.type === 'resource') {
                    return false;
                }
            }
        }

        // Check for overlapping buildings
        for (const building of buildings) {
            if (this.isOverlapping(x, y, size, building)) {
                return false;
            }
        }

        return true;
    }

    static isOverlapping(x, y, size, otherBuilding) {
        return !(x + size <= otherBuilding.x ||
                x >= otherBuilding.x + otherBuilding.size ||
                y + size <= otherBuilding.y ||
                y >= otherBuilding.y + otherBuilding.size);
    }

    static getValidPylonsInRange(building, range) {
        return buildings.filter(b => 
            b.type === 'pylon' &&
            this.getDistance(building, b) <= range * TILE_SIZE
        );
    }

    static getDistance(b1, b2) {
        return Math.sqrt(
            Math.pow(b1.centerX - b2.centerX, 2) +
            Math.pow(b1.centerY - b2.centerY, 2)
        );
    }

    static renderBuildingPreview(ctx, x, y, buildingType) {
        // Draw range indicators for tower and harvester
        if (buildingType === 'tower') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
            ctx.lineWidth = PREVIEW_LINE_WIDTH / camera.zoom;
            ctx.arc(
                (x * TILE_SIZE + TILE_SIZE/2) * camera.zoom - camera.x,
                (y * TILE_SIZE + TILE_SIZE/2) * camera.zoom - camera.y,
                TOWER_RANGE * camera.zoom,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        } else if (buildingType === 'harvester') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.lineWidth = PREVIEW_LINE_WIDTH / camera.zoom;
            ctx.arc(
                (x * TILE_SIZE + TILE_SIZE/2) * camera.zoom - camera.x,
                (y * TILE_SIZE + TILE_SIZE/2) * camera.zoom - camera.y,
                BUILDING_TYPES.harvester.collectionRange * TILE_SIZE * camera.zoom,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
    }
}