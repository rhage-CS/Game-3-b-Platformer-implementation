class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // Create water zones from Objects layer in tilemap
        this.waterObjects = this.map.createFromObjects("Objects", {
            name: "water"
        });

        // Build water rects from the water objects' positions and sizes
        let waterRects = this.waterObjects.map(obj => {
            return new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height);
        });

        // Hide the water objects themselves (we just need their bounds)
        this.waterObjects.forEach(obj => obj.setVisible(false));

        // Create a circle texture for bubbles using Phaser Graphics
        let bubbleGfx = this.make.graphics({ x: 0, y: 0, add: false });
        bubbleGfx.fillStyle(0xaaddff, 1);
        bubbleGfx.fillCircle(4, 4, 4);
        bubbleGfx.generateTexture("bubble", 8, 8);
        bubbleGfx.destroy();

        // Create a "pop" ring texture for when bubbles reach end of lifespan
        let popGfx = this.make.graphics({ x: 0, y: 0, add: false });
        popGfx.lineStyle(1, 0xffffff, 1);
        popGfx.strokeCircle(6, 6, 5);
        popGfx.generateTexture("bubblePop", 12, 12);
        popGfx.destroy();

        ////////////////////
        // TODO: put water bubble particle effect here
        // It's OK to have it start running
        ////////////////////

        // Pop emitter — triggered when a bubble dies
        // (b) Bubble pop effect at end of lifespan
        my.vfx.bubblePop = this.add.particles(0, 0, "bubblePop", {
            lifespan: 200,
            speed:    { min: 10, max: 30 },
            scale:    { start: 0.8, end: 0 },
            alpha:    { start: 0.8, end: 0 },
            quantity: 4,
            emitting: false
        });

        // Each water zone gets its own dedicated emitter and independent random timer
        waterRects.forEach(rect => {
            let zoneEmitter = this.add.particles(0, 0, "bubble", {
                emitZone: { type: 'random', source: rect },
                speedY:   { min: -20, max: -60 },
                speedX:   { min: -5,  max: 5  },
                lifespan: { min: 800, max: 2000 },
                scale:    { min: 0.5, max: 1.5 },
                alpha:    { start: 0.6, end: 0 },
                blendMode: 'ADD',

                // (a) onEmit: assign a random phase to each particle so they
                // don't all sway in sync with each other
                onEmit: (particle) => {
                    particle.phase = Math.random() * Math.PI * 2;
                },

                // (a) onUpdate: oscillate each bubble's X acceleration using
                // its individual phase so it wiggles as it rises
                onUpdate: (particle) => {
                    particle.accelerationX = Math.sin(
                        (this.time.now * 0.003) + particle.phase
                    ) * 20;

                    // (b) trigger pop when bubble is nearly dead (last 5% of lifespan)
                    if (particle.lifeT < 0.05 && !particle.popped) {
                        particle.popped = true;
                        my.vfx.bubblePop.setPosition(particle.x, particle.y);
                        my.vfx.bubblePop.explode(4);
                    }
                }
            });

            zoneEmitter.stop();

            this.time.addEvent({
                delay: Phaser.Math.Between(100, 400),
                loop: true,
                callback: () => {
                    // Always explode at least 1, up to 3 bubbles per zone per tick
                    zoneEmitter.explode(Phaser.Math.Between(1, 3));
                }
            });
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: create coin collect particle effect here
        // Important: make sure it's not running
        // Uses star_01-03.png from kenny-particles atlas (confirmed in kenny-particles.json)
        // Scale is very small because the source sprites are 512x512px
        my.vfx.coinCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ["star_01.png", "star_02.png", "star_03.png"],
            lifespan: 600,
            speed:    { min: 50, max: 150 },
            scale:    { start: 0.04, end: 0 },  // 512px source -> ~20px particle
            alpha:    { start: 1,    end: 0 },
            rotate:   { min: 0, max: 360 },
            gravityY: 300,
            quantity: 12,
            emitting: false                      // NOT running at start
        });

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            ////////////////////
            // TODO: start the coin collect particle effect here
            ////////////////////
            my.vfx.coinCollect.setPosition(obj2.x, obj2.y); // burst at coin location
            my.vfx.coinCollect.explode(12);                  // one-shot burst of 12 particles
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // Pause key setup — must use addKey here in create(), JustDown only in update()
        this.pKey = this.input.keyboard.addKey('P');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // TODO: Add movement vfx here
        // Walking dust particles using smoke_01-03.png (confirmed in kenny-particles.json)
        // Scale is very small because the source sprites are 512x512px
        my.vfx.walk = this.add.particles(0, 0, "kenny-particles", {
            frame: ["smoke_01.png", "smoke_02.png", "smoke_03.png"],
            lifespan: 250,
            speed:    { min: 5, max: 20 },
            scale:    { start: 0.03, end: 0 },  // 512px source -> ~15px puff
            alpha:    { start: 0.4, end: 0 },
            gravityY: -100,                      // drifts slightly upward like dust
            quantity: 1,
            frequency: 80,                       // emit every 80ms while walking
            emitting: false                      // start off, enabled in update()
        });

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            // Position dust at player's feet and keep it running
            my.vfx.walk.setPosition(
                my.sprite.player.x + 4,                              // trail behind (facing left)
                my.sprite.player.y + my.sprite.player.height * 0.4   // at feet
            );
            if (!my.vfx.walk.emitting) my.vfx.walk.start();

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            // Position dust at player's feet and keep it running
            my.vfx.walk.setPosition(
                my.sprite.player.x - 4,                              // trail behind (facing right)
                my.sprite.player.y + my.sprite.player.height * 0.4   // at feet
            );
            if (!my.vfx.walk.emitting) my.vfx.walk.start();

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            if (my.vfx.walk.emitting) my.vfx.walk.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        // Pause key — press P to freeze/unfreeze everything for screenshot
        // this.scene.pause() stops physics, animations, particles, and update loop
        if(Phaser.Input.Keyboard.JustDown(this.pKey)) {
            if(this.scene.isPaused()) {
                this.scene.resume();
            } else {
                this.scene.pause();
            }
        }
    }
}