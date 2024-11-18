// At the top of constants.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Tile settings
const TILE_SIZE = 32;
const RESOURCE_CHANCE = 0.1;
const MAP_SIZE = 200;

// Camera settings
const CAMERA_EDGE_THRESHOLD = 40;
const CAMERA_EDGE_SPEED = 12;  // Increased from 8
const CAMERA_KEY_SPEED = 12;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_SPEED = 0.1;

// Building types and costs
const BUILDING_TYPES = {
    powerPlant: { 
        name: 'Power Plant', 
        cost: 50, 
        color: '#FF5722', 
        size: 2 
    },
    pylon: { 
        name: 'Pylon', 
        cost: 5, 
        color: '#2196F3', 
        size: 0.65 
    },
    harvester: { 
        name: 'Harvester', 
        cost: 10, 
        color: '#4CAF50', 
        size: 1,
        collectionRange: 3.5
    },
    tower: { 
        name: 'Tower', 
        cost: 20, 
        color: '#FFD700', 
        size: 1,
        range: 12
    }
};

// Building assets
const BUILDING_ASSETS = {
    tower: 'https://i.ibb.co/x8hfPP1/test-tower-removebg-preview.png',
    harvester: 'https://i.ibb.co/tP1cNht/harvester.png',
    powerPlant: 'https://i.ibb.co/Qfrh3s0/powerplant-removebg-preview-removebg-preview.png',
    pylon: 'https://i.ibb.co/DwCVnnK/DALL-E-2024-11-16-23-16-33-A-top-down-view-of-a-Star-Craft-inspired-Pylon-without-any-background-The.png'
};

// Enemy fallback if sprites don't load
const ENEMY_COLOR = '#FF0000';  // Base color for enemies
const ENEMY_BASE_ALPHA = 0.6;   // Base alpha for enemy glow
const ENEMY_CORE_SIZE = 4;     // Size of enemy core in pixels

// Alternative tile chances
const ALTERNATIVE_TILE_CHANCES = {
    FLOWERS: 0.02,  // 5% chance
    DIRT: 0.00,     // 0% chance
    ROCKS: 0.005,    // 0.5% chance
    DEAD: 0.00      // 0% chance
};

// Resource colors
const RESOURCE_DARKENING = {
    FULL: 0,        // 150-200 resources
    HIGH: 0.0,      // 100-149 resources
    MEDIUM: 0.0,    // 50-99 resources
    LOW: 0.4,       // 0-49 resources
    DEPLETED: 0.8   // depleted
};

const ENEMY_ASSETS = {
    normal: 'https://i.ibb.co/Zcr1XjB/enemy-removebg-preview.png',
    boss: 'https://i.ibb.co/ry40tgW/boss-removebg-preview.png'
};

const SPARK_ASSETS = {
    DEFAULT: 'https://i.ibb.co/4Nn9VbC/spark-f.png'
};

const PYLON_GLOW = {
    COLOR: '#964A0C', // Golden color
    SIZE_MULTIPLIER: 1.15, // Glow extends 30% beyond pylon size
    INTENSITY: 0.4
};

const ENEMY_TYPES = {
    normal: {
        health: 15,
        speed: (TILE_SIZE / 3) * 1.2
    },
    boss: {
        health: 150,  // 10x normal health
        speed: ((TILE_SIZE / 3) * 1.2) * 0.9  // 10% slower than normal
    }
};

// Power system constants
const SPARK_SIZE = TILE_SIZE * 0.14;
const SPARK_SPEED = 2;
const POWER_PLANT_RANGE = 5;
const PYLON_RANGE = 5;
const SPARK_GENERATION_INTERVAL = 5000;
const SPARK_FADE_SPEED = 0.02;
const MAX_SPARK_BOUNCES = 10;

// Tower constants
const TOWER_RANGE = 12 * TILE_SIZE;
const TOWER_DAMAGE = 0.125;
const TOWER_ATTACK_RATE = 100;
const TOWER_POWER_CONSUMPTION_RATE = 0.1;

// Harvester constants
const RESOURCE_COLLECTION_RATE = 0.2;
const POWER_CONSUMPTION_RATE = 0.1;

// Visibility settings
const VISIBILITY_RANGE = 30;
const CENTER_VISIBILITY_RANGE = 15;
const FOG_DARKNESS = 0.85;

// Power thresholds
const POWER_THRESHOLD = {
    LOW: 0,
    MEDIUM: 3.0,
    HIGH: 7.0
};

// Visual constants
const HARVESTER_LASER_WIDTH = 0.35;
const HARVESTER_LASER_GLOW_WIDTH = 5.6;
const HARVESTER_LASER_COLOR = '#4CAF50';
const HARVESTER_GLOW_INTENSITY = 0.05;

const TOWER_LASER_WIDTH = 0.3;
const TOWER_LASER_GLOW_WIDTH = 4.8;
const TOWER_LASER_COLOR = '#0EFEFC';
const TOWER_GLOW_INTENSITY = 0.15;

// Preview constants
const PREVIEW_LINE_WIDTH = 0.5;

// Tile textures
const PLAIN_TILE_TEXTURES = {
    GRASS: 'https://opengameart.org/sites/default/files/Grass_01.png',
    FLOWERS: 'https://i.ibb.co/tLD5B4z/flowers-f.png',
    DIRT: 'x',
    ROCKS: 'https://i.ibb.co/NKvVVD5/Rocks-f.png',   
    DEAD: 'x'     
};

// Resource texture
const RESOURCE_TEXTURE = 'https://i.ibb.co/tphQ655/resource-f.png';

// Resource cluster parameters
const RESOURCE_CLUSTER = {
    NOISE_SCALE: 0.25,
    DETAIL_SCALE: 0.6,
    THRESHOLD: 0.45,
    VARIATION_STRENGTH: 0.4
};

// Game state
let selectedBuilding = null;
let dnaUnits = 120;
const buildings = [];