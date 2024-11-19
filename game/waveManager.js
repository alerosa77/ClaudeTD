class WaveManager {
    constructor() {
        this.waveNumber = 0;
        this.enemies = [];
        this.preparationTime = 90; // 90 seconds before first wave
        this.timeUntilNextWave = this.preparationTime;
        this.waveInProgress = false;
    }

    update(deltaTime) {
        const seconds = deltaTime / 1000;

        if (!this.waveInProgress) {
            this.timeUntilNextWave -= seconds;
            if (this.timeUntilNextWave <= 0) {
                this.startNextWave();
            }
        }

        // Update all enemies
        this.enemies.forEach(enemy => enemy.update(deltaTime));
    }

    startNextWave() {
        this.waveNumber++;
        this.waveInProgress = true;
        
        // Calculate number of regular enemies for this wave
        const baseEnemies = 10;
        const enemyCount = Math.floor(baseEnemies * (1 + (this.waveNumber - 1) * 0.2));

        // Spawn regular enemies
        for (let i = 0; i < enemyCount; i++) {
            this.spawnEnemy('normal');
        }

        // Spawn boss enemies every 5 waves
        if (this.waveNumber % 5 === 0) {
            const bossCount = Math.floor(this.waveNumber / 5);
            for (let i = 0; i < bossCount; i++) {
                this.spawnEnemy('boss');
            }
        }

        // Set time until next wave (60s after first wave)
        this.timeUntilNextWave = 60;
        this.waveInProgress = false;
    }

    spawnEnemy(type = 'normal') {
        const isFirstWave = this.waveNumber === 1;
        const spawnDistance = isFirstWave ? 0.55 : 1.0; // 55% distance for first wave, edge for others
        
        // Pick a random edge to spawn from
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        const mapCenter = MAP_SIZE * TILE_SIZE / 2;
        const maxDistance = MAP_SIZE * TILE_SIZE / 2; // Distance from center to edge

        switch (edge) {
            case 0: // Top
                x = Math.random() * MAP_SIZE * TILE_SIZE;
                y = mapCenter - (spawnDistance * maxDistance);
                break;
            case 1: // Right
                x = mapCenter + (spawnDistance * maxDistance);
                y = Math.random() * MAP_SIZE * TILE_SIZE;
                break;
            case 2: // Bottom
                x = Math.random() * MAP_SIZE * TILE_SIZE;
                y = mapCenter + (spawnDistance * maxDistance);
                break;
            case 3: // Left
                x = mapCenter - (spawnDistance * maxDistance);
                y = Math.random() * MAP_SIZE * TILE_SIZE;
                break;
        }

        const enemy = new Enemy(x, y);
        if (type === 'boss') {
            enemy.health = ENEMY_TYPES.boss.health;
            enemy.maxHealth = ENEMY_TYPES.boss.health;
            enemy.speed = ENEMY_TYPES.boss.speed;
            enemy.scale = 2; // Set scale instead of size
            enemy.sprite.src = ENEMY_ASSETS.boss;
        } else {
            enemy.health = ENEMY_TYPES.normal.health;
            enemy.maxHealth = ENEMY_TYPES.normal.health;
            enemy.speed = ENEMY_TYPES.normal.speed;
            enemy.scale = 1.0; // Set scale instead of size
            enemy.sprite.src = ENEMY_ASSETS.normal;
        }
        
        this.enemies.push(enemy);
    }

    render(ctx) {
        this.enemies.forEach(enemy => enemy.render(ctx));
    }
}