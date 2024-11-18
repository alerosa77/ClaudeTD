class PowerDistribution {
    static update(deltaTime) {
        buildings.forEach(building => {
            if (building.type === 'powerPlant') {
                const currentTime = Date.now();
                if (currentTime - building.lastSparkTime >= SPARK_GENERATION_INTERVAL) {
                    this.generateSparkFromPowerPlant(building);
                    building.lastSparkTime = currentTime;
                }
            }
        });

        for (let i = sparks.length - 1; i >= 0; i--) {
            if (sparks[i].update(deltaTime)) {
                sparks.splice(i, 1);
            }
        }
    }

    static generateSparkFromPowerPlant(powerPlant) {
        const pylonsInRange = BuildingPlacement.getValidPylonsInRange(
            powerPlant, 
            POWER_PLANT_RANGE
        );

        if (pylonsInRange.length > 0) {
            const targetPylon = pylonsInRange[
                Math.floor(Math.random() * pylonsInRange.length)
            ];
            sparks.push(new Spark(powerPlant, targetPylon));
        } else {
            sparks.push(new Spark(powerPlant));
        }
    }

    static findNextTarget(spark, currentPylon) {
        if (!spark.isFirstSpark || jumpCount >= MAX_LOGGED_JUMPS) {
            return this.findNextTargetInternal(spark, currentPylon);
        }

        const target = this.findNextTargetInternal(spark, currentPylon);
        
        if (target && target.id === spark.sourceBuilding.id) {
            console.log(`Jump ${jumpCount}: WARNING - Selected same building as source!`);
        }

        return target;
    }

    static findNextTargetInternal(spark, currentPylon) {
        // Priority 1: Towers with power < 9.0
        let towers = buildings.filter(b => 
            b.type === 'tower' &&
            b.sparkPower < 9.0 &&
            BuildingPlacement.getDistance(currentPylon, b) <= PYLON_RANGE * TILE_SIZE
        );
        
        if (towers.length > 0) {
            return towers.reduce((a, b) => 
                a.sparkPower < b.sparkPower ? a : b
            );
        }

        // Priority 2: Harvesters with power < 9.0
        let harvesters = buildings.filter(b => 
            b.type === 'harvester' &&
            b.sparkPower < 9.0 &&
            BuildingPlacement.getDistance(currentPylon, b) <= PYLON_RANGE * TILE_SIZE
        );
        
        if (harvesters.length > 0) {
            return harvesters.reduce((a, b) => 
                a.sparkPower < b.sparkPower ? a : b
            );
        }

        // Priority 3: Pylons (excluding current and source)
        let validPylons = buildings.filter(b => 
            b.type === 'pylon' &&
            b.id !== currentPylon.id &&
            b.id !== spark.sourceBuilding.id &&
            BuildingPlacement.getDistance(currentPylon, b) <= PYLON_RANGE * TILE_SIZE
        );

        if (validPylons.length > 0) {
            return validPylons[Math.floor(Math.random() * validPylons.length)];
        }

        // Priority 4: Power plants
        let powerPlants = buildings.filter(b => 
            b.type === 'powerPlant' &&
            BuildingPlacement.getDistance(currentPylon, b) <= PYLON_RANGE * TILE_SIZE
        );
        
        if (powerPlants.length > 0) {
            return powerPlants[Math.floor(Math.random() * powerPlants.length)];
        }

        // Last resort: Any pylon in range
        let anyPylonInRange = buildings.filter(b => 
            b.type === 'pylon' &&
            b.id !== currentPylon.id &&
            BuildingPlacement.getDistance(currentPylon, b) <= PYLON_RANGE * TILE_SIZE
        );

        if (anyPylonInRange.length > 0) {
            return anyPylonInRange[Math.floor(Math.random() * anyPylonInRange.length)];
        }

        return null;
    }
}