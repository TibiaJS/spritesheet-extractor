"use strict";

var fs = require('fs');
var BufferReader = require('buffer-reader');
var reader;

function Sprites(file, cb) {

  // Checking if file exists
  if(!fs.existsSync(file)) {
    throw new Error('File not found: ' + file);
  }

  // Setupping variables
  this.signature   = 0,
  this.spriteCount = 0;

  var self = this;
  fs.readFile(file, function(err, buffer) {
    if (err) throw err;

    reader           = new BufferReader(buffer);
    self.signature   = reader.nextUInt32LE();
    self.spriteCount = reader.nextUInt32LE();

    cb(self);
  });
}

Sprites.prototype.getSignature = function() {
  return this.signature;
}

Sprites.prototype.getSpriteCount = function() {
  return this.spriteCount;
}

Sprites.prototype.copyPixels = function(spriteId, image, x, y) {
  var formula = 8 + (spriteId - 1) * 4;
  reader.seek(formula);
    
  var address = reader.nextUInt32LE();
  if (address == 0) { // Address 0 always is an empty sprite.
    return;
  }
  reader.seek(address);
    
  // Skipping color key.
  reader.move(3);

  var size         = 32,
      offset       = reader.tell() + reader.nextUInt16LE(),
      currentPixel = 0,
      color        = {red:0, green:0, blue:0, alpha:255};

  while(reader.tell() < offset) {
    var transparentPixels = reader.nextUInt16LE(),
        coloredPixels     = reader.nextUInt16LE();
    currentPixel += transparentPixels;
    for (var i = 0; i < coloredPixels; i++) {
      color.red   = reader.nextUInt8();
      color.green = reader.nextUInt8();
      color.blue  = reader.nextUInt8();
      image.setPixel(parseInt(currentPixel % size) + x, parseInt(currentPixel / size) + y, color);
      currentPixel++;
    }
  }
}

module.exports = Sprites;
