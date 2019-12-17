const path = require('path');
const j = require('jscodeshift');
const through = require('through2');
const conf = require('../../package.json');
const { name, version } = { ...conf };

function transform(file, channel) {
  const filePath = file.path; // 文件路径
  const contents = file.contents.toString('utf8');
  const source = j(contents);
  const importDeclarations = source.find(j.ImportDefaultSpecifier);
  let runtimeDeclared = false; // 是否已经声明了runtime
  let r = source; // jscodeshift最终的返回结果

  const createImportRegenerator = () => {
    return j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('regeneratorRuntime'))],
      j.literal('babyfs-wxapp-runningtime')
    );
  };

  const createVariableRegenerator = (key, value) => {
    return j.variableDeclaration('const', [j.variableDeclarator(j.identifier('proConf'), j.objectExpression([j.property('init', j.identifier('wxa_name'), j.literal(name)), j.property('init', j.identifier('wxa_version'), j.literal(version))]))]);
  };

  if (importDeclarations.length) {
    importDeclarations.forEach(path => {
      if (path.node.local.name === 'regeneratorRuntime') {
        runtimeDeclared = true;
      }
    });
    if (!runtimeDeclared) {
      r = source
        .find(j.ImportDeclaration)
        .at(0)
        .insertBefore(createImportRegenerator());
    }
  } else {
    const body = source.get().value.program.body;
    body.unshift(createImportRegenerator());
    r = source;
  }

  function addProConf() {
    r.find(j.ImportDeclaration)
      .at(-1)
      .insertAfter(createVariableRegenerator());
  }

  if (/app\.js/.test(filePath)) {
    addProConf();
  }

  return r.toSource({
    quote: 'single'
  });
};

const shift = function (channel) {
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      console.error('ERROR: Streaming not supported');
      return cb();
    }

    // eslint-disable-next-line node/no-deprecated-api
    file.contents = Buffer.from(transform(file, channel));

    this.push(file);
    cb();
  });
};

module.exports = shift;
