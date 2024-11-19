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

         // Touch device detection
            this.isTouchDevice = 'ontouchstart' in window;

        // Touch panning state
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.isPanning = false;

        // Touch zoom state
            this.initialPinchDistance = 0;
            this.initialZoom = 1;
            this.pinchCenterX = 0;
            this.pinchCenterY = 0;

        // Touch events
        if (this.isTouchDevice) {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            canvas.addEventListener('touchend', () => this.handleTouchEnd());
        }

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
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - start panning
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isPanning = true;
        } else if (e.touches.length === 2) {
            // Pinch zoom start
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate initial pinch center
            this.pinchCenterX = (touch1.clientX + touch2.clientX) / 2;
            this.pinchCenterY = (touch1.clientY + touch2.clientY) / 2;
            
            // Calculate initial distance
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            this.initialZoom = this.zoom;
            
            this.isPanning = false;
        }
    }

    handleTouchMove(e) {
        e.preventDefault();  // Prevent scrolling

        if (this.isPanning && e.touches.length === 1) {
            // Pan based on touch movement
            const dx = e.touches[0].clientX - this.touchStartX;
            const dy = e.touches[0].clientY - this.touchStartY;
            
            this.x -= dx / this.zoom;
            this.y -= dy / this.zoom;
            
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate new pinch distance
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const newDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate zoom change with reduced speed
            const zoomDelta = (newDistance / this.initialPinchDistance - 1) * 0.325;  // Reduced speed
            const newZoom = this.initialZoom * (1 + zoomDelta);
            
            // Calculate position relative to pinch center
            const worldX = (this.pinchCenterX + this.x) / this.zoom;
            const worldY = (this.pinchCenterY + this.y) / this.zoom;
            
            this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
            
            // Adjust position to keep pinch center stable
            this.x = worldX * this.zoom - this.pinchCenterX;
            this.y = worldY * this.zoom - this.pinchCenterY;
            }   
    }           

    handleTouchEnd() {
        this.isPanning = false;
    }

    update(mapWidth, mapHeight) {
        let dx = 0;
        let dy = 0;

        if (!this.isTouchDevice) {
            const isOverUI = document.querySelector('#ui').matches(':hover');

            if (this.mouseX >= 0 && this.mouseY >= 0 && !isOverUI) {  // Added !isOverUI check
                if (this.mouseX < CAMERA_EDGE_THRESHOLD * 2) dx -= CAMERA_EDGE_SPEED;
                if (this.mouseX > canvas.width - CAMERA_EDGE_THRESHOLD * 2) dx += CAMERA_EDGE_SPEED;
                if (this.mouseY < CAMERA_EDGE_THRESHOLD * 2) dy -= CAMERA_EDGE_SPEED;
                if (this.mouseY > canvas.height - CAMERA_EDGE_THRESHOLD * 2) dy += CAMERA_EDGE_SPEED;
            }
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

    function selectBuilding(type) {
        selectedBuilding = type;
        const deselectBtn = document.getElementById('deselectButton');
        if (deselectBtn) {
            deselectBtn.style.display = type ? 'block' : 'none';
        }
    }

const camera = new Camera();