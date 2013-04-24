/*global process require __dirname Buffer console */
"use strict"; /* Ignore this JSLint complaint, it's a bit stupid*/

var fs = require('fs'),
    path = require('path'),
    child_process = require('child_process'),
    approot = path.dirname(__dirname),
    greatwalks_phonegap_repo = path.join(path.dirname(approot), "greatwalks-android"),
    greatwalks_phonegap_ios_repo = path.join(path.dirname(approot), "greatwalks-ios"),
    greatwalks_repo = path.join(path.dirname(approot), "greatwalks"),
    walks_directory = path.join(approot, "walks"),
    walks_paths = fs.readdirSync(walks_directory),
    scale_by = 1, // the build-html.js has a scale_by=0.5 but this has scale_by=1.
                  // The reason for the difference is that build-html.js will display the images at 0.5
                  // but we still want the source images to be large for high DPI displays (e.g. 'retina display')
    ignore_names = ["Thumbs.db", ".DS_Store"],
    reserved_image_names = ["map.png"], //PNG images from each Walks directory are copied over as-is except for these ones...
    resize_quality = 60,
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
    debug_exec_response = function(error, stdout, stderr){
        if(error) {
            console.log(error);
            console.log(stdout);
            console.log(stderr);
            process.exit();
        }
    };

String.prototype.endsWith = function(suffix) {
    return this.substr(this.length - suffix.length) === suffix;
};

String.prototype.toNormalizedFilename = function(){
    return this.toLowerCase().replace(/[,\(\)]/g, "").replace(/ /g, "-").replace(/[^a-z\-0-9\.]/g, "");
};

process.stdout.write("Generating Images\n");

(function(){
    process.stdout.write("Generating inside " + greatwalks_repo + "\n");
    fs.mkdir(path.join(greatwalks_repo, "img"), '0777'); //probably already exists
    fs.mkdir(path.join(greatwalks_repo, "img/walks"), '0777');//probably already exists
}());

(function(){
    var icons,
        i,
        icon,
        icon_sanitised_name,
        images,
        image,
        image_sanitised_name,
        image_path;
    process.stdout.write(" - Copying images");
    images = fs.readdirSync(path.join(approot, "images"));
    for(i = 0; i < images.length; i++){
        image = images[i];
        image_sanitised_name = image.toLowerCase().replace(/ /g, "-");
        image_path = path.join(approot, "images", image);
        if(ignore_names.indexOf(image) !== -1) continue;
        if(!fs.statSync(image_path).isDirectory()) {
            copyFileSync(image_path, path.join(greatwalks_repo, "img", image_sanitised_name));
        }
    }
    icons = fs.readdirSync(path.join(approot, "images/map-icons"));
    for(i = 0; i < icons.length; i++){
        icon = icons[i];
        icon_sanitised_name = icon.toLowerCase().replace(/ /g, "-");
        if(ignore_names.indexOf(icon) !== -1) continue;
        copyFileSync(path.join(approot, "images/map-icons", icon), path.join(greatwalks_repo, "img/icon-map-" + icon_sanitised_name));
    }
    icons = fs.readdirSync(path.join(approot, "images/content-icons"));
    for(i = 0; i < icons.length; i++){
        icon = icons[i];
        icon_sanitised_name = icon.toLowerCase().replace(/ /g, "-");
        if(ignore_names.indexOf(icon) !== -1) continue;
        copyFileSync(path.join(approot, "images/content-icons", icon), path.join(greatwalks_repo, "img/icon-content-" + icon_sanitised_name));
    }
    process.stdout.write("...complete.\n");
}());

(function () {
    var svg_source;
    
    svg_source = path.join(approot, "images/great-walks-icon.svg");

    process.stdout.write(" - Generating Phonegap Android icons");
    if(fs.existsSync(greatwalks_phonegap_repo) && fs.statSync(greatwalks_phonegap_repo).isDirectory()) {
        // android icons
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_repo, "res/drawable-hdpi/ic_launcher.png") + " --export-width=72");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_repo, "res/drawable-ldpi/ic_launcher.png") + " --export-width=36");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_repo, "drawable-mdpi/ic_launcher.png") + " --export-width=48");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_repo, "drawable-xhdpi/ic_launcher.png") + " --export-width=96");
        process.stdout.write("...complete.\n");
    } else {
        process.stdout.write("\n   - WARNING bypassed because there's no " + path.basename(greatwalks_phonegap_repo) + " directory.\n");
    }

    // iOS icon and launcher files as per http://developer.apple.com/library/ios/#documentation/userexperience/conceptual/mobilehig/IconsImages/IconsImages.html#//apple_ref/doc/uid/TP40006556-CH14-SW1
    process.stdout.write(" - Generating Phonegap iOS icons and launcher images");
    if(fs.existsSync(greatwalks_phonegap_ios_repo) && fs.statSync(greatwalks_phonegap_ios_repo).isDirectory()) {
        // icons
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/iTunesArtwork") + " --export-width=512");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon.png") + " --export-width=57");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon@2x.png") + " --export-width=114");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon-72.png") + " --export-width=72");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon-72@2x.png") + " --export-width=144");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon-small.png") + " --export-width=29");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon-small@2x.png") + " --export-width=58");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/icons/icon-small-50.png") + " --export-width=50");

        // launcher images
        // step 1: create from svg
        svg_source = path.join(approot, "images/great-walks-logo.svg");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default~iphone.png") + " --export-width=320");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default@2x~iphone.png") + " --export-width=640");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Landscape~ipad.png") + " --export-width=1024");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Landscape@2x~ipad.png") + " --export-width=2048");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Portrait~ipad.png") + " --export-width=768");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Portrait@2x~ipad.png") + " --export-width=1536");
        execSync("inkscape \"" + svg_source + "\" -z --export-png=" + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-568h@2x~iphone.png") + " --export-width=640");

        // step 2: mogrify correct dimensions and background colour
        execSync("mogrify -background \"#356359\" -gravity center -extent 320x480 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default~iphone.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 640x960 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default@2x~iphone.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 1024x748 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Landscape~ipad.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 2048x1496 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Landscape@2x~ipad.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 768x1004 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Portrait~ipad.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 1536x2008 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-Portrait@2x~ipad.png"));
        execSync("mogrify -background \"#356359\" -gravity center -extent 640x1136 " + path.join(greatwalks_phonegap_ios_repo, "GreatWalksiOS/Resources/splash/Default-568h@2x~iphone.png"));

        process.stdout.write("...complete.\n");
    } else {
        process.stdout.write("\n   - WARNING bypassed because there's no " + path.basename(greatwalks_phonegap_ios_repo) + " directory.\n");
    }

    process.stdout.write(" - Generating logos");
    svg_source = path.join(approot, "images/great-walks-logo.svg");
    execSync("inkscape \"" + svg_source + "\" -z --export-png=\"" + path.join(greatwalks_repo, "img/logo-x150.png") + "\" --export-width=150");
    execSync("inkscape \"" + svg_source + "\" -z --export-png=\"" + path.join(greatwalks_repo, "img/logo-x225.png") + "\" --export-width=225");
    execSync("inkscape \"" + svg_source + "\" -z --export-png=\"" + path.join(greatwalks_repo, "img/logo-x300.png") + "\" --export-width=300");
    execSync("inkscape \"" + svg_source + "\" -z --export-png=\"" + path.join(greatwalks_repo, "img/logo-x600.png") + "\" --export-width=600");
    execSync("inkscape \"" + svg_source + "\" -z --export-png=\"" + path.join(greatwalks_repo, "img/logo-x1200.png") + "\" --export-width=1200");
    process.stdout.write("...complete.\n");
}());

(function(){
    var carousel_images_path = path.join(approot, "images/homepage-carousel"),
        carousel_images = fs.readdirSync(carousel_images_path),
        carousel_image,
        carousel_image_path,
        carousel_destination_path,
        i,
        resize_command,
        dimensions = [1024], //Previously we also exported images at 2048 but it added 30mb to the package
        y,
        dimension,
        sanitised_name;
    process.stdout.write(" - Generating homepage carousel:\n");
    for(i = 0; i < carousel_images.length; i++) {
        carousel_image = carousel_images[i];
        if(ignore_names.indexOf(carousel_image) !== -1) continue;
        sanitised_name = carousel_image.toLowerCase().replace(/ /g, "-");
        carousel_image_path = path.join(approot, "images/homepage-carousel", carousel_image);
        for(y = 0; y < dimensions.length; y++) {
            dimension = dimensions[y];
            carousel_destination_path = path.join(greatwalks_repo, "img/homepage-carousel-x" + dimension + "-" + sanitised_name);
            resize_command = "convert \"" + carousel_image_path + "\" -resize " + dimension + "x -quality " + resize_quality + " \"" + carousel_destination_path + "\"";
            //child_process.exec(resize_command, debug_response); //enable for easier debug although it will run exec asynchronously and fork a lot of processes so don't leave it enabled
            execSync(resize_command);
        }
        process.stdout.write("   - " + carousel_image + "\n");
    }
}());

(function(){
    process.stdout.write(" - Generating maps\n");
    for(var i = 0; i < walks_paths.length; i++){
        var walk_name = walks_paths[i],
            walk_sanitised_name = walk_name.toLowerCase().replace(/ /g, "-"),
            walk_fullpath = path.join(walks_directory, walk_name),
            map_path = path.join(approot, "walks", walk_name, "map.png"),
            national_path = path.join(approot, "walks", walk_name, "national.gif"),
            national_destination_path = path.join(greatwalks_repo, "img/walks", walk_sanitised_name, "national.gif"),
            elevation_profile_path = path.join(approot, "walks", walk_name, "profile.jpg"),
            elevation_profile_destination_path = path.join(greatwalks_repo, "img/walks", walk_sanitised_name, "profile.jpg"),
            width = 0,
            height = 0,
            command = "identify -format {\\\"width\\\":%w,\\\"height\\\":%h} \"" + map_path + "\"",
            map_dimensions_json_string,
            map_dimensions_json,
            resize_command,
            dont_miss_directory = path.join(walk_fullpath, "Don't miss"),
            dont_miss_files,
            dont_miss_file,
            dont_miss_path,
            carousel_directory = path.join(walk_fullpath, "Carousel"),
            carousel_files,
            carousel_file,
            carousel_source_path,
            carousel_destination_path,
            y,
            image_files,
            image_file,
            image_file_path,
            image_destination_path;
        if(fs.statSync(walk_fullpath).isDirectory()) {
            fs.mkdir(path.join(greatwalks_repo, "img/walks", walk_sanitised_name)); //probably already exists
            process.stdout.write("   - Generating " + walk_name + " map ");
            map_dimensions_json_string = execSync(command);
            if(map_dimensions_json_string.toString().indexOf("{\"width") >= 0) {
                map_dimensions_json = JSON.parse(map_dimensions_json_string);
                process.stdout.write("(source parsed ");
                width = parseInt(map_dimensions_json.width * scale_by, 10);
                height = parseInt(map_dimensions_json.height * scale_by, 10);
                resize_command = "convert \"" + map_path + "\" -resize " + width + "x" + height + " -quality " + resize_quality + " \"" + path.join(greatwalks_repo, "img/walks", walk_sanitised_name, "map.jpg") + "\"";
                execSync(resize_command);
                process.stdout.write("and resized)");
            } else {
                process.stdout.write("ERROR parsing image dimensions. Command I tried to run was \n" + command + "\nIs ImageMagick installed?\n");
            }
            copyFileSync(national_path, national_destination_path);
            resize_command = "convert \"" + elevation_profile_path + "\" -resize x300 -quality " + resize_quality + " \"" + elevation_profile_destination_path + "\"";
            execSync(resize_command);
            image_files = fs.readdirSync(walk_fullpath);
            for(y = 0; y < image_files.length; y++){
                image_file = image_files[y];
                image_file_path = path.join(walk_fullpath, image_file);
                if(image_file.endsWith(".png")){
                    if(reserved_image_names.indexOf(image_file) === -1){
                        image_destination_path = path.join(greatwalks_repo, "img/walks", walk_sanitised_name, image_file);
                        copyFileSync(image_file_path, image_destination_path);
                        //console.log(" - " + image_destination_path + "\n");
                    }
                } else {
                    //console.log("Not a PNG: " + image_file + "\n");
                }
            }

            if(fs.statSync(dont_miss_directory).isDirectory()) {
                dont_miss_files = fs.readdirSync(dont_miss_directory);
                for(y = 0; y < dont_miss_files.length; y++){
                    dont_miss_file = dont_miss_files[y];
                    if(ignore_names.indexOf(dont_miss_file) !== -1) continue;
                    dont_miss_path = path.join(dont_miss_directory, dont_miss_file);
                    if((!fs.statSync(dont_miss_path).isDirectory())){
                        copyFileSync(
                            dont_miss_path,
                            path.join(greatwalks_repo, "img/walks", walk_sanitised_name, "dont-miss-" + dont_miss_file)
                        );
                    }
                }
            }

            if(fs.statSync(carousel_directory).isDirectory()) {
                carousel_files = fs.readdirSync(carousel_directory);
                for(y = 0; y < carousel_files.length; y++){
                    carousel_file = carousel_files[y];
                    if(ignore_names.indexOf(carousel_file) !== -1) continue;
                    if(!carousel_file.toLowerCase().endsWith(".jpg") && !carousel_file.toLowerCase().endsWith(".jpeg") && !carousel_file.toLowerCase().endsWith(".gif") && !carousel_file.toLowerCase().endsWith(".png")) continue;
                    carousel_source_path = path.join(carousel_directory, carousel_file);
                    if((!fs.statSync(carousel_source_path).isDirectory())){
                        carousel_destination_path = path.join(greatwalks_repo, "img/walks", walk_sanitised_name, "carousel-" + carousel_file.toNormalizedFilename());
                        resize_command = "convert \"" + carousel_source_path + "\" -resize x768 -quality " + resize_quality + " \"" + carousel_destination_path + "\"";
                        //console.log(resize_command + "\n") ;
                        execSync(resize_command);
                    }
                }
            }


            process.stdout.write(".\n");
        } else {
            //process.stdout.write("Not a directory " + walk_fullpath + "\n");
        }
    }
}());

function execSync(cmd) {
    // nodeJS doesn't have a synchronous exec e.g. execSync()
    // full credit (and blame!) for this function goes to
    // http://stackoverflow.com/questions/4443597/node-js-execute-system-command-synchronously/9051718#9051718

    var exec = child_process.exec;
    var fs = require('fs');
    //execute your command followed by a simple echo
    //to file to indicate process is finished
    if (process.platform === 'win32') {
        exec(cmd + " > stdout.txt && echo done > sync.txt");
    } else {
        exec(cmd + " > stdout.txt; echo done > sync.txt");
    }
    while (true) {
        //consider a timeout option to prevent infinite loop
        //NOTE: this will max out your cpu too!
        try {
            var status = fs.readFileSync('sync.txt', 'utf8');
            if (status.trim() == "done") {
                var res = fs.readFileSync("stdout.txt", 'utf8');
                fs.unlinkSync("stdout.txt"); //cleanup temp files
                fs.unlinkSync("sync.txt");
                return res;
            }
        } catch(e) { } //readFileSync will fail until file exists
    }
}

process.stdout.write("Success.\n\n");
