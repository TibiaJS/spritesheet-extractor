#!/usr/bin/env node
'use strict';

// Process
var datFile  = process.argv[2],
    sprFile  = process.argv[3],
    category = process.argv[4],
    id       = process.argv[5],
    outDir   = process.argv[6];

// Require
var fs       = require('fs'),
    PNGImage = require('pngjs-image'),
    Metadata = require('./src/Metadata'),
    Sprites  = require('./src/Sprites');

// Checking extension of datFile.
if(datFile.substring((datFile.length - 4), datFile.length) !== '.dat') {
  throw new Error('Only .dat is allowed for the first argument!');
}

// Checking if the dat file exists.
if(!fs.existsSync(datFile)) {
  throw new Error('File not found: ' + datFile);
}

// Checking if extension of sprFile.
if(sprFile.substring((sprFile.length - 4), sprFile.length) !== '.spr') {
  throw new Error('Only .spr is allowed for the second argument!');
}

// Checking if the spr file exists.
if(!fs.existsSync(sprFile)) {
  throw new Error('File not found: ' + sprFile);
}

// Checking if the last argument passed otherwise set to default output.
if(!outDir) {
  outDir = './out/';
} else if (outDir.charAt(outDir.length-1) !== '/') { // Check if last char is '/'
  outDir = outDir + '/';
}

if(!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Checking if is a valid category.
//if(category != 'item' || category != 'outfit' || category != 'effect' || category != 'missile') {
  //throw new Error('Invalid category: ' + category);
//}

var getTextureIndex = function(group, l, x, y, z, f) {
  return (((f % group.frames * group.patternZ + z) * group.patternY + y) * group.patternX + x) * group.layers + l;
};

var getSpriteIndex = function(group, w, h, l, x, y, z, f) {
  return ((((((f % group.frames) * group.patternZ + z) * group.patternY + y) * group.patternX + x) * group.layers + l) * group.height + h) * group.width + w;
};

var createSpriteSheet = function(frameGroup, spr) {
  // Measures and creates the image.
  var size         = 32,
      totalX       = frameGroup.patternZ * frameGroup.patternX * frameGroup.layers,
      totalY       = frameGroup.frames * frameGroup.patternY,
      bitmapWidth  = (totalX * frameGroup.width) * size,
      bitmapHeight = (totalY * frameGroup.height) * size,
      pixelsWidth  = frameGroup.width * size,
      pixelsHeight = frameGroup.height * size,
      image        = PNGImage.createImage(bitmapWidth, bitmapHeight);
  
  // Fills the image with magenta color.
  image.fillRect(0, 0, bitmapWidth, bitmapHeight, {red:255, green:0, blue:255, alpha:255});

  for (var f = 0; f < frameGroup.frames; f++) {
    for (var z = 0; z < frameGroup.patternZ; z++) {
      for (var y = 0; y < frameGroup.patternY; y++) {
        for (var x = 0; x < frameGroup.patternX; x++) {
          for (var l = 0; l < frameGroup.layers; l++) {
            
            var index = getTextureIndex(frameGroup, l, x, y, z, f);
            var fx = (index % totalX) * pixelsWidth;
            var fy = Math.floor(index / totalX) * pixelsHeight;
            
            for (var w = 0; w < frameGroup.width; w++) {
              for (var h = 0; h < frameGroup.height; h++) {
                
                index = getSpriteIndex(frameGroup, w, h, l, x, y, z, f);
                var px = ((frameGroup.width - w - 1) * size);
                var py = ((frameGroup.height - h - 1) * size);
                spr.copyPixels(frameGroup.sprites[index], image, px + fx, py + fy);
              }
            }
          }
        }
      }
    }
  }
  return image;
};

var metadata = new Metadata(datFile, function(dat) {
  if (!dat.hasThingType(category, id)) {
    var maxid = dat.getMaxId(category);
    console.log('Invalid ' + category + ' id ' + id + '. The max ' + category + ' id is ' + maxid + '.');
    return;
  }

  var sprites = new Sprites(sprFile, function (spr) {
        var thing = dat.getThingType(category, id);
        for (var i = 0; i < thing.groups.length; i++) {
          var group = thing.getFrameGroup(i);
          if (group != null) {
            var fileName = category + '_' + id;
            if (category === 'outfit') {
                if (i === 0) {
                  fileName = 'idle_' + fileName;
                }
                else {
                  fileName = 'walking_' + fileName;
                }
            }
            var image = createSpriteSheet(group, spr);
            image.writeImage(outDir + fileName + '.png');
          }
        }
    });
});
