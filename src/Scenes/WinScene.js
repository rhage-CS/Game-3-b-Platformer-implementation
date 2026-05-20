// WinScene.js
// Shown when player collects all 3 keys and reaches the exit door

class WinScene extends Phaser.Scene {
    constructor() {
        super("winScene");
    }

    create() {
        // Black background
        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000
        );

        // Star burst from left side
        this.add.particles(
            this.scale.width * 0.2,
            this.scale.height * 0.5,
            "kenny-particles", {
                frame: ["star_01.png", "star_02.png", "star_03.png",
                        "magic_01.png", "magic_02.png"],
                lifespan: 2000,
                speed:    { min: 100, max: 300 },
                scale:    { start: 0.08, end: 0 },
                alpha:    { start: 1, end: 0 },
                rotate:   { min: 0, max: 360 },
                angle:    { min: -60, max: 60 },
                gravityY: 200,
                quantity: 3,
                frequency: 100,
                blendMode: 'ADD'
            }
        );

        // Star burst from right side
        this.add.particles(
            this.scale.width * 0.8,
            this.scale.height * 0.5,
            "kenny-particles", {
                frame: ["star_01.png", "star_02.png", "star_03.png",
                        "magic_01.png", "magic_02.png"],
                lifespan: 2000,
                speed:    { min: 100, max: 300 },
                scale:    { start: 0.08, end: 0 },
                alpha:    { start: 1, end: 0 },
                rotate:   { min: 0, max: 360 },
                angle:    { min: 120, max: 240 },
                gravityY: 200,
                quantity: 3,
                frequency: 100,
                blendMode: 'ADD'
            }
        );

        // Twirl burst from center
        this.add.particles(
            this.scale.width / 2,
            this.scale.height * 0.3,
            "kenny-particles", {
                frame: ["twirl_01.png", "twirl_02.png", "twirl_03.png"],
                lifespan: 1500,
                speed:    { min: 50, max: 200 },
                scale:    { start: 0.06, end: 0 },
                alpha:    { start: 1, end: 0 },
                rotate:   { min: 0, max: 360 },
                gravityY: 100,
                quantity: 2,
                frequency: 150,
                blendMode: 'ADD'
            }
        );

        // Glow effect behind title
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 120,
            "YOU ESCAPED!",
            {
                fontSize: "52px",
                fill: "#ffaa00",
                stroke: "#000000",
                strokeThickness: 8
            }
        ).setOrigin(0.5).setAlpha(0.3);

        // Main title
        let titleText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 120,
            "YOU ESCAPED!",
            {
                fontSize: "48px",
                fill: "#ffff00",
                stroke: "#000000",
                strokeThickness: 6
            }
        ).setOrigin(0.5);

        // Pulse the title
        this.tweens.add({
            targets: titleText,
            scaleX: { from: 1, to: 1.05 },
            scaleY: { from: 1, to: 1.05 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 50,
            "The Mushroom Marshes are behind you...\nfor now.",
            {
                fontSize: "18px",
                fill: "#aaffaa",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center"
            }
        ).setOrigin(0.5);

        // Play again button
        let playAgainBtn = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 60,
            "▶  Play Again",
            {
                fontSize: "22px",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                backgroundColor: "#1a6b1a",
                padding: { x: 24, y: 10 }
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playAgainBtn.on('pointerover', () => {
            playAgainBtn.setStyle({ fill: "#ffff00" });
        });
        playAgainBtn.on('pointerout', () => {
            playAgainBtn.setStyle({ fill: "#ffffff" });
        });
        playAgainBtn.on('pointerdown', () => {
            this.scene.start("platformerScene");
        });

        // R key to restart
        this.input.keyboard.once("keydown-R", () => {
            this.scene.start("platformerScene");
        });

        // Restart hint
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 120,
            "or press R to restart",
            {
                fontSize: "14px",
                fill: "#888888",
                stroke: "#000000",
                strokeThickness: 2
            }
        ).setOrigin(0.5);
    }

    update() {}
}