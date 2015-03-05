#!/usr/bin/env node

var prompt = require("prompt");
var path = require("path");

prompt.message = "".green;
prompt.delimiter = ":".green;

prompt.start();

console.log("===================================================================");
console.log(" PhotoBox Downloader  - Copyright 2015 Robert Kehoe - MIT Licensed");
console.log("===================================================================\n");
console.log("This tool will download all your photos from your Photobox account.");
console.log("Usage instructions at: https://github.com/RobK/photobox-downloader\n\n");
prompt.get([
  {
    properties : {
      domain : {
        description : "Photobox domain".green,
        default     : "www.photobox.ie"
      }
    }
  }, {
    properties : {
      cookie : {
        description : "Authentication Cookie".green,
        pattern: /^[a-f0-9]{32,32}$/,
        message: "Authentication Cookie must be only numbers, (hex) letters and be exactly 32 characters long",
        required: true
      }
    }
  }, {
    properties : {
      outputPath : {
        description : "Folder where to save albums".green,
        default     : "albums"
      }
    }
  }
], function (err, result) {

  var photoBox = require('photobox-downloader');
  var config = {
    "baseDomain"      : result.domain,
    "authCookieValue" : result.cookie
  };

  photoBox.login(config, function (err) {
    if (err) {
      console.log('ERROR! Something went wrong logging in, check your authCookieValue!');
      console.log(err);
    } else {
      console.log('Logged into Photobox!');
      console.log('Starting to download all albums and photos');
      photoBox.downloadAll(
        {
          showProgress : true,
          outputDir    : path.join(__dirname, result.outputPath)
        },
        function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log('Finished, all photos have been downloaded (that was easy!)');
          }
        }
      );
    }
  });
});
