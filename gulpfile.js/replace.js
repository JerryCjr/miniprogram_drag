const path = require('path');
const replace = require('gulp-replace');
const md5 = require('md5');

// 图片路径替换
module.exports.replaceImgSrc = function (map) {
  // eslint-disable-next-line no-useless-escape
  return replace(/[\w\d-\/\.]+\.(png|gif|jpg|ico)/ig, function (value) {
    let newValue = value;
    if (value.indexOf('/images/') > -1 && value.indexOf('/local/') === -1) {
      let absSrc = `/src${value.substr(value.indexOf('/images/'), value.length)}`;
      let absSrcMd5 = md5(absSrc);
      if (map[absSrcMd5]) {
        newValue = map[absSrcMd5].cdnUrl;
      }
    }
    return newValue;
  });
};

// 模块依赖路径替换
module.exports.replaceModulePath = function () {
  return replace(/@\/.*/ig, function (value) {
    const relative = path.relative(path.dirname(this.file.path), 'src/miniprogram_npm');
    return value.replace(/@/, relative);
  });
};
