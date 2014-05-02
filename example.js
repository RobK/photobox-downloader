/**
 * Created by Robert on 02/05/2014.
 */

var config = require('./config');
var photoBox = require('./photobox');

//console.log(photoBox);


photoBox.login(config, function (err) {
  if (err) {
    console.log('ERROR! Something went wrong logging in!');
    console.log(err);
  } else {
    console.log('Logged in!!!');
    photoBox.downloadPhoto({
      id: '20259833515',
      outputDir : __dirname + '/out'
    }, function (err) {
      if (err) {
        console.log('ERROR! Something went wrong downloading image!');
        console.log(err);
      } else {
        console.log('Photo has been downloaded to the outputDir');
      }
    });
  }

});