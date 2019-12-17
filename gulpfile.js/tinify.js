const fs = require('fs');
const md5 = require('md5');
const tinify = require('tinify');
const through = require('through2');

module.exports = function (map, manifestSrc) {
  let keyArr = ['4QqiHTeLmqFBg2JLDJDmXMRCrFO4h4fC', 'WvNbLvu5P9PvcwOtzt5C6MW94eOfncBc', 'SWmjBgHX2ywDDP8qfgVPD8v1p6km5wp1'];
  tinify.key = keyArr[0];
  return through.obj(function (file, encoding, callback) {
    let that = this;
    if (file.isNull()) {
      this.push(file);
      return callback();
    }
    if (file.isStream()) {
      console.error('Streams are not supported!');
      return callback();
    }
    let imageSrc = file.history[0].replace(file.cwd, '');
    let key = md5(imageSrc);
    if (!map[key] || (map[key] && !map[key].imgMd5) || (map[key].imgMd5 && map[key].imgMd5 !== md5(file.contents))) {
      map[key] = {
        imageSrc
      };
      if (file.extname !== '.gif') {
        console.log(`tinifyImg-ADD:${imageSrc}`);
        tinify.fromBuffer(file.contents).toBuffer(function (err, resultData) {
          if (err) {
            console.error(err);
          }
          try {
            file.contents = resultData;
            map[key].imgMd5 = md5(resultData);
            fs.writeFileSync(manifestSrc, JSON.stringify(map));
          } catch (err) {
            console.error(err);
          }
          that.push(file);
          callback();
        });
      } else {
        map[key].imgMd5 = md5(file.contents);
        fs.writeFileSync(manifestSrc, JSON.stringify(map));
        that.push(file);
        callback();
      }
    } else {
      that.push(file);
      callback();
    }
  });
};
