Photobox Downloader
===================

Photobox Downloader is a NodeJS module to make interacting with and downloading of albums/photos easy.
[Photobox](http://www.photobox.ie) is a popular photo printing website, while possible to download each photo
one-by-one, there is no way to download an entire album at once. This module addresses that need.

While the app was developed against www.photobox.ie it should work against any of the other sister sites
(www.photobox.co.uk, www.photobox.fr, www.photobox.de, etc...)

Installation
----

```javascript
npm install photobox-downloader
```


Example Usage
----

```javascript
var photoBox = require('photobox-downloader');
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

```

Screenshot
----

![Screen shot of app in action](https://www.robertkehoe.com/wp-content/uploads/2014/05/photobox-downloader-600x245.png)

API
====

login(options, callback)
---

Attempt to get the contents of the albums page. You need to pass the authentication cookie value and the domain you
wish to interact with.

**How to get authentication cookie value?**

When you log into your account on Photobox, Photobox sets an authentication cookie, if you know how to view cookies,
look for the `pbx_www_photobox_xx` (xx depends on where you are logging into) cookie, otherwise you can just log into
your Photobox account, open the Developer Toolbar (press F12), goto the "Console" tab and paste the following command
into the input area and press enter, it will output your authentication cookie value.

```javascript
document.cookie.split(';').forEach(function(item){if(item.match('pbx_www_photobox')!==null){console.log('Auth cookie:',item.split('=')[1])}});
```

__Arguments__

`options` - An object that must contain 2 key/value pairs:
 - `baseDomain` - photoboxDomain - The domain that you want to interact with. Example: "www.photobox.ie".
 - `authCookieValue` - "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" - The value of the "pbx_www_photobox_xx" cookie.

`callback` - Function that is called once login operation is complete. If unsuccessful, the first parameter will be
not null. If successful, can now performa any additional operations.

__Example__

```javascript
photoBox.login(
  {
    baseDomain      : 'www.photobox.ie',
    authCookieValue : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  },
  function (err) {
    if (err) {
      console.log('ERROR! Something went wrong logging in!');
      console.log(err);
    } else {
      console.log('Logged into Photobox!');
      // Now run any additional command...
    }
  }
);
```

downloadAll(options, callback)
---

Downloads every photo in every album. A folder (with the name of the album) is created, all photos in that album will
be downloaded to that album.

__Arguments__

`options` - An object that must contain 2 key/value pairs:
 - `showProgress` : true/false - Boolean -  Whether to show a status bar of download progress
 - `outputDir` : "/some/folder/path" - String - The path to where you want the photos downloaded to. Each album will be
 downloaded into its own folder

`callback` - Function that is called once all photos have been downloaded (or if an error is thrown)

__Example__

```javascript
photoBox.downloadAll(
  {
    showProgress : true,
    outputDir    : __dirname + '/out'
  },
  function callback (err) {
    if (err) {
      console.log(err);
    } else {
      console.log('Finished, all photos in every album have now been downloaded (that was easy!)');
    }
  }
);
```

getAlbumList()
---

Returns a list of albums (include naming, relative link/path and the number of photos in that album.

__Example__

```javascript
var albums = photoBox.getAlbumList();
```

downloadAlbum(options, callback)
---

Downloads all the photos from one specific album. A folder with the name of the album will be created in the desired
directory and all the photos will be downloaded into that folder.

__Arguments__

`options` - An object that must contain 3 key/value pairs:
 - `album` : albumObject - The album object (including name, link and count) that is to be downloaded
 - `outputDir` : "/some/folder/path" - The path to where you want the photos downloaded to. Each album will be downloaded
 into its own folder
 - `showProgress` : true/false - Show a fancy progress bar to show download progress

`callback` - Function that is called once all photos have been downloaded (or if an error is thrown)

__Example__

```javascript
var albums = photoBox.getAlbumList();

photoBox.downloadAlbum(
  {
    album        : albums[0], // download first album
    outputDir    : __dirname + '/out',
    showProgress : true
  },
  function (err) {
    if (err) {
      console.log('ERROR! Something went wrong downloading album!');
      console.log(err);
    } else {
      console.log('Album has been downloaded to the outputDir');
    }
  }
);

```

downloadPhoto(options, callback)
---

Download a specific photo. If you know the ID of a photo you can download it directly.

__Arguments__

`options` - An object that must contain 2 key/value pairs:
 - `id` : "xxxxxxxx" - The id of the photo to download
 - `outputDir` : "/some/folder/path" - The path to where you want the photo downloaded to.

__Example__

```javascript
photoBox.downloadAlbum(
  {
    id        : "xxxxxxxx", // The id of the photo to download
    outputDir : __dirname + '/out'
  }, function (err) {
    if (err) {
      console.log('ERROR! Something went wrong downloading photo!');
      console.log(err);
    } else {
      console.log('Photo has been downloaded to the outputDir');
    }
  }
);
```


License
----

MIT licensed.

Disclaimer
----
Photobox is trademark of PhotoBox Limited, its use in this project is under fair use. The author is not connected with
Photobox and this project is not an endorsement of them or their services.
