/**
 * Created by Robert on 02/05/2014.
 */

var config = require('./config');
var photoBox = require('./photobox.js');

//console.log(photoBox);


photoBox.login(config, function (err, result) {
  if (err) {
    console.log('ERROR! Something went wrong logging in!');
    console.log(err);
  } else {
    console.log(photoBox.getAlbumList());
  }

});