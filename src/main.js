// The Mushroom Marshes
// Platformer Game
// Phaser 3.70.0

"use strict"

let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    width: 1440,
    height: 900,
    scene: [Load, Platformer, WinScene]
}

var cursors;
const SCALE = 2.0;
var my = { sprite: {}, text: {}, vfx: {} };

const game = new Phaser.Game(config);