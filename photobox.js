/**
 * Created by Robert on 02/05/2014.
 */

var cheerio = require('cheerio');
var request;
var config;
var html;

module.exports = {
  login : function login(configIn, callback) {
    config = configIn;
    request = require('request');
    var j = request.jar();
    j.setCookie('pbx_' + config.baseDomain.replace('.', '_') + '=' + config.cookieValue, 'http://' + config.baseDomain);
    request = request.defaults({jar : j});

    request('http://localhost/photobox-downloader/mock/albumsList.html', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        html = body;
        callback(null, true);
      } else {
        error(error);
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

  downloadPhoto : function downloadPhotos(photoId, path) {

  }
};