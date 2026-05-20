// Platformer.js
// Main game scene for Alien Escape — The Mushroom Marshes

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        this.ACCELERATION = 800;
        this.DRAG = 1200;
        this.physics.world.gravity.y = 2000;
        this.JUMP_VELOCITY = -550;
        this.DOUBLE_JUMP_VELOCITY = -450;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.canDoubleJump = false;
        this.hasDoubleJumped = false;

        this.wasOnGround = false;

        this.lives = 3;
        this.isDead = false;

        this.coinScore = 0;
        this.TOTAL_COINS = 9;
        this.keyCount = 0;
        this.KEY_TOTAL = 3;

        this.startX = 81;
        this.startY = 350;
        this.respawnX = 81;
        this.respawnY = 350;

        this.lastDirection = 1;

        this.nearSign = null;
        this.signVisible = false;

        this.powerupActive = false;

        this.musicEnabled = true;
        this.settingsOpen = false;
    }

    create() {
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 80, 50);
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.groundLayer.setCollisionByProperty({ collides: true });

        // Overlay animated sprites on top of every water tile
        this.groundLayer.forEachTile(tile => {
            if (tile.index === 53) {
                let waterSprite = this.add.sprite(
                    tile.pixelX + tile.width / 2,
                    tile.pixelY + tile.height / 2,
                    'tilemap_sheet', 52
                );
                waterSprite.play('water-anim');
            }
        });

        // Coins
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);
        this.coins.forEach(coin => coin.anims.play('coin-spin'));

        // Keys — hide base sprite, show floating sprite
        // store floatSprite ref on key so we can destroy both on collect
        this.keyObjects = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 27
        });
        this.physics.world.enable(this.keyObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.keyGroup = this.add.group(this.keyObjects);
        this.keyObjects.forEach(key => {
            let baseY = key.y;
            key.setVisible(false);
            let floatKey = this.add.sprite(key.x, baseY, 'tilemap_sheet', 27);
            key.floatSprite = floatKey;
            this.tweens.add({
                targets: floatKey,
                y: baseY - 4,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // Exit door — Tiled ID 130 = Phaser frame 129
        this.exitObjects = this.map.createFromObjects("Objects", {
            name: "exit",
            key: "tilemap_sheet",
            frame: 129
        });
        this.physics.world.enable(this.exitObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.exitGroup = this.add.group(this.exitObjects);
        this.exitObjects.forEach(exit => exit.setAlpha(0.4));

        // Spikes — Tiled ID 68 = Phaser frame 67
        this.spikeObjects = this.map.createFromObjects("Objects", {
            name: "spike",
            key: "tilemap_sheet",
            frame: 67
        });
        this.physics.world.enable(this.spikeObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.spikeGroup = this.add.group(this.spikeObjects);

        // Powerups — Tiled ID 10 = Phaser frame 9
        this.powerupObjects = this.map.createFromObjects("Objects", {
            name: "powerup",
            key: "tilemap_sheet",
            frame: 9
        });
        this.physics.world.enable(this.powerupObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.powerupGroup = this.add.group(this.powerupObjects);

        // Signs
        this.signObjects = this.map.createFromObjects("Objects", {
            name: "sign",
            key: "tilemap_sheet",
            frame: 86
        });
        this.physics.world.enable(this.signObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.signGroup = this.add.group(this.signObjects);

        // Respawn zones
        this.respawnObjects = this.map.createFromObjects("Objects", {
            name: "respawn"
        });
        this.respawnObjects.forEach(obj => obj.setVisible(false));
        this.physics.world.enable(this.respawnObjects, Phaser.Physics.Arcade.STATIC_BODY);
        this.respawnGroup = this.add.group(this.respawnObjects);

        // Water zones
        this.waterObjects = this.map.createFromObjects("Objects", {
            name: "water"
        });
        this.waterRects = this.waterObjects.map(obj => {
            return new Phaser.Geom.Rectangle(
                obj.x,
                obj.y,
                obj.displayWidth  || obj.width  || 18,
                obj.displayHeight || obj.height || 18
            );
        });
        this.waterObjects.forEach(obj => obj.setVisible(false));

        // Bubble texture
        let bubbleGfx = this.make.graphics({ x: 0, y: 0, add: false });
        bubbleGfx.fillStyle(0xaaddff, 1);
        bubbleGfx.fillCircle(4, 4, 4);
        bubbleGfx.generateTexture("bubble", 8, 8);
        bubbleGfx.destroy();

        // Bubble pop ring texture
        let popGfx = this.make.graphics({ x: 0, y: 0, add: false });
        popGfx.lineStyle(1, 0xffffff, 1);
        popGfx.strokeCircle(6, 6, 5);
        popGfx.generateTexture("bubblePop", 12, 12);
        popGfx.destroy();

        // Bubble pop emitter
        my.vfx.bubblePop = this.add.particles(0, 0, "bubblePop", {
            lifespan: 200,
            speed:    { min: 10, max: 30 },
            scale:    { start: 0.8, end: 0 },
            alpha:    { start: 0.8, end: 0 },
            quantity: 4,
            emitting: false
        });

        // Each water zone gets its own emitter with randomness
        this.waterRects.forEach(rect => {
            let zoneEmitter = this.add.particles(0, 0, "bubble", {
                emitZone: { type: 'random', source: rect },
                speedY:   { min: -15, max: -70 },
                speedX:   { min: -8,  max: 8   },
                lifespan: { min: 600, max: 2500 },
                scale:    { min: 0.2, max: 2.0 },
                alpha:    { start: 0.7, end: 0 },
                blendMode: 'ADD',
                onEmit: (particle) => {
                    particle.phase = Math.random() * Math.PI * 2;
                },
                onUpdate: (particle) => {
                    particle.accelerationX = Math.sin(
                        (this.time.now * 0.003) + particle.phase
                    ) * 25;
                    if (particle.lifeT < 0.05 && !particle.popped) {
                        particle.popped = true;
                        my.vfx.bubblePop.setPosition(particle.x, particle.y);
                        my.vfx.bubblePop.explode(4);
                    }
                }
            });
            zoneEmitter.stop();
            this.time.addEvent({
                delay: Phaser.Math.Between(80, 500),
                loop: true,
                callback: () => {
                    zoneEmitter.explode(Phaser.Math.Between(1, 4));
                }
            });
        });

        // Player
        my.sprite.player = this.physics.add.sprite(
            this.startX, this.startY,
            "platformer_characters", "tile_0000.png"
        );
        my.sprite.player.setCollideWorldBounds(true);
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Coin collect particles
        my.vfx.coinCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ["star_01.png", "star_02.png", "star_03.png"],
            lifespan: 600,
            speed:    { min: 50, max: 150 },
            scale:    { start: 0.04, end: 0 },
            alpha:    { start: 1, end: 0 },
            rotate:   { min: 0, max: 360 },
            gravityY: 300,
            quantity: 12,
            emitting: false
        });

        // Key collect particles
        my.vfx.keyCollect = this.add.particles(0, 0, "kenny-particles", {
            frame: ["magic_01.png", "magic_02.png", "magic_03.png"],
            lifespan: 800,
            speed:    { min: 40, max: 180 },
            scale:    { start: 0.05, end: 0 },
            alpha:    { start: 1, end: 0 },
            rotate:   { min: 0, max: 360 },
            gravityY: 100,
            quantity: 20,
            emitting: false
        });

        // Jump particles
        my.vfx.jump = this.add.particles(0, 0, "kenny-particles", {
            frame: ["spark_01.png", "spark_02.png", "spark_03.png"],
            lifespan: 300,
            speed:    { min: 30, max: 100 },
            scale:    { start: 0.03, end: 0 },
            alpha:    { start: 1, end: 0 },
            angle:    { min: 180, max: 360 },
            gravityY: 400,
            quantity: 8,
            emitting: false
        });

        // Double jump particles
        my.vfx.doubleJump = this.add.particles(0, 0, "kenny-particles", {
            frame: ["twirl_01.png", "twirl_02.png", "twirl_03.png"],
            lifespan: 400,
            speed:    { min: 50, max: 120 },
            scale:    { start: 0.05, end: 0 },
            alpha:    { start: 1, end: 0 },
            rotate:   { min: 0, max: 360 },
            gravityY: 200,
            quantity: 10,
            emitting: false
        });

        // Land dust particles
        my.vfx.land = this.add.particles(0, 0, "kenny-particles", {
            frame: ["dirt_01.png", "dirt_02.png", "dirt_03.png"],
            lifespan: 300,
            speed:    { min: 20, max: 80 },
            scale:    { start: 0.03, end: 0 },
            alpha:    { start: 0.8, end: 0 },
            angle:    { min: 160, max: 200 },
            gravityY: 300,
            quantity: 6,
            emitting: false
        });

        // Walk dust particles
        my.vfx.walk = this.add.particles(0, 0, "kenny-particles", {
            frame: ["dirt_01.png", "dirt_02.png", "dirt_03.png"],
            lifespan: 200,
            speed:    { min: 10, max: 40 },
            scale:    { start: 0.025, end: 0 },
            alpha:    { start: 0.8, end: 0 },
            angle:    { min: 160, max: 200 },
            gravityY: 300,
            quantity: 1,
            frequency: 100,
            emitting: false
        });

        // Hurt particles
        my.vfx.hurt = this.add.particles(0, 0, "kenny-particles", {
            frame: ["spark_01.png", "spark_02.png"],
            lifespan: 400,
            speed:    { min: 50, max: 150 },
            scale:    { start: 0.04, end: 0 },
            alpha:    { start: 1, end: 0 },
            tint:     0xff0000,
            quantity: 10,
            emitting: false
        });

        // Coin collection overlap
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (player, coin) => {
            coin.destroy();
            this.coinScore++;
            this.coinText.setText("Coins: " + this.coinScore + "/" + this.TOTAL_COINS);
            my.vfx.coinCollect.setPosition(coin.x, coin.y);
            my.vfx.coinCollect.explode(12);
            if (this.sound.get("gemSound")) this.sound.play("gemSound");
        });

        // Key collection overlap — destroy both physics body and float sprite
        this.physics.add.overlap(my.sprite.player, this.keyGroup, (player, key) => {
            if (key.floatSprite) key.floatSprite.destroy();
            key.destroy();
            this.keyCount++;
            this.keyText.setText("Keys: " + this.keyCount + "/" + this.KEY_TOTAL);
            my.vfx.keyCollect.setPosition(key.x, key.y);
            my.vfx.keyCollect.explode(20);
            if (this.sound.get("keySound")) this.sound.play("keySound");

            if (this.keyCount >= this.KEY_TOTAL) {
                this.exitObjects.forEach(exit => {
                    this.tweens.add({
                        targets: exit,
                        alpha: { from: 0.4, to: 1 },
                        duration: 300,
                        yoyo: true,
                        repeat: 3,
                        onComplete: () => exit.setAlpha(1)
                    });
                });
                this.keyText.setColor("#ffff00");
                if (this.sound.get("doorOpenSound")) this.sound.play("doorOpenSound");
            }
        });

        // Exit door overlap
        this.physics.add.overlap(my.sprite.player, this.exitGroup, () => {
            if (this.keyCount >= this.KEY_TOTAL) {
                if (this.bgm) this.bgm.stop();
                this.scene.start("winScene");
            }
        });

        // Spike overlap
        this.physics.add.overlap(my.sprite.player, this.spikeGroup, () => {
            this.takeDamage(false);
        });

        // Respawn zone overlap
        this.physics.add.overlap(my.sprite.player, this.respawnGroup, (player, respawn) => {
            this.respawnX = respawn.x;
            this.respawnY = respawn.y;
            respawn.destroy();
        });

        // Powerup overlap
        this.physics.add.overlap(my.sprite.player, this.powerupGroup, (player, powerup) => {
            if (powerup.collected) return;
            powerup.collected = true;

            this.tweens.add({
                targets: powerup,
                y: powerup.y - 10,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    // Floating item pops out above box then disappears
                    let item = this.add.image(
                        powerup.x, powerup.y - 18,
                        'tilemap_sheet', 9
                    );
                    this.tweens.add({
                        targets: item,
                        y: item.y - 20,
                        alpha: { from: 1, to: 0 },
                        duration: 600,
                        ease: 'Quad.easeOut',
                        onComplete: () => item.destroy()
                    });

                    // Destroy powerup sprite
                    powerup.destroy();

                    // Speed boost for 5 seconds
                    if (!this.powerupActive) {
                        this.powerupActive = true;
                        this.ACCELERATION = 1400;
                        this.JUMP_VELOCITY = -750;

                        // Show powerup prompt
                        this.showPowerupPrompt("⚡ Speed Boost! 5 seconds!");

                        this.time.delayedCall(5000, () => {
                            this.ACCELERATION = 800;
                            this.JUMP_VELOCITY = -550;
                            this.powerupActive = false;
                            this.showPowerupPrompt("Speed Boost ended.");
                        });
                    }
                    if (this.sound.get("gemSound")) this.sound.play("gemSound");
                }
            });
        });

        // Sign overlap
        this.physics.add.overlap(my.sprite.player, this.signGroup, (player, sign) => {
            this.nearSign = sign;
        });

        // Input
        cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');
        this.eKey = this.input.keyboard.addKey('E');
        this.escKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
        }, this);

        // HUD — high depth so it renders above everything
        this.coinText = this.add.text(16, 16, "Coins: 0/" + this.TOTAL_COINS, {
            fontSize: "18px",
            fill: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
            fontFamily: "Arial"
        }).setScrollFactor(0).setDepth(100);

        this.keyText = this.add.text(16, 44, "Keys: 0/" + this.KEY_TOTAL, {
            fontSize: "18px",
            fill: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
            fontFamily: "Arial"
        }).setScrollFactor(0).setDepth(100);

        this.livesText = this.add.text(16, 72, "Lives: ❤️❤️❤️", {
            fontSize: "18px",
            fill: "#ff4444",
            stroke: "#000000",
            strokeThickness: 4,
            fontFamily: "Arial"
        }).setScrollFactor(0).setDepth(100);

        // Powerup prompt — center screen, fades out
        this.powerupPrompt = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 80,
            "",
            {
                fontSize: "20px",
                fill: "#00ffff",
                stroke: "#000000",
                strokeThickness: 4,
                fontFamily: "Arial",
                backgroundColor: "#000000",
                padding: { x: 12, y: 6 }
            }
        ).setScrollFactor(0).setDepth(100).setVisible(false).setOrigin(0.5);

        // Sign E prompt
        this.signPrompt = this.add.text(
            this.scale.width / 2,
            this.scale.height - 60,
            "Press E to read",
            {
                fontSize: "16px",
                fill: "#ffff00",
                stroke: "#000000",
                strokeThickness: 4,
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(100).setVisible(false).setOrigin(0.5);

        // Sign message box
        this.signMessage = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            "",
            {
                fontSize: "16px",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                backgroundColor: "#000000",
                padding: { x: 10, y: 6 },
                align: "center",
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(100).setVisible(false).setOrigin(0.5);

        // Game over overlay
        this.gameOverOverlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000, 0.85
        ).setScrollFactor(0).setDepth(200).setVisible(false);

        this.gameOverTitle = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 80,
            "YOU DIED",
            {
                fontSize: "48px",
                fill: "#ff2222",
                stroke: "#000000",
                strokeThickness: 6,
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(201).setVisible(false).setOrigin(0.5);

        this.gameOverSub = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 20,
            "You ran out of lives...",
            {
                fontSize: "20px",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 3,
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(201).setVisible(false).setOrigin(0.5);

        this.gameOverRestart = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 50,
            "▶  Try Again",
            {
                fontSize: "24px",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                backgroundColor: "#881111",
                padding: { x: 24, y: 10 },
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(201).setVisible(false).setOrigin(0.5)
         .setInteractive({ useHandCursor: true });

        this.gameOverRestart.on('pointerover', () => {
            this.gameOverRestart.setStyle({ fill: "#ffff00" });
        });
        this.gameOverRestart.on('pointerout', () => {
            this.gameOverRestart.setStyle({ fill: "#ffffff" });
        });
        this.gameOverRestart.on('pointerdown', () => {
            if (this.bgm) this.bgm.stop();
            this.scene.restart();
        });

        // Settings overlay
        this.settingsOverlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            400, 220,
            0x000000, 0.9
        ).setScrollFactor(0).setDepth(150).setVisible(false);

        this.settingsTitle = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 70,
            "⚙️  SETTINGS",
            {
                fontSize: "22px",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(151).setVisible(false).setOrigin(0.5);

        this.settingsDivider = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2 - 40,
            360, 2,
            0x444444
        ).setScrollFactor(0).setDepth(151).setVisible(false);

        this.musicButton = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            "🎵  Music: ON",
            {
                fontSize: "16px",
                fill: "#00ff00",
                stroke: "#000000",
                strokeThickness: 3,
                backgroundColor: "#222222",
                padding: { x: 20, y: 8 },
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(151).setVisible(false).setOrigin(0.5)
         .setInteractive({ useHandCursor: true });

        this.musicButton.on('pointerover', () => {
            this.musicButton.setStyle({ fill: "#ffff00" });
        });
        this.musicButton.on('pointerout', () => {
            this.musicButton.setStyle({
                fill: this.musicEnabled ? "#00ff00" : "#ff4444"
            });
        });
        this.musicButton.on('pointerdown', () => {
            this.musicEnabled = !this.musicEnabled;
            if (this.musicEnabled) {
                this.bgm.play();
                this.musicButton.setText("🎵  Music: ON");
                this.musicButton.setStyle({ fill: "#00ff00" });
            } else {
                this.bgm.stop();
                this.musicButton.setText("🎵  Music: OFF");
                this.musicButton.setStyle({ fill: "#ff4444" });
            }
        });

        this.settingsClose = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 65,
            "Press ESC to close",
            {
                fontSize: "12px",
                fill: "#888888",
                stroke: "#000000",
                strokeThickness: 2,
                fontFamily: "Arial"
            }
        ).setScrollFactor(0).setDepth(151).setVisible(false).setOrigin(0.5);

        // Background music
        this.bgm = this.sound.add("bgm", {
            loop: true,
            volume: 0.5
        });
        this.bgm.play();

        // Camera
        this.cameras.main.setBounds(
            0, 0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );
        this.cameras.main.startFollow(my.sprite.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    // Show a temporary powerup prompt that fades out
    showPowerupPrompt(message) {
        this.powerupPrompt.setText(message);
        this.powerupPrompt.setVisible(true);
        this.powerupPrompt.setAlpha(1);

        // Kill any existing tween on the prompt
        this.tweens.killTweensOf(this.powerupPrompt);

        this.tweens.add({
            targets: this.powerupPrompt,
            alpha: 0,
            duration: 2000,
            delay: 1000,
            ease: 'Linear',
            onComplete: () => {
                this.powerupPrompt.setVisible(false);
            }
        });
    }

    openSettings() {
        this.settingsOpen = true;
        this.settingsOverlay.setVisible(true);
        this.settingsTitle.setVisible(true);
        this.settingsDivider.setVisible(true);
        this.musicButton.setVisible(true);
        this.settingsClose.setVisible(true);
        this.physics.world.pause();
        this.tweens.pauseAll();
    }

    closeSettings() {
        this.settingsOpen = false;
        this.settingsOverlay.setVisible(false);
        this.settingsTitle.setVisible(false);
        this.settingsDivider.setVisible(false);
        this.musicButton.setVisible(false);
        this.settingsClose.setVisible(false);
        this.physics.world.resume();
        this.tweens.resumeAll();
    }

    takeDamage(isWater) {
        if (this.isDead) return;
        this.isDead = true;

        my.vfx.hurt.setPosition(my.sprite.player.x, my.sprite.player.y);
        my.vfx.hurt.explode(10);
        this.cameras.main.flash(300, 255, 0, 0);
        if (this.sound.get("hurtSound")) this.sound.play("hurtSound");

        if (isWater) {
            this.time.delayedCall(300, () => {
                my.sprite.player.setPosition(this.startX, this.startY);
                my.sprite.player.setVelocity(0, 0);
                my.sprite.player.setAcceleration(0, 0);
                this.isDead = false;
            });
        } else {
            this.lives--;

            let heartsStr = "";
            for (let i = 0; i < this.lives; i++) heartsStr += "❤️";
            for (let i = this.lives; i < 3; i++) heartsStr += "🖤";
            this.livesText.setText("Lives: " + heartsStr);

            if (this.lives <= 0) {
                this.time.delayedCall(400, () => {
                    if (this.bgm) this.bgm.stop();
                    this.gameOverOverlay.setVisible(true);
                    this.gameOverTitle.setVisible(true);
                    this.gameOverSub.setVisible(true);
                    this.gameOverRestart.setVisible(true);

                    this.tweens.add({
                        targets: this.gameOverTitle,
                        alpha: { from: 1, to: 0.4 },
                        duration: 600,
                        yoyo: true,
                        repeat: -1
                    });

                    this.input.keyboard.once("keydown-R", () => {
                        this.scene.restart();
                    });
                });
                return;
            }

            this.time.delayedCall(400, () => {
                my.sprite.player.setPosition(this.respawnX, this.respawnY);
                my.sprite.player.setVelocity(0, 0);
                my.sprite.player.setAcceleration(0, 0);
                this.isDead = false;
            });
        }
    }

    update() {
        if (this.isDead) return;

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (this.settingsOpen) {
                this.closeSettings();
            } else {
                this.openSettings();
            }
        }

        if (this.settingsOpen) return;

        // Water hazard check
        let px = my.sprite.player.x;
        let py = my.sprite.player.y;
        this.waterRects.forEach(rect => {
            if (Phaser.Geom.Rectangle.Contains(rect, px, py)) {
                this.takeDamage(true);
            }
        });

        // Sign interaction
        let wasNearSign = this.nearSign;
        this.nearSign = null;

        if (wasNearSign) {
            this.signPrompt.setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
                if (this.signVisible) {
                    this.signMessage.setVisible(false);
                    this.signVisible = false;
                } else {
                    this.signMessage.setText(
                        "Welcome to the Mushroom Marshes!\n" +
                        "Collect all 3 keys to escape!\n" +
                        "collect ALL coins as a side quest :)"
                    );
                    this.signMessage.setVisible(true);
                    this.signVisible = true;
                }
            }
        } else {
            this.signPrompt.setVisible(false);
            this.signMessage.setVisible(false);
            this.signVisible = false;
        }

        // Landing detection
        const onGround = my.sprite.player.body.blocked.down;
        if (onGround && !this.wasOnGround) {
            my.vfx.land.setPosition(
                my.sprite.player.x,
                my.sprite.player.y + 8
            );
            my.vfx.land.explode(6);
            if (this.sound.get("landSound")) this.sound.play("landSound");
        }
        this.wasOnGround = onGround;

        // Horizontal movement
        if (cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            this.lastDirection = -1;

            my.vfx.walk.setPosition(
                my.sprite.player.x + 4,
                my.sprite.player.y + my.sprite.player.height * 0.4
            );
            if (!my.vfx.walk.emitting) my.vfx.walk.start();

        } else if (cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            this.lastDirection = 1;

            my.vfx.walk.setPosition(
                my.sprite.player.x - 4,
                my.sprite.player.y + my.sprite.player.height * 0.4
            );
            if (!my.vfx.walk.emitting) my.vfx.walk.start();

        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            if (my.vfx.walk.emitting) my.vfx.walk.stop();
        }

        // Camera offset ahead of player
        this.cameras.main.setFollowOffset(-this.lastDirection * 100, 0);

        // Jump and double jump
        if (onGround) {
            this.canDoubleJump = true;
            this.hasDoubleJumped = false;
        }

        if (!onGround) {
            my.sprite.player.anims.play('jump');
        }

        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            if (onGround) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                my.vfx.jump.setPosition(
                    my.sprite.player.x,
                    my.sprite.player.y + 8
                );
                my.vfx.jump.explode(8);
                if (this.sound.get("jumpSound")) this.sound.play("jumpSound");

            } else if (this.canDoubleJump && !this.hasDoubleJumped) {
                my.sprite.player.body.setVelocityY(this.DOUBLE_JUMP_VELOCITY);
                this.hasDoubleJumped = true;
                this.canDoubleJump = false;
                my.vfx.doubleJump.setPosition(
                    my.sprite.player.x,
                    my.sprite.player.y
                );
                my.vfx.doubleJump.explode(10);
                if (this.sound.get("doubleJumpSound")) this.sound.play("doubleJumpSound");
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            if (this.bgm) this.bgm.stop();
            this.scene.restart();
        }
    }
}