const fs = require('fs');
const del = require('del');
const {
  src,
  dest,
  series,
  parallel,
  watch,
  lastRun
} = require('gulp');
const less = require('gulp-less');
const rename = require('gulp-rename');
const eslint = require('gulp-eslint');
const px2rpx = require('gulp-px2rpx');
const filter = require('gulp-filter');

// path
const srcPath = './src/**';
const distPath = './dist/';

// files
const wxmlFiles = [`${srcPath}/*.wxml`, `!${srcPath}/_template/*.wxml`];
const lessFiles = [`${srcPath}/*.less`, `!${srcPath}/_template/*.less`];
const imgFiles = [`${srcPath}/images/*.{png,jpg,gif,ico}`, `${srcPath}/images/**/*.{png,jpg,gif,ico}`];
const jsonFiles = [`${srcPath}/*.json`, `!${srcPath}/_template/*.json`, `!${srcPath}/images/*.json`];
const jsFiles = [`${srcPath}/*.js`, `!${srcPath}/_template/*.js`];
const audioFiles = [`${srcPath}/audio/*.*`];

// config
const manifestSrc = './src/images/manifest.json';
let imageMap = JSON.parse(fs.readFileSync(manifestSrc).toString().trim()) || {};

// 命令行快速创建
const auto = require('./auto.js');
// 图片路径替换
const replaceImgSrc = require('./replace.js').replaceImgSrc;
// 模块路径替换
const replaceModulePath = require('./replace.js').replaceModulePath;
// qiniu
const qiniuCdn = require('./qiniu.js');
// tinifyImg
const tinifyImg = require('./tinify.js');
// install
const install = require('./dependency/install.js');
// shift
const shift = require('./dependency/shift.js');
// dependency
const dependency = require('./dependency').dependency;
// clean
async function clean() {
  await del.sync(`${distPath}/**/*`);
}
// wxml
function wxml() {
  return src(wxmlFiles, { since: lastRun(wxml) })
    .pipe(replaceImgSrc(imageMap))
    .pipe(dest(distPath));
}
// js
const js = async () => {
  return src(jsFiles, { since: lastRun(js) })
    .pipe(shift())
    .pipe(dependency())
    .pipe(replaceModulePath())
    .pipe(replaceImgSrc(imageMap))
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(dest(distPath));
};
// audio
const audio = () => {
  return src(audioFiles, { since: lastRun(audio) })
    .pipe(dest(distPath));
};
// json
const json = () => {
  return src(jsonFiles, { since: lastRun(json) })
    .pipe(dependency())
    .pipe(replaceModulePath())
    .pipe(dest(distPath));
};
// less => wxss
const wxss = () => {
  return src(lessFiles)
    .pipe(replaceImgSrc(imageMap))
    .pipe(less())
    .pipe(px2rpx({
      screenWidth: 375,
      wxappScreenWidth: 750,
      remPrecision: 6
    }))
    .pipe(rename({
      extname: '.wxss'
    }))
    .pipe(dest(distPath));
};
// image
const img = () => {
  return src(imgFiles, { since: lastRun(img) })
    .pipe(tinifyImg(imageMap, manifestSrc))
    .pipe(qiniuCdn(imageMap, manifestSrc))
    .pipe(dest('./src'))
    .pipe(filter(['src/images/tab_bar/*.*', 'src/images/local/*.*']))
    .pipe(dest(distPath));
};

// watcher
function watcher() {
  let watchLessFiles = [...lessFiles];
  watchLessFiles.pop();
  watch(watchLessFiles, wxss);
  watch(jsFiles, js);
  watch(imgFiles, img);
  watch(jsonFiles, json);
  watch(wxmlFiles, wxml);
  watch(audioFiles, audio);
}
// build
const build = series(clean, parallel(install, wxml, js, json, wxss, img, audio));
// dev
const dev = series(build, watcher);
// dedupe
const dedupe = series(clean, parallel(install, js));
// const dedupe = series(install, js);

module.exports = {
  clean,
  wxml,
  wxss,
  img,
  audio,
  js,
  json,
  auto,
  watch,
  build,
  dev,
  default: dev,
  dedupe
};
