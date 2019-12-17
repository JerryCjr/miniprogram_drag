const gulp = require('gulp');
const path = require('path');
const rename = require('gulp-rename');

/**
 * auto 自动创建page or template or component
 *  -s 源目录（默认为_template)
 * @example
 *   gulp auto -p mypage           创建名称为mypage的page文件
 *   gulp auto -t mytpl            创建名称为mytpl的template文件
 *   gulp auto -c mycomponent      创建名称为mycomponent的component文件
 *   gulp auto -s index -p mypage  创建名称为mypage的page文件
 */

const auto = done => {
  const yargs = require('yargs')
    .example('gulp auto -p mypage', '创建名为mypage的page文件')
    .example('gulp auto -t mytpl', '创建名为mytpl的template文件')
    .example('gulp auto -c mycomponent', '创建名为mycomponent的component文件')
    .example('gulp auto -s index -p mypage', '复制pages/index中的文件创建名称为mypage的页面')
    .option({
      s: {
        alias: 'src',
        default: '_template',
        describe: 'copy的模板',
        type: 'string'
      },
      p: {
        alias: 'page',
        describe: '生成的page名称',
        conflicts: ['t', 'c'],
        type: 'string'
      },
      t: {
        alias: 'template',
        describe: '生成的template名称',
        type: 'string',
        conflicts: ['c']
      },
      c: {
        alias: 'component',
        describe: '生成的component名称',
        type: 'string'
      },
      version: {
        hidden: true
      },
      help: {
        hidden: true
      }
    })
    .fail(msg => {
      done();
      console.error('创建失败!!!');
      console.error(msg);
      console.error('请按照如下命令执行...');
      yargs.parse(['--msg']);
      return false;
    })
    .help('msg');

  const argv = yargs.argv;
  const source = argv.s;
  const typeEnum = {
    p: 'pages',
    t: 'templates',
    c: 'components'
  };
  let hasParams = false;
  let name, type;
  for (let key in typeEnum) {
    hasParams = hasParams || !!argv[key];
    if (argv[key]) {
      name = argv[key];
      type = typeEnum[key];
    }
  }
  if (!hasParams) {
    done();
    yargs.parse(['--msg']);
  }

  const src = path.relative(__dirname, 'src');
  const root = path.resolve(__dirname, src, type);

  return gulp
    .src(path.join(root, source, '*.*'))
    .pipe(
      rename({
        dirname: name,
        basename: name
      })
    )
    .pipe(gulp.dest(path.join(root)));
};

module.exports = auto;
