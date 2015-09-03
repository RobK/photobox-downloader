#!/usr/bin/env node
/**
 * PhotoBox Downloader
 *
 * MIT License (see license file)
 * Copyright 2015 - Robert Kehoe
 */

"use strict";
var prompt = require('prompt');
var path = require('path');
var about = require('./package.json');
var program = require('commander');

program
  .version(about.version)
  .option('-d, --debug', 'Output a lot of debug information', false)
  .parse(process.argv);

prompt.message = ''.green;
prompt.delimiter = ':'.green;

prompt.start();
console.log('\x1b[33m===========================================================================');
if (program.debug) {
  console.log('  DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG DEBUG');
}
console.log('\x1b[37m\x1b[1m', 'PhotoBox Downloader v' + about.version);
console.log(' Copyright 2015 - Robert Kehoe - MIT Licensed');
console.log('\x1b[0m\x1b[33m===========================================================================\n');
console.log('\x1b[0mThis tool will download all your photos from your Photobox account.');
console.log('Usage instructions at: https://github.com/RobK/photobox-downloader\n\n');
prompt.get([
  {
    properties : {
      domain : {
        description : 'Photobox domain'.green,
        default     : 'www.photobox.ie'
      }
    }
  }, {
    properties : {
      cookie : {
        description : 'Authentication Cookie'.green,
        pattern: /^[a-f0-9]{32}$/,
        message: 'Authentication Cookie must be only numbers, (hex) letters and be exactly 32 characters long',
        required: true
      }
    }
  }, {
    properties : {
      outputPath : {
        description : 'Folder where to save albums'.green,
        default     : 'albums'
      }
    }
  }
], function (err, result) {

  //var photoBox = require('photobox-downloader');
  var photoBox = require('./lib/photobox');
  var config = {
    'baseDomain'      : result.domain,
    'authCookieValue' : result.cookie
  };

  photoBox.login(config, function (err) {
    if (err) {
      console.log('ERROR! Something went wrong logging in, check your authCookieValue!');
      console.log(err);
    } else {
      var outputDir = '';
      if (path.isAbsolute(result.outputPath)) {
        outputDir = result.outputPath;
      } else {
        outputDir = path.join(process.cwd(), result.outputPath);
      }
      console.log('Logged into Photobox!');
      console.log('Starting to download all albums and photos to:\x1b[37m\x1b[1m', outputDir, '\x1b[0m');
      photoBox.downloadAll(
        {
          showProgress : true,
          outputDir    : outputDir
        },
        function (err) {
          if (err) {
            console.error(photoBox.getDebugLog());
            console.log(err);
          } else {
            if (program.debug) {
              console.log("\n\n\n", photoBox.getDebugLog(), "\n\n\n");
            }
            console.log('Finished, all photos have been downloaded (that was easy!)');
          }
        }
      );
    }
  });
});
