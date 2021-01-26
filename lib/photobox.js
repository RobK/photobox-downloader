/**
 * Main class for handling interactions with Photobox. As there is no API to interact with
 * instead the app parses the HTML of the PhotoBox website to extract the needed info.
 *
 * MIT License (see license file)
 * Copyright 2015 - Robert Kehoe
 */

"use strict";
var ProgressBar = require('progress');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var path = require('path');
var albumProgressBar;
var albumHtml;
var request;
var config;
var winston = require('winston');
var MAX_ATTEPMTS = 3;
var { version } = require('../package.json');
var requestHeaders = { 'User-Agent': 'photobox-downloader/' + version }

module.exports = function (logger){
  logger = logger || console;
  logger.debug = logger.debug || console.log;
  return {
    login : function login(configIn, callback) {
      config = configIn;
      request = require('request');
      var cookie = 'pbx_' + config.baseDomain.replace(/\./g, '_') + '=' + config.authCookieValue;
      var j = request.jar();
      j.setCookie(cookie, 'https://' + config.baseDomain);

      request = request.defaults({jar : j});
      var albumUrl = 'https://' + config.baseDomain + '/my/albums';
      logger.debug('Requesting page to verify login status:', albumUrl, 'with headers:', requestHeaders)
      request({ url: albumUrl, headers: requestHeaders }, function (err, response, body) {
        if (!err && response.statusCode === 200) {
          logger.debug('Login request did not generate HTTP error, checking html now...');
          var $ = cheerio.load(body);
          if ($('#pbx_signout').length !== 0) {
            logger.debug('Login successful!');
            albumHtml = body;
            callback(null, true);
          } else {
            callback('Was unable to login with given cookie value!');
          }
        } else {
          callback(err);
        }
      });
    },

    getAlbumList : function getAlbumList() {
      var $ = cheerio.load(albumHtml);
      var albumObjects = [];
      var albums = $('.pbx_widget_album_dropdown select option');

      var re = /^(.*)\((\d+)\)$/

      albums.each(function () {
        var match = re.exec($(this).text());
        albumObjects.push({
          name  : match[1].replace(/\\|\//, "-"),
          link  : "/my/album?album_id=" + $(this).attr('value'),
          count : parseInt(match[2], 10)
        });
      });
      logger.debug('Extracted following albums:', JSON.stringify(albumObjects));

      return albumObjects;
    },

    getPhotos : function getPhotos(html) {

      var $ = cheerio.load(html);
      var photos = [];

      $('.pbx_thumb_container').each(function () {
        photos.push({
          link : $(this).find('img').attr('onclick').split("'")[1],
          id   : $(this).find('img').attr('onclick').split("'")[1].split('photo_id=')[1]
        });
      });

      return photos;
    },

    downloadPhoto : function downloadPhoto(options, callback) {
      options.attempts = options.attempts || 0;
      var buildName = function (name) {
        if (options.skipExisting === true) {
          return name + '.jpg';
        } else {
          var counter = 1;
          var originalName = name;
          // cope with duplicate file names
          while(true) {
            try {
              fs.accessSync(path.join(options.outputDir,  name + '.jpg'));
              name = originalName + '_' + counter;
              counter++;
            } catch (e) {
              // File does not exist!
              return name  + '.jpg';
            }
          }
        }
      };

      var photoUrl = 'https://' + config.baseDomain + '/my/photo/full?photo_id=' + options.id;
      var self = this;
      request({ url: photoUrl, headers: requestHeaders },
        function (err, response, body) {
          logger.debug('Downloading Photo');
          if (!err && response.statusCode === 200) {
            var $ = cheerio.load(body);
            var baseName = $('img').attr('alt');
            var name = buildName(baseName);
            // Save photo

            var filePath = path.join(options.outputDir, name);
            var exists = false;
            var stats;
            try {
              stats = fs.statSync(filePath);
              exists = true;
            } catch (e) {
              // file does not exist, so ok to write
            }
            logger.debug('  Name:', name);
            logger.debug('  Page Details: ', photoUrl);
            logger.debug('  Download URL: ', $('img').attr('src'))

            if (exists === true && options.skipExisting === true ) {
              logger.debug('  Exists: True (skipping)');
              callback(null, {skipped: true, name: name});
            } else {
              logger.debug('  Saving to: ', filePath);
              try {
                if (options.attempts < MAX_ATTEPMTS) {
                  request({ url: $('img').attr('src'), headers: requestHeaders }, callback).pipe(fs.createWriteStream(filePath));
                } else {
                  callback("Number of photo download attmpts exceeded!");
                }
              } catch (e) {
                options.attempts++;
                logger.debug('  Error while downloading photo (attempt', options.attempts, 'of', MAX_ATTEPMTS, ')');
                logger.debug('  Reported Error: ', e);
                setTimeout(function () {
                  self.downloadPhoto(options, callback)
                }, (2000*(options.attempts * options.attempts)));
              }
            }
          } else {
            logger.error('Error requesting page: ', photoUrl);
            logger.error(err);
            callback(err);
          }
        }
      );
    },

    downloadPagePhotos : function (options, callback) {
      var self = this;
      var photos = this.getPhotos(options.body);
      var outputDir = path.join(options.outputDir, options.album.name.replace(/\\{1,}|\/{1,}/, '_'));

      if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir);
      }
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      async.eachSeries(photos, function (photo, callbackFn) {
        self.downloadPhoto({
            id : photo.id,
            outputDir : outputDir,
            skipExisting : options.skipExisting
          }, function (err, result) {
          if (err) {
            callback(err);
          } else {
            if (result.skipped) {
              if (options.showProgress) {
                albumProgressBar.tick(1, null);
              }
              callbackFn(null, true);
            } else {
              setTimeout(function () {
                if (options.showProgress) {
                  albumProgressBar.tick(1, null);
                }
                callbackFn(null, true);
              }, 1000);
            }
          }
        });

      }, function (err) {

        if (err) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('A file failed to process');
        } else {
          callback(null, true);
        }
      });
    },

    // Get all the albumHtml of all the pages of a album (for later processing)
    getAlbumPages : function (album, callback) {

      var pageRequests = [];
      request({ url: 'https://' + config.baseDomain + album.link, headers: requestHeaders }, function (err, response, body) {
        if (!err && response.statusCode === 200) {

          pageRequests.push(body);
          var $ = cheerio.load(body);
          var pageLink = $('.pbx_paginator_count a').attr('href');
          var pageLinks = [];
          var thumbsPerPage = $('.pbx_thumb_container').length;

          if (album.count > thumbsPerPage) {
            pageLinks.push(pageLink);
            var pageCount = Math.ceil(album.count/thumbsPerPage);
            var link;
            for (var i=3;i<=pageCount;i++) {
              link = pageLink.replace('&page=2&', '&page=' + i + '&');
              pageLinks.push(link);
            }
          }

          if (pageLinks.length !== 0) {
            async.eachSeries(
              pageLinks,
              function (link, callbackFn) {
                request({ url: 'https://' + config.baseDomain + '/my/album' + link, headers: requestHeaders }, function (err, response, body) {
                  if (!err && response.statusCode === 200) {
                    pageRequests.push(body);
                    setTimeout(function () {
                        callbackFn(null);
                    }, 1300)
                  } else {
                    callback(err);
                  }
                });
              },
              function (err) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, pageRequests); // pass back all html pages
                }
              }
            );
          } else {
            callback(null, pageRequests); // only one page
          }
        } else {
          callback(err);
        }
      });
    },

    downloadAlbum : function downloadAlbum(options, callback) {

      var self = this;
      if (options.showProgress) {
        console.log('Processing album:', options.album.name);

        if (options.album.count === 0) {
          console.log('  [Album empty]');
          return callback(null);
        } else {
          albumProgressBar = new ProgressBar('  [:bar] Downloading :current of :total (:percent)', {
            total      : options.album.count,
            complete   : '*',
            incomplete : ' ',
            width      : 40
          });
        }
      }

      // To download album, first get the content of every page in the album,
      // Then download the photos from each page
      this.getAlbumPages(options.album, function (err, getAlbumPages) {
        if (err) {
          logger.error('Error while getting the Album Pages: ', getAlbumPages);
          callback(err);
        } else {
          async.eachSeries(
            getAlbumPages,
            function (body, callbackFn) {
              logger.debug('Extracting photos new album page');
              options.body = body;
              self.downloadPagePhotos(
                options,
                function (err) {
                  if (err) {
                    callback(err);
                  } else {
                    callbackFn();
                  }
                });
            },
            function (err) {
              if (err) {
                logger.error('Error while trying to extract photos from Album Pages: ');
                callback(err);
              } else {
                callback(null, true, options.album);
              }
            }
          );
        }
      });
    },

    downloadAll : function downloadAll(options, callback) {

      var self = this;
      var albums = this.getAlbumList();

      if (options.album != '') {
        albums = albums.filter(function (album) {
          return album.name == options.album;
        });
      }

      async.eachSeries(
        albums,
        function iterator(album, callbackFn) {
          options.album = album;
          self.downloadAlbum({
            album        : album,
            showProgress : options.showProgress,
            outputDir    : options.outputDir,
            skipExisting    : options.skipExisting
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              callbackFn(null, true, options.album);
            }
          });
        },
        function finalCallback(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, true, options.album);
          }
        }
      );
    }
  }
};
