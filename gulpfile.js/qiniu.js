const fs = require('fs');
const qn = require('qn');
const md5 = require('md5');
const through = require('through2');
const qnOptions = {
  accessKey: 'L7lsxYm1ro5oTg4ZZOaQhlE_RERKBLxQR5TE-ObZ',
  secretKey: 'pKN21B4ZfPJ8M6hSN4K42Ulg_suP44-6o-jb11nw',
  bucket: 'static',
  origin: 'https://s0.babyfs.cn',
  uploadURL: 'http://up.qiniu.com/',
  prefix: 'wxapp/sagittarius/'
};

module.exports = function (map, manifestSrc) {
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
    let fileContentMd5 = md5(file.contents);
    if (!map[key] || (map[key] && !map[key].cdnName)) {
      console.log(`qnniuCDN-ADD:${imageSrc}`);
      qn.create(qnOptions).upload(file.contents, {
        key: `${qnOptions.prefix}${fileContentMd5}${file.extname}`
      }, function (err, result) {
        if (err) {
          console.error(err);
        }
        map[key]['cdnName'] = result.key;
        map[key]['cdnUrl'] = result.url;
        map[key]['cdnHash'] = result.hash;
        fs.writeFileSync(manifestSrc, JSON.stringify(map));
        that.push(file);
        callback();
      });
    } else {
      that.push(file);
      callback();
    }
  });
};
