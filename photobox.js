/**
 * Created by Robert on 02/05/2014.
 */

var ProgressBar = require('progress');
var albumProgressBar;
var cheerio = require('cheerio');
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
    var photos = this.getPhotos(options.body);
    var outputDir = options.outputDir + '/' + options.album.name;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    for (var i = 0; i < photos.length; i++) {
      this.downloadPhoto({id : photos[i].id, outputDir : outputDir }, function (err) {
        if (err) {
          callback(err);
        } else {
          if (options.showProgress) {
            albumProgressBar.tick();
          }
        }
      });
    }
  },

  downloadAlbum : function downloadAlbum(options, callback) {

    var self = this;
    request('http://' + config.baseDomain + options.album.link, function (err, response, body) {
      if (!err && response.statusCode == 200) {

        var $ = cheerio.load(body);
        var pages = $('.pbx_paginator_count a');

        if (options.showProgress) {
          console.log('Processing album:', options.album.name);
          albumProgressBar = new ProgressBar('  [:bar] Downloading :current of :total (:percent)', {
            total: options.album.count,
            complete: '*',
            incomplete: ' ',
            width: 40
          });
        }

        if (pages.length === 0) {
          self.downloadPagePhotos({
            body         : body,
            outputDir    : options.outputDir,
            showProgress : options.showProgress,
            album        : options.album
          }, callback);
        } else {
          console.log('A multi page download!', pages.length);

        }

      } else {
        callback(err);
      }
    });

  }
};