var photoBox = require('./photobox');
var config = {
  "baseDomain" : "www.photobox.ie",
  "authCookieValue" : "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" // change this value to your own authentication cookie value

};

// Login and download all photos from every album
photoBox.login(config, function (err) {
  if (err) {
    console.log('ERROR! Something went wrong logging in, check your authCookieValue!');
    console.log(err);
  } else {
    console.log('Logged into Photobox!');
    photoBox.downloadAll(
      {
        showProgress : true,
        outputDir    : __dirname + '/out'
      },
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log('Finished, all photos in every album have now been downloaded (that was easy!)');
        }
      }
    );
  }
});