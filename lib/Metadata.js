"use strict";

var fs = require('fs');
var BufferReader = require('buffer-reader');
var ThingType = require("./ThingType.js");
var reader;

function Metadata(file, cb) {

  // Checking if file exists
  if(!fs.existsSync(file)) {
    throw new Error('File not found: ' + file);
  }

  // Setupping variables
  this.signature    = 0,
  this.items        = [],
  this.outfits      = [],
  this.effects      = [],
  this.missiles     = [],
  this.itemCount    = 0,
  this.outfitCount  = 0,
  this.effectCount  = 0,
  this.missileCount = 0;

  var self = this;
  fs.readFile(file, function(err, buffer) {
    if (err) throw err;

    self._readLists(buffer);

    cb(self);
  });
}

Metadata.prototype.getSignature = function() {
  return this.signature;
};

Metadata.prototype.getItemCount = function() {
  return this.itemCount;
};

Metadata.prototype.getOutfitCount = function() {
  return this.outfitCount;
};

Metadata.prototype.getEffectCount = function() {
  return this.effectCount;
};

Metadata.prototype.getMissileCount = function() {
  return this.missileCount;
};

Metadata.prototype.hasThingType = function(category, id) {
  if (category == 'item') {
    return (id >= 100 && id <= this.itemCount);
  } else if (category == 'outfit') {
    return (id >= 1 && id <= this.outfitCount);
  } else if (category == 'effect') {
    return (id >= 1 && id <= this.effectCount);
  } else if (category == 'missile') {
    return (id >= 1 && id <= this.missileCount);
  }
  return false;
};

Metadata.prototype.getThingType = function(category, id) {
  if (category == 'item') {
    return this.getItem(id);
  } else if (category == 'outfit') {
    return this.getOutfit(id);
  } else if (category == 'effect') {
    return this.getEffect(id);
  } else if (category == 'missile') {
    return this.getMissile(id);
  }
  return null;
};

Metadata.prototype.getMinId = function(category) {
  if (category == 'item') {
    return 100;
  }
  return 1;
};

Metadata.prototype.getMaxId = function(category) {
  if (category == 'item') {
    return this.itemCount;
  } else if (category == 'outfit') {
    return this.outfitCount;
  } else if (category == 'effect') {
    return this.effectCount;
  } else if (category == 'missile') {
    return this.missileCount;
  }
  return 0;
};

Metadata.prototype.getItem = function(id) {
  if (id >= 100 && id <= this.itemCount) {
    return this.items[id];
  }
  return null;
};

Metadata.prototype.getOutfit = function(id) {
  if (id >= 1 && id <= this.outfitCount) {
    return this.outfits[id];
  }
  return null;
};

Metadata.prototype.getEffect = function(id) {
  if (id >= 1 && id <= this.effectCount) {
    return this.effects[id];
  }
  return null;
};

Metadata.prototype.getMissile = function(id) {
  if (id >= 1 && id <= this.missileCount) {
    return this.missiles[id];
  }
  return null;
};

Metadata.prototype._readLists = function(buffer) {
    reader            = new BufferReader(buffer);
    this.signature    = reader.nextUInt32LE();
    this.itemCount    = reader.nextUInt16LE();
    this.outfitCount  = reader.nextUInt16LE();
    this.effectCount  = reader.nextUInt16LE();
    this.missileCount = reader.nextUInt16LE();

    var id;
    for (id = 100; id <= this.itemCount; id++) {
      this.items[id] = this._readThing(id, 'item');
    }

    for (id = 1; id <= this.outfitCount; id++) {
      this.outfits[id] = this._readThing(id, 'outfit');
    }

    for (id = 1; id <= this.effectCount; id++) {
      this.effects[id] = this._readThing(id, 'effect');
    }

    for (id = 1; id <= this.missileCount; id++) {
      this.missiles[id] = this._readThing(id, 'missile');
    }
}

Metadata.prototype._readThing = function(id, category) {

  var thing = new ThingType(id, category);
  var flag;

  do
  {
    flag = reader.nextUInt8();
    if (flag === 0xFF) {
      break;
    }

    switch (flag) {
      case 0x00: // Is ground
      case 0x08: // Writable
      case 0x09: // Writable once
      case 0x1A: // Has elevation
      case 0x1D: // Minimap
      case 0x1E: // Lens help
      case 0x21: // Cloth
      case 0x23: // Default action
      {
        reader.move(2);
        break;
      }

      case 0x16: // Has light
      case 0x19: // Has offset
      {
        reader.move(4);
        break;
      }

      case 0x22: // Market
      {
        reader.move(6);
        var length = reader.nextUInt16LE();
        reader.move(length + 4);
        break;
      }
    }
  } while (flag !== 0xFF);

  var isOutfit   = category === 'outfit';
  var groupCount = 1;
  if (isOutfit) {
    groupCount = reader.nextUInt8();
  }

  for (var k = 0; k < groupCount; k++) {
    var groupType = 0;
    if (isOutfit) {
      groupType = reader.nextUInt8();
    }

    var group = {
      width : 0,
      height : 0,
      layers : 0,
      patternX : 0,
      patternY : 0,
      patternZ : 0,
      frames : 0,
      sprites : []
    };

    group.width = reader.nextUInt8();
    group.height = reader.nextUInt8();

    // Skipping exact size
    if (group.width > 1 || group.height > 1) {
      reader.move(1);
    }

    group.layers = reader.nextUInt8();
    group.patternX = reader.nextUInt8();
    group.patternY = reader.nextUInt8();
    group.patternZ = reader.nextUInt8();
    group.frames = reader.nextUInt8();

    // Skipping frame durations
    if (group.frames > 1) {
      reader.move(6 + (8 * group.frames));
    }

    var totalSprites = group.width *
                       group.height *
                       group.layers *
                       group.patternX *
                       group.patternY *
                       group.patternZ *
                       group.frames;

    if (totalSprites > 4096) {
      throw new Error('A thing type has more than 4096 sprites.');
    }

    for (var i = 0; i < totalSprites; i++) {
      group.sprites[i] = reader.nextUInt32LE();
    }
    thing.groups[groupType] = group;
  }
  return thing;
}

module.exports = Metadata;
