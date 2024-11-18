class Camera {
    constructor() {
        this.zoom = 1.3;
        
        // Get the pixel coordinates of the map center (tile 100,100)
        const mapCenterTile = MAP_SIZE / 2; // 100
        const mapCenterPixels = {
            x: mapCenterTile * TILE_SIZE,
            y: mapCenterTile * TILE_SIZE
        };
        
        // Calculate camera position to center the view after zoom is applied
        this.x = (mapCenterPixels.x * this.zoom) - (window.innerWidth / 2);
        this.y = (mapCenterPixels.y * this.zoom) - (window.innerHeight / 2);
        
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.keys = {};

        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        window.addEventListener('mouseout', (e) => {
            if (e.relatedTarget === null) {
                this.mouseX = -1;
                this.mouseY = -1;
            }
        });

        window.addEventListener('wheel', (e) => {
            const oldZoom = this.zoom;
            
            this.zoom -= Math.sign(e.deltaY) * ZOOM_SPEED;
            this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom));
            
            if (this.zoom !== oldZoom) {
                const mouseWorldX = (this.mouseX + this.x) / oldZoom;
                const mouseWorldY = (this.mouseY + this.y) / oldZoom;
                
                this.x = mouseWorldX * this.zoom - this.mouseX;
                this.y = mouseWorldY * this.zoom - this.mouseY;
            }
        });
    }

    update(mapWidth, mapHeight) {
        let dx = 0;
        let dy = 0;

        if (this.mouseX >= 0 && this.mouseY >= 0) {
            if (this.mouseX < CAMERA_EDGE_THRESHOLD * 2) dx -= CAMERA_EDGE_SPEED;
            if (this.mouseX > canvas.width - CAMERA_EDGE_THRESHOLD * 2) dx += CAMERA_EDGE_SPEED;
            if (this.mouseY < CAMERA_EDGE_THRESHOLD * 2) dy -= CAMERA_EDGE_SPEED;
            if (this.mouseY > canvas.height - CAMERA_EDGE_THRESHOLD * 2) dy += CAMERA_EDGE_SPEED;
        }

        if (this.keys['ArrowLeft'] || this.keys['a']) dx -= CAMERA_KEY_SPEED;
        if (this.keys['ArrowRight'] || this.keys['d']) dx += CAMERA_KEY_SPEED;
        if (this.keys['ArrowUp'] || this.keys['w']) dy -= CAMERA_KEY_SPEED;
        if (this.keys['ArrowDown'] || this.keys['s']) dy += CAMERA_KEY_SPEED;

        const maxX = mapWidth * TILE_SIZE * this.zoom - canvas.width;
        const maxY = mapHeight * TILE_SIZE * this.zoom - canvas.height;
        
        this.x = Math.max(0, Math.min(this.x + dx, maxX));
        this.y = Math.max(0, Math.min(this.y + dy, maxY));
    }

    screenToWorld(screenX, screenY) {
        return {
            x: Math.floor((screenX + this.x) / (TILE_SIZE * this.zoom)),
            y: Math.floor((screenY + this.y) / (TILE_SIZE * this.zoom))
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * TILE_SIZE * this.zoom - this.x,
            y: worldY * TILE_SIZE * this.zoom - this.y
        };
    }
}

const camera = new Camera();