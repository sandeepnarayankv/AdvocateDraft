'use strict';
// Draws the app icon (build/icon.png, 512×512): the "§" mark on the app's
// bronze accent. electron-builder converts it to .ico for Windows.
// Run: node build/make-icon.js
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const SIZE = 512;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Rounded square.
const r = 96;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.arcTo(SIZE, 0, SIZE, SIZE, r);
ctx.arcTo(SIZE, SIZE, 0, SIZE, r);
ctx.arcTo(0, SIZE, 0, 0, r);
ctx.arcTo(0, 0, SIZE, 0, r);
ctx.closePath();
const g = ctx.createLinearGradient(0, 0, 0, SIZE);
g.addColorStop(0, '#9c7c44');
g.addColorStop(1, '#6f5428');
ctx.fillStyle = g;
ctx.fill();

// The section sign.
ctx.fillStyle = '#fbf6ea';
ctx.font = 'bold 380px Georgia, "Times New Roman", serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('§', SIZE / 2, SIZE / 2 + 18);

fs.writeFileSync(path.join(__dirname, 'icon.png'), canvas.toBuffer('image/png'));
console.log('wrote build/icon.png');
