/**
 * Created by Robert on 02/05/2014.
 */

var cheerio = require('cheerio');
var request;
var config;
var html;
var fs = require('fs');

module.exports = {
  login : function login(configIn, callback) {
    var j = request.jar();
    var cookie = 'pbx_www_photobox_ie="' +  config.cookieValue + '";path=/;expires=' +
      new Date("6/1/2014	21:08:38") + ';';
    config = configIn;
    request = require('request');
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

  getPhotos : function getPhotos() {

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
  }
};