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

module.exports = {
  login : function login(configIn, callback) {
    config = configIn;
    request = require('request');
    var cookie = 'pbx_' + config.baseDomain.replace(/\./g, '_') + '=' + config.authCookieValue;
    var j = request.jar();
    j.setCookie(cookie, 'http://' + config.baseDomain);

    request = request.defaults({jar : j});
    request('http://' + config.baseDomain + '/my/albums', function (err, response, body) {
      if (!err && response.statusCode === 200) {
        var $ = cheerio.load(body);
        if ($('#pbx_signout').length !== 0) {
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
    var albums = $('.pbx_myphotobox_thumbnail');

    albums.each(function () {

      albumObjects.push({
        name  : $(this).find('.pbx_object_name').text(),
        link  : $(this).find('.pbx_object_title').attr('href'),
        count : parseInt($($(this).find('span')[1]).text().replace(/\D/g, ""), 10)
      });
    });

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

  downloadPhoto : function downloadPhotos(options, callback) {

    var buildName = function (name) {
      var counter = 1;
      var originalName = name;
      // cope with duplicate file names
      while(fs.existsSync(path.join(options.outputDir,  name + '.jpg'))) {
        name = originalName + '_' + counter;
        counter++;
      }
      return name  + '.jpg';
    };

    request('http://' + config.baseDomain + '/my/photo/full?photo_id=' + options.id,
      function (err, response, body) {
        if (!err && response.statusCode === 200) {
          var $ = cheerio.load(body);
          var baseName = $('img').attr('alt');
          var name = buildName(baseName);
          // Save photo
          request(baseName, callback).pipe(fs.createWriteStream(path.join(options.outputDir, name)));
        } else {
          callback(err);
        }
      }
    );
  },

  downloadPagePhotos : function (options, callback) {
    var self = this;
    var photos = this.getPhotos(options.body);
    var outputDir = path.join(options.outputDir, options.album.name);

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir);
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    async.each(photos, function (photo, callbackFn) {
      self.downloadPhoto({id : photo.id, outputDir : outputDir }, function (err) {
        if (err) {
          callback(err);
        } else {
          if (options.showProgress) {
            albumProgressBar.tick(1, null);
          }
          callbackFn(null, true);
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
    request('http://' + config.baseDomain + album.link, function (err, response, body) {
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
          async.each(
            pageLinks,
            function (link, callbackFn) {
              request('http://' + config.baseDomain + '/my/album' + link, function (err, response, body) {
                if (!err && response.statusCode === 200) {
                  pageRequests.push(body);
                  callbackFn(null);
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
        callback(err);
      } else {
        async.each(
          getAlbumPages,
          function (body, callbackFn) {
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

    async.eachSeries(
      albums,
      function iterator(album, callbackFn) {
        options.album = album;
        self.downloadAlbum({
          album        : album,
          showProgress : options.showProgress,
          outputDir    : options.outputDir
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
};