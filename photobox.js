/**
 * Created by Robert on 02/05/2014.
 */

var ProgressBar = require('progress');
var albumProgressBar;
var cheerio = require('cheerio');
var async = require('async');
var request;
var config;
var html;
var fs = require('fs');

module.exports = {
  login : function login(configIn, callback) {
    config = configIn;
    request = require('request');
    var cookie = 'pbx_www_photobox_ie="' + config.cookieValue + '";path=/;expires=' +
      new Date("6/1/2014	21:08:38") + ';';
    var j = request.jar();
    j.setCookie(cookie, 'http://' + config.baseDomain);

    request = request.defaults({jar : j});
    request('http://' + config.baseDomain + '/my/albums', function (err, response, body) {
//    request('http://localhost/photobox-downloader/mock/albumsList.html', function (error, response, body) {
      if (!err && response.statusCode == 200) {
        var $ = cheerio.load(body);
        if ($('#pbx_signout').length !== 0) {
          html = body;
          callback(null, true);
        } else {
          callback('Was unable to login with given cookie value!');
        }
      } else {
        callback(err);
      }
    });

  },

  setHtml : function setHtml(htmlIn) {
    html = htmlIn;
  },

  getAlbumList : function getAlbumList() {
    var $ = cheerio.load(html);
    var albumObjects = [];

    var albums = $('.pbx_myphotobox_thumbnail');
    //console.log(albums);
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

    request('http://' + config.baseDomain + '/my/photo/full?photo_id=' + options.id,
      function (err, response, body) {
        if (!err && response.statusCode == 200) {
          var $ = cheerio.load(body);
          var name = $('img').attr('alt');
          if (name.match(/\./) === null) {
            name = name + '.jpg';
          }

          request($('img').attr('src'), callback).pipe(fs.createWriteStream(options.outputDir + '/' + name));

        } else {
          callback(err);
        }
      }
    );
  },

  downloadPagePhotos : function (options, callback) {
    var self = this;
    var photos = this.getPhotos(options.body);
    var outputDir = options.outputDir + '/' + options.album.name;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    async.each(photos, function (photo, callbackFn) {

      self.downloadPhoto({id : photo.id, outputDir : outputDir }, function (err) {
        if (err) {
          callback(err);
        } else {
          if (options.showProgress) {
            albumProgressBar.tick();
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
        callback(null, true)
      }

    });
  },

  getAlbumPages : function (album, callback) {

    var pageRequests = [];
    request('http://' + config.baseDomain + album.link, function (err, response, body) {
      if (!err && response.statusCode == 200) {

        pageRequests.push(body);
        var $ = cheerio.load(body);
        var pageLinks = $('.pbx_paginator_count a');

        if (pageLinks.length !== 0) {
          pageLinks = pageLinks.slice(0, pageLinks.length / 2);
          async.each(
            pageLinks,
            function (link, callbackFn) {
              request('http://' + config.baseDomain + '/my/album' + $(link).attr('href'), function (err, response, body) {
                if (!err && response.statusCode == 200) {
                  pageRequests.push(body);
                  callbackFn(null)
                } else {
                  callback(err);
                }
              });
            },
            function (err) {
              callback(null, pageRequests);
            }
          );
        } else {
          callback(null, pageRequests);
        }
      }
    });
  },

  downloadAlbum : function downloadAlbum(options, callback) {

    var self = this;
    if (options.showProgress) {
      console.log('Processing album:', options.album.name);
      albumProgressBar = new ProgressBar('  [:bar] Downloading :current of :total (:percent)', {
        total      : options.album.count,
        complete   : '*',
        incomplete : ' ',
        width      : 40
      });
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
              callback(null, true, options.album)
            }
          });
      }
    });

  }
};