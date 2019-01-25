#!/usr/bin/env node

/**
 * PhotoBox Downloader
 *
 * MIT License (see license file)
 * Copyright 2016 - Robert Kehoe
 */

"use strict";
var prompt = require('prompt');
var path = require('path');
var about = require('./package.json');
var program = require('commander');
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)()
    ],
    level: 'error',
    colorize: true
  });

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
  logger.level = 'debug';
}
console.log('\x1b[37m\x1b[1m', 'PhotoBox Downloader v' + about.version);
console.log(' Copyright 2016 - Robert Kehoe - MIT Licensed');
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
  }, {
    properties : {
      skipExisting : {
        description : 'Skip (don\'t download) existing files'.green,
        type        : 'boolean',
        default     : true
      }
    }
  }, {
    properties : {
      album : {
        description : 'Album name (blank for all)'.green,
        default     : ''
      }
    }
  }
], function (err, result) {

  //var photoBox = require('photobox-downloader');
  var photoBox = require('./lib/photobox')(logger);
  var config = {
    'baseDomain'      : result.domain,
    'authCookieValue' : result.cookie
  };
  var showProgress = (program.debug) ? false : true // disable progress in debug mode

  photoBox.login(config, function (err) {
    if (err) {
      logger.error('ERROR! Something went wrong logging in, check your authCookieValue!');
      logger.error(err);
    } else {
      logger.debug('Successfully logged into photobox!')
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
          showProgress : showProgress,
          outputDir    : outputDir,
          skipExisting : result.skipExisting,
          album        : result.album
        },
        function (err) {
          if (err) {
            logger.error('Error encountered while downloading all the photos!');
            logger.error(err);
          } else {
            console.log('Finished, all photos have been downloaded (that was easy!)');
          }
        }
      );
    }
  });
});
