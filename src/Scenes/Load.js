// Load.js
// Handles all asset loading and animation creation

class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load characters spritesheet
        this.load.atlas("platformer_characters", "tilemap-characters-packed.png", "tilemap-characters-packed.json");

        // Load tilemap information
        this.load.image("tilemap_tiles", "tilemap_packed.png");
        this.load.tilemapTiledJSON("platformer-level-1", "platformer-level-1.tmj");

        // Load the tilemap as a spritesheet
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        // Kenny particle atlas
        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        // Background music — add your mp3 to assets folder
        // Replace "bgm.mp3" with your actual filename
        this.load.audio("bgm", "bgm.mp3");

        // Audio effects
        // Get free sounds at https://kenney.nl/assets/interface-sounds
        this.load.audio("jumpSound",       "jump.mp3");
        this.load.audio("doubleJumpSound", "jump2.mp3");
        this.load.audio("landSound",       "land.mp3");
        this.load.audio("gemSound",        "coin.mp3");
        this.load.audio("keySound",        "coin.mp3"); 
        this.load.audio("doorOpenSound",   "doorOpen.mp3");
        this.load.audio("walkSound",       "walk.mp3");
    }

    create() {
        // PLAYER ANIMATIONS
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('platformer_characters', {
                prefix: "tile_",
                start: 0,
                end: 1,
                suffix: ".png",
                zeroPad: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [{ frame: "tile_0000.png" }],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [{ frame: "tile_0001.png" }],
        });

        // COIN SPIN ANIMATION
        // 2-frame spin using tilemap_sheet frames 151 and 152
        // Guard with exists() so it doesn't re-register on scene restart
        if (!this.anims.exists('coin-spin')) {
            this.anims.create({
                key: 'coin-spin',
                frames: this.anims.generateFrameNumbers('tilemap_sheet', {
                    start: 151,
                    end: 152
                }),
                frameRate: 6,
                repeat: -1
            });
        }

        // WATER TILE ANIMATION
        // 2-frame ripple between tile 53 and 33
        // Tiled is 1-based, Phaser is 0-based so we subtract 1
        if (!this.anims.exists('water-anim')) {
            this.anims.create({
                key: 'water-anim',
                frames: [
                    { key: 'tilemap_sheet', frame: 52 },  // Tiled frame 53
                    { key: 'tilemap_sheet', frame: 32 }   // Tiled frame 33
                ],
                frameRate: 2,   // slow ripple
                repeat: -1
            });
        }

        // ...and pass to the next Scene
        this.scene.start("platformerScene");
    }

    update() {}
}