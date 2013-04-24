/*global require __dirname Buffer process console*/
"use strict"; /* Ignore this JSLint complaint, it's a bit stupid*/

var fs = require('fs'),
    path = require('path'),
    approot = path.dirname(__dirname),
    greatwalks_repo = path.join(path.dirname(approot), "greatwalks"),
    less = require(path.join(approot, "bin/lib/less")),
    copyFileSync = function(srcFile, destFile) {
      //via http://procbits.com/2011/11/15/synchronous-file-copy-in-node-js/
      var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
      BUF_LENGTH = 64 * 1024;
      buff = new Buffer(BUF_LENGTH);
      fdr = fs.openSync(srcFile, 'r');
      fdw = fs.openSync(destFile, 'w');
      bytesRead = 1;
      pos = 0;
      while (bytesRead > 0) {
        bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
        fs.writeSync(fdw, buff, 0, bytesRead);
        pos += bytesRead;
      }
      fs.closeSync(fdr);
      return fs.closeSync(fdw);
    },
    render_to_file = function(from_path, to_path) {
        var options = {
            "paths" : [path.dirname(from_path), '.'],
            "filename": path.basename(from_path)
        },
            source_less = fs.readFileSync(from_path).toString(),
            parser;
        try {
            fs.unlinkSync(to_path);
        } catch (e) {
        }
        process.stdout.write(" - rendering " + path.basename(from_path) + "\n");
        parser = new(less.Parser)(options);
        parser.parse(source_less, function(e, tree){
            if(e) {
                console.log(e);
                throw e;
            }
            fs.writeFileSync(to_path, tree.toCSS());
        });
    };

process.stdout.write("Generating CSS\n");

(function(){
    fs.mkdir(path.join(greatwalks_repo, "css")); //probably already exists
    fs.mkdir(path.join(greatwalks_repo, "css/bootstrap-css"));//probably already exists
}());

(function(){
  copyFileSync(path.join(approot, "bin/misc/greatwalks-README.md"), path.join(greatwalks_repo, "README.md")); //Nothing to do with CSS but we want to copy it somewhere
  copyFileSync(path.join(approot, "css/normalize.css"), path.join(greatwalks_repo, "css/normalize.css"));
  process.stdout.write(" - Copying CSS that doesn't need processing\n");
  render_to_file(path.join(approot, "css/bootstrap-css/bootstrap.less"), path.join(greatwalks_repo, "css/bootstrap.css"));
  render_to_file(path.join(approot, "css/bootstrap-css/responsive.less"), path.join(greatwalks_repo, "css/bootstrap-responsive.css"));
  process.stdout.write(" - Generated Bootstrap CSS\n");
  render_to_file(path.join(approot, "css/main.less"), path.join(greatwalks_repo, "css/main.css"));
  process.stdout.write(" - Generated App CSS\n");
}());


process.stdout.write("Success\n\n");