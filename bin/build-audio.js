/*global process, require, __dirname, Buffer*/
"use strict"; /* Ignore this JSLint complaint, it's a bit stupid*/
var fs = require('fs'),
    path = require('path'),
    approot = path.dirname(__dirname),
    greatwalks_repo = path.join(path.dirname(approot), "greatwalks"),
    audio_directory = path.join(approot, "misc", "audio"),
    audio_files = fs.readdirSync(audio_directory),
    audio_file,
    audio_path,
    ignore_names = ["Thumbs.db", ".DS_Store"],
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
    i,
    success_blackhole = function(){};

process.stdout.write("Generating Audio (and Fonts, and Phonegap Build)\n");

(function(){
    fs.mkdir(path.join(greatwalks_repo, "audio"), success_blackhole); //probably already exists
    fs.mkdir(path.join(greatwalks_repo, "fonts"), success_blackhole); //probably already exists
}());

(function(){
  for(i = 0; i < audio_files.length; i++){
      audio_file = audio_files[i];
      audio_path = path.join(audio_directory, audio_file);
      if(ignore_names.indexOf(audio_file) !== -1) continue;
      if(!fs.statSync(audio_path).isDirectory()) {
        copyFileSync(audio_path, path.join(greatwalks_repo, "audio/speech-" + audio_file));
      }
  }
  process.stdout.write(" - Copied static audio files\n");
}());

copyFileSync(
  path.join(approot, "misc", "fonts", "copse.woff"),
  path.join(greatwalks_repo, "fonts", "copse.woff")
);
copyFileSync(
  path.join(approot, "misc", "fonts", "copse.ttf"),
  path.join(greatwalks_repo, "fonts", "copse.ttf")
);
process.stdout.write(" - Copied static font files\n");

(function(){
  copyFileSync(
    path.join(approot, "misc", "config.xml"),
    path.join(greatwalks_repo, "config.xml")
  );
}());
process.stdout.write(" - Copied Phonegap Build config.xml file\n");


process.stdout.write("Success\n\n");
