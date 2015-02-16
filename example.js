var photoBox = require('photobox-downloader');
var config = {
  // The version/domain of photobox to connect to
  "baseDomain" : "www.photobox.ie",

  // change this value to your own authentication cookie value, look for the cookie called "pbx_www_photobox_XX"
  // (where XX is the suffix for the photobox domain, example: ie, fr, co.uk)
  // See the README.md for more detailed instructions on getting your authentication cookie value.
  "authCookieValue" : "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
          console.log('Finished, all photos have been downloaded (that was easy!)');
        }
      }
    );
  }
});