/*global require process __dirname console*/
/*
 *  Builds HTML for the site.
 *
 *  Generally it uses synchronous calls to make it easier to debug (avoiding lots of nested callbacks)
 *  and because speed isn't currently a concern.
 *
 */
"use strict"; /* Ignore this JSLint complaint, it's a bit stupid*/

var fs = require('fs'),
    path = require('path'),
    approot = path.dirname(__dirname),
    mustache = require(path.join(approot, "bin/lib/mustache.js")),
    greatwalks_repo = path.join(path.dirname(approot), "greatwalks"),
    scale_by = 0.5, // the build-images.js has a scale_by=1 but this has scale_by=0.5.
                    // The reason for the difference is that build-images.js should render images at full resolution
                    // but the html should display these at half-size for high DPI displays (e.g. 'retina display')
    template = fs.readFileSync(path.join(approot, "html/template.html"), 'utf8').toString(),
    htmlf_paths = fs.readdirSync(path.join(approot, "html")),
    default_include_directory = path.join(path.resolve("html"), "includes"),
    walks_paths = fs.readdirSync(path.join(approot, "walks")),
    ignore_names = ["Thumbs.db", ".DS_Store"],
    walks_template_path = path.join(approot, "walks/template.mustache"),
    out_of_bounds_path = path.join(approot, "walks/out-of-bounds.log"),
    some_locations_were_out_of_bounds = false,
    too_close_locations_path = path.join(approot, "walks/too-close-locations.log"),
    some_locations_were_too_close = false,
    great_walks = {"walks":[]},
    PIx = 3.141592653589793,
    degrees_to_radians = function(degrees) {
        return degrees * PIx / 180;
    },
    kilometres_to_miles = 0.621371,
    metres_to_feet = 3.28084,
    kilograms_to_pounds = 2.20462,
    one_hour_in_milliseconds = 60 * 60 * 1000,
    points_of_interest = {},
    maori_speech = {},
    mustache_data = {maps_details:{}},
    process_pages = [];

String.prototype.removeNonStandardCharacters = function(){
    var current_string = this;
    // note: you might think that it would be easier to match the invalid characters themselves
    // but I can't seem to when Node.js is running on Windows.
    // Not sure why (loading file as Windows-1252 or something I'd guess but parsing as Windows-1252 doesn't
    // fix it, and hence the following code...
    return this.replace(/([^a-zA-Z.,'":<>_\@\s0-9&\-()!\/\?*])/g, function(match, contents, offset, s){
        var line_number = current_string.substr(0, offset).split("\n").length;
        throw "At offset " + offset + " (approx line #" + line_number + ") found a non-standard character (unicode:" + current_string.charCodeAt(offset) + "): " + match.toString() + "\nSurrounding text: " + current_string.substr(offset - 10, 20) + " \nThis is probably a problem with MS SmartQuotes or emdash/endashes in your CSV file so replace them with conventional ASCII or UTF-8 characters.";
    });
};

String.prototype.CSV = function(overrideStrDelimiter) {
    // Normally I wouldn't extend a prototype in JavaScript
    // but in a short-lived build script it's relatively harmless
    //
    // This CSV parser was taken from
    //   http://stackoverflow.com/questions/1293147/javascript-code-to-parse-csv-data
    // It's a bit shit. It can't deal with zero-length fields ",," it needs ", ,"
    // If you find a CSV problem it's probably in here...
     var strDelimiter = (overrideStrDelimiter || ","),
        objPattern = new RegExp(
             (
             "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
             "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
             "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
             var arrData = [
                 []
             ],
        strMatchedDelimiter,
        strMatchedValue,
        csv_string = this.replace(/,,/g, ", ,").removeNonStandardCharacters(),
        arrMatches = null;

     while (arrMatches = objPattern.exec(csv_string)) { /*JSLINT IGNORE*/
         strMatchedDelimiter = arrMatches[1];
         if(strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
             arrData.push([]);
         }
         if (arrMatches[2]) {
             strMatchedValue = arrMatches[2].replace(
             new RegExp("\"\"", "g"), "\"");
         } else {
             strMatchedValue = arrMatches[3];
         }
         if(strMatchedValue.length !== 0){
            arrData[arrData.length - 1].push(strMatchedValue);
         } else {
         }
     }
     if(arrData[arrData.length - 1].length === 0 ) {
        arrData[arrData.length - 1].pop();
     }
     return (arrData);
};

String.prototype.CSVMap = function(strDelimiter) {
    /* Normally I wouldn't extend a prototype but
       in a short-lived build script it's relatively harmless */
    // assumes that first line contains the keys
    var csv_array = this.CSV(strDelimiter),
        first_row = csv_array[0],
        keyed_map = [],
        keyed_row,
        row;
    for(var i = 1; i < csv_array.length; i++){ //start from row 1 not 0
        row = csv_array[i];
        keyed_row = {};
        for(var x = 0; x < row.length; x++){
            keyed_row[first_row[x]] = row[x];
        }
        keyed_map.push(keyed_row);
    }
    return keyed_map;
};

String.prototype.endsWith = function(suffix) {
    /* Normally I wouldn't extend a prototype but
       in a short lived build script it's relatively harmless */
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.toId = function() {
    // Sanitises an arbitrary string into an valid id (for the purposes of HTML id or CSS class)
    /* Normally I wouldn't extend a prototype but
       in a short lived build script it's relatively harmless */
    return this.toLowerCase().replace(/['.,\(\)]/g, "").replace(/ /g, "-");
};

String.prototype.toNormalizedFilename = function(){
    return this.toLowerCase().replace(/[,\(\)]/g, "").replace(/ /g, "-").replace(/[^a-z\-0-9\.]/g, "");
};

String.prototype.toCased = function() {
    var concatenated = "",
        parts = this.split("-"),
        part,
        i;
    /* Normally I wouldn't extend a prototype but
       in a short lived build script it's relatively harmless */
    for(i = 0; i < parts.length; i++){
        part = parts[i];
        if(i === 0) {
            concatenated += part.substr(0, 1).toUpperCase() + part.substr(1) + " ";
        } else {
            concatenated += part + " ";
        }
    }
    return concatenated.trim();
};

function clone(obj){
    return JSON.parse(JSON.stringify(obj)); // slow but simple/reliable
}

function get_image_dimensions(path) {
    var dimensions_command = "identify -format {\\\"width\\\":%w,\\\"height\\\":%h} \"" + path + "\"",
        json_string;
    //process.stdout.write("\n" + dimensions_command + "\n");
    json_string = execSync(dimensions_command);
    if(json_string.indexOf("{\"width") >= 0) {
        return JSON.parse(json_string);
    }
    return {"width":undefined,"height":undefined};
}

function resolve_includes(html, using_includes_directory, from_page){
    var special_includes = ["don't-miss.mustache", "offers.mustache", "before-you-go.mustache", "getting-there.mustache", "where-to-stay.mustache", "on-the-track.mustache"];
    if(using_includes_directory === undefined) {
        using_includes_directory = default_include_directory;
    }

    return html.replace(/<\!--#include(.*?)-->/g,
        function(match, contents, offset, s){
            var include_filename = contents.substr(contents.indexOf("=\"")+2),
                include_path,
                data,
                basename;
            include_filename = include_filename.substr(0, include_filename.indexOf("\""));
            include_path = path.join(using_includes_directory, include_filename);
            //process.stdout.write(" -- including : " + include_path + "\n");
            data = fs.readFileSync(include_path, 'utf8').toString();
            if(special_includes.indexOf(include_filename) !== -1) {
                basename = path.basename(include_filename, ".mustache");
                data = '<!-- included from build-html.js. Just search for this string --><h2 class="walk-detail-header ' + basename.toId() + '"><a href="#expand-walk-detail"><span>' + basename.toCased() + '</span></a></h2><div class="walk-detail ' + basename.toId() + '">' + data + "</div>";
            }
            data = insert_audio(data, from_page);
            return data;
        });
}

function insert_audio(htmlf, page_id){
    var maori_speech_id,
        replace_with_audio = function(match, maori_word, following_character, offset, s){
            var is_a_text_node = (htmlf.lastIndexOf("<", offset) < htmlf.lastIndexOf(">", offset)),
                maori_speech_item = maori_speech[maori_word.toString().toLowerCase()];
            if(maori_speech_item === undefined) {
                throw "Problem accessing Maori speech item of '" + maori_word + "'";
            }
            if(!is_a_text_node || maori_speech_item.used_in_pages.indexOf(page_id) !== -1) {
                return maori_word + following_character;
            }
            maori_speech_item.used_in_any_page = true;
            maori_speech_item.used_in_pages.push(page_id); //ensure that each audio link is only used once per page id.
            //console.log(maori_speech_id + " " + page_id + "\n");
            return '<a href="#' + maori_word + '" data-audio="audio/speech-' + maori_speech_item.file + '" class="audio">' + maori_word + "</a>" + following_character;
        };
    for(maori_speech_id in maori_speech){
        htmlf = htmlf.replace(
            new RegExp("(" + maori_speech_id + ")([ \\.,])", "gi"), //ensure that maori speech id of "awa" (river) doesn't match "aware" by checking for following space, fullstop, or comma.
            replace_with_audio
        );
    }
    return htmlf;
}

function difference_between_positions_in_kilometers(lat1, lon1, lat2, lon2){
    var R = 6371; // adverage radius of the earth in km
    var dLat = degrees_to_radians(lat2-lat1);  // Javascript functions in radians
    var dLon = degrees_to_radians(lon2-lon1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(degrees_to_radians(lat1)) * Math.cos(degrees_to_radians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

function check_for_nearby_locations(location){
    var warning_message = "",
        i,
        walk_points_of_interest,
        point_of_interest,
        within_kilometers = 0.1,
        distance_between_points;

    if(points_of_interest[location.WalkName] === undefined) {
        points_of_interest[location.WalkName] = [];
    }
    walk_points_of_interest = points_of_interest[location.WalkName];
    for(i = 0; i < walk_points_of_interest.length; i++){
        point_of_interest = walk_points_of_interest[i];
        distance_between_points = difference_between_positions_in_kilometers(location.Lat, location.Long, point_of_interest.Lat, point_of_interest.Long);
        if(distance_between_points < within_kilometers) {
            warning_message += " - WARNING " + location.Name + " (" + location.WalkName + ") is " + (Math.round(distance_between_points * 100) / 100) + "km away from " + point_of_interest.Name + "\n";
        }
    }
    points_of_interest[location.WalkName].push(location);
    return warning_message;
}

var share_social_details = {
    "default":
        {
        "social_text": "I'm going on a Great Walk in New Zealand",
        "facebook_url": "http://greatwalks.co.nz/",
        "facebook_image": "http://www.greatwalks.co.nz/sites/all/themes/sparks_responsive/logo.png",
        "twitter_url": "http://bit.ly/SLFPlX"
        },
    "abel-tasman-coast-track":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the ABEL TASMEN COAST TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/PBKyah"
        },
    "heaphy-track":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the HEAPHY TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/REibYQ"
        },
    "kepler-track":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the KEPLER TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/VRNca2"
        },
    "lake-waikaremoana":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the WAIKAREMOANA TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/PBKBTA"
        },
    "milford-track":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the MILFORD TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/SYbOOu"
        },
    "rakiura-track---stewart-island":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the RAKIURA TRACK ON STEWART ISLAND",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/XhJHyJ"
        },
    "routeburn-track":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the ROUTEBURN TRACK",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/UhPxQ8"
        },
    "tongariro-northern-circuit":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the TONGARIRO NORTHERN CIRCUIT",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/YUBHSI"
        },
    "whanganui-journey":
        {
        "social_text": "I'm going on a Great Walk in New Zealand, the WHANGANUI JOURNEY",
        "facebook_url": "https://www.facebook.com/GreatWalks",
        "twitter_url": "http://bit.ly/Rf9sL6"
        }
};


/*
 *  BEGIN BUILDING HTML
 */

process.stdout.write("Generating HTML\n");

(function(){
    var files = fs.readdirSync(path.join(approot, "misc", "audio")),
        file,
        speech_id,
        i;
    for(i = 0; i < files.length; i++){
        file = files[i];
        speech_id = path.basename(file, ".mp3").replace(/_/g, " ");
        maori_speech[speech_id] = {"file": file, "used_in_any_page": false, "used_in_pages":[]};
    }
}());



(function(){
    //  Delete log of out of bounds
    try {
        fs.unlinkSync(out_of_bounds_path);
    } catch (exception) {
    }
    fs.writeFileSync(out_of_bounds_path, "");
    try {
        fs.unlinkSync(too_close_locations_path);
    } catch (exception) {
    }
    fs.writeFileSync(too_close_locations_path, "");
    walks_paths = fs.readdirSync(path.join(approot, "walks"));
}());

(function(){
    var nz_map_path = path.join(approot, "images", "new-zealand-map.png"),
        nz_map_dimensions = get_image_dimensions(nz_map_path),
        visitor_centers_path = path.join(approot, "misc", "VisitorCentres.csv"),
        visitor_centres_original_csv = fs.readFileSync(visitor_centers_path, 'utf8').toString().CSVMap(),
        visitor_centres = [],
        i;
    for(i = 0; i < visitor_centres_original_csv.length; i++){
        if(visitor_centres_original_csv[i].PHONE !== undefined){
            visitor_centres_original_csv[i].PHONE_SANITISED = visitor_centres_original_csv[i].PHONE.toString().replace(/ /g, "");
            visitor_centres.push(visitor_centres_original_csv[i]);
        }
    }
    nz_map_dimensions.ratio = nz_map_dimensions.width / nz_map_dimensions.height;
    mustache_data.visitor_centres = visitor_centres;
    mustache_data.nz_map_dimensions = JSON.stringify(nz_map_dimensions);
    for(i = 0; i < htmlf_paths.length; i++){
        var htmlf_path = htmlf_paths[i],
            htmlf_fullpath = path.join(approot, "html", htmlf_path),
            htmlf_path_extension = htmlf_path.substr(htmlf_path.lastIndexOf(".") + 1),
            new_path = path.resolve(greatwalks_repo, htmlf_path.replace("." + htmlf_path_extension, ".html")),
            basename = path.basename(htmlf_path),
            filename_extension = path.extname(htmlf_path),
            basename_without_extension = path.basename(htmlf_path, filename_extension),
            htmlf_mustache_data;
        
        htmlf_mustache_data = clone(mustache_data);
        htmlf_mustache_data.page_id = basename_without_extension;
        if(!fs.statSync(htmlf_fullpath).isDirectory()){
            process_pages.push({
                page_path: htmlf_fullpath,
                page_title: "",
                mustache_data: htmlf_mustache_data,
                page_id: basename_without_extension,
                destination_path: new_path
            });
        }
    }
}());

(function(){
    // Delete any per-walk CSVs while leaving source file(s)
    // Also build up a list of walks (each walk has a directory under 'walks')
    var walks_in_order = [
        "Lake Waikaremoana",
        "Tongariro Northern Circuit",
        "Whanganui Journey",
        "Abel Tasman Coast Track",
        "Heaphy Track",
        "Kepler Track",
        "Milford Track",
        "Routeburn Track",
        "Rakiura Track - Stewart Island"],
        i,
        walk_name,
        walk_fullpath,
        walk_sanitised_name,
        walk_csv_path,
        template_slideout_walks = "";
            
    for(i = 0; i < walks_paths.length; i++){
        walk_name = walks_paths[i];
        walk_fullpath = path.join(approot, "walks", walk_name);
        walk_sanitised_name = walk_name.toLowerCase().replace(/ /g, "-");
        if(ignore_names.indexOf(walk_name) !== -1) continue;
        if(fs.statSync(walk_fullpath).isDirectory()) {
            walk_csv_path = path.join(walk_fullpath, "locations.csv");
            try {
                fs.unlinkSync(walk_csv_path);
            } catch (exception) {

            }
            // Write the header line of the CSV
            fs.writeFileSync(walk_csv_path, "Name,Description,Type,Long,Lat,PixelOffsetLeft,PixelOffsetTop\n");
        }
    }

    for(i = 0; i < walks_in_order.length; i++){
        walk_name = walks_in_order[i],
        walk_sanitised_name = walk_name.toLowerCase().replace(/ /g, "-");
        template_slideout_walks += '<li><a href="walk-' + walk_sanitised_name + '.html">' + walk_name + '</a></li>';
    }
    template = resolve_includes(template).replace(/\{\{slide-walks\}\}/g, template_slideout_walks);
}());

(function(){
    var location_id_mapping = {
        "LakeWaikaremoana":"Lake Waikaremoana",
        "Wellington":"Wellington",
        "TongariroNorthernCircuit":"Tongariro Northern Circuit",
        "TongariroNationalPark":"Tongariro Northern Circuit",
        "WhanganuiJourney":"Whanganui Journey",
        "AbelTasmanCoastTrack":"Abel Tasman Coast Track",
        "AbelTasman CoastTrack":"Abel Tasman Coast Track",
        "HeaphyTrack":"Heaphy Track",
        "RouteburnTrack":"Routeburn Track",
        "MilfordTrack":"Milford Track",
        "KeplerTrack":"Kepler Track",
        "RakiuraTrack":"Rakiura Track - Stewart Island"
    };
    for(var i = 0; i < walks_paths.length; i++){
        var walk_name = walks_paths[i],
            walk_fullpath = path.join(approot, "walks", walk_name),
            walk_csv_path,
            row,
            locations_data,
            location_data_by_location = {},
            serialized_row = "",
            was_able_to_read_a_line;

        if(ignore_names.indexOf(walk_name) !== -1) continue;

        if(!fs.statSync(walk_fullpath).isDirectory() && walk_name.endsWith(".csv")){
            process.stdout.write(" - Found a CSV: " + walk_name + "\n");
            was_able_to_read_a_line = false;
            locations_data = fs.readFileSync(walk_fullpath, 'utf8').toString().CSVMap();
            //throw JSON.stringify(locations_data); //DEBUG

            for(var y = 0; y < locations_data.length; y++){
                row = locations_data[y];
                
                if(row.Longitude !== undefined) { //test for blank line in CSV. Longitude) is arbitrary field that should exist.
                    if(location_data_by_location[row.GreatWalk] === undefined) {
                        location_data_by_location[row.GreatWalk] = [];
                    }
                    if(row.PixelOffsetLeft === undefined || isNaN(parseInt(row.PixelOffsetLeft, 10)) ){
                        row.PixelOffsetLeft = " ";
                    }
                    if(row.PixelOffsetTop === undefined || isNaN(parseInt(row.PixelOffsetTop, 10))) {
                        row.PixelOffsetTop = " ";
                    }
                    row.GreatWalkId = location_id_mapping[row.GreatWalk];
                    if(row.GreatWalkId === undefined) {
                        throw "Unable to find GreatWalkId for " + row.GreatWalk;
                    }
                    walk_csv_path = path.join(approot, "walks", row.GreatWalkId, "locations.csv");
                    if(row.POIIconType) {
                        serialized_row = '"' + row.Name + '","' + row.Description + '","' + row.POIIconType + '","' + row.Longitude + '","' + row.Latitude + '","' + row.PixelOffsetLeft + '","' + row.PixelOffsetTop + '"\n';
                    } else {
                        throw "Unrecognised CSV columns in file " + walk_name + " : " + JSON.stringify(row);
                    }
                    fs.appendFileSync(walk_csv_path, serialized_row);
                    was_able_to_read_a_line = true;
                    location_data_by_location[row.GreatWalk].push(row);
                }
            }
            if(was_able_to_read_a_line === false) {
                process.stdout.write("   - WARNING no valid rows read from this CSV\n");
            } else {
                process.stdout.write("   - SUCCESS was able to read long/lat rows\n");
            }
        }
    }
}());

//  Generate Maps
(function(){
    var walk_name,
        walk_sanitised_name,
        walk_fullpath,
        map_path,
        locations_path,
        locations_data,
        location,
        pgw_path,
        map_data,
        map_data_array,
        map_details,
        html_page,
        new_path,
        new_filename,
        locations,
        recoverable_errors,
        too_close_message,
        map_dimensions,
        map_mustache_data,
        i;

    for(i = 0; i < walks_paths.length; i++){
        walk_name = walks_paths[i];
        walk_sanitised_name = walk_name.toLowerCase().replace(/ /g, "-");
        walk_fullpath = path.join(approot, "walks", walk_name);
        map_path = path.join(approot, "walks", walk_name, "map.png");
        locations_path = path.join(approot, "walks", walk_name, "locations.csv");
        pgw_path = path.join(walk_fullpath, "map.pgw");
        recoverable_errors = "";
        html_page = "";

        if(ignore_names.indexOf(walk_name) !== -1) continue;

        if(fs.statSync(walk_fullpath).isDirectory()) {
            map_mustache_data = clone(mustache_data);
            map_dimensions = get_image_dimensions(map_path);
            map_mustache_data.map_id = walk_sanitised_name;
            map_mustache_data.map_pixel_width = Math.floor(map_dimensions.width * scale_by);
            map_mustache_data.map_pixel_height = Math.floor(map_dimensions.height * scale_by);

            //offset
            try {
                map_data = fs.readFileSync(pgw_path, 'utf8').toString();
            } catch(exception) {
                throw "Unable to find a pgw file. Unable to proceed";
            }
            
            map_data_array = map_data.split("\n");
            map_details = {};
            map_details.map_id = walk_sanitised_name;

            map_details.latitude = parseFloat(extract_value_between(map_data_array, -60, -30));
            map_details.longitude = parseFloat(extract_value_between(map_data_array, 150, 180));
            map_details.map_pixel_width = map_mustache_data.map_pixel_width;
            map_details.map_pixel_height = map_mustache_data.map_pixel_height;
            map_details.degrees_per_pixel = parseFloat(extract_value_between(map_data_array, 0, 2) / scale_by);
            map_details.extent_latitude = map_details.latitude - (map_mustache_data.map_pixel_height * map_details.degrees_per_pixel);
            map_details.extent_longitude = map_details.longitude + (map_mustache_data.map_pixel_width * map_details.degrees_per_pixel);
            map_details.map_initial_scale = 0.1;
            mustache_data.maps_details[walk_sanitised_name] = map_details;
            map_mustache_data.map_initial_scale = map_details.map_initial_scale;
                        
            map_mustache_data.half_map_pixel_width = map_details.map_pixel_width / 2;
            map_mustache_data.quarter_map_pixel_width = map_details.map_pixel_width / 4;
            
            try {
                locations_data = fs.readFileSync(locations_path, 'utf8').toString();
            } catch(exception) {
            }

            map_mustache_data.locations = [];

            if(locations_data !== undefined) {
                //process.stdout.write("Reading CSV from " + locations_path + "\n");
                locations = locations_data.CSVMap(",");
                map_mustache_data.locations = [];
                for(var location_index = 0; location_index < locations.length; location_index++){
                    location = locations[location_index];
                    if(location.Long !== undefined) {  //'Long' (longitude) is arbitrary field chosen to see if it's present in the data, to test whether this this infact a row of data or a blank line
                        try {
                            location.pixel = pixel_location(map_details.latitude, map_details.longitude, mustache_data.map_pixel_width, mustache_data.map_pixel_height, map_details.degrees_per_pixel, location.Lat, location.Long, walk_name, location.Name);
                            if(location.PixelOffsetLeft !== undefined && location.PixelOffsetLeft !== " "){
                                location.pixel.left += parseInt(location.PixelOffsetLeft, 10);
                            }
                            if(location.PixelOffsetTop !== undefined && location.PixelOffsetTop !== " " ){
                                location.pixel.top += parseInt(location.PixelOffsetTop, 10);
                            }
                            location.percentage = {left: location.pixel.left / map_details.map_pixel_width * 100, top: location.pixel.top / map_details.map_pixel_height * 100 };
                            location.Type = location.Type.toId();
                            location.WalkName = walk_name;
                            too_close_message = check_for_nearby_locations(location);
                            if(too_close_message !== undefined && too_close_message.length > 0) {
                                fs.appendFileSync(too_close_locations_path, too_close_message);
                                some_locations_were_too_close = true;
                            }
                            //recoverable_errors += too_close_message;
                            map_mustache_data.locations.push(location);
                        } catch(exception) {
                            if(exception.name === "OutOfBounds") {
                                fs.appendFileSync(out_of_bounds_path, JSON.stringify(location) + "\n");
                                //recoverable_errors += " - WARNING " + location.Name + " is out of bounds. See " + path.basename(out_of_bounds_path) + " for more\n";
                                some_locations_were_out_of_bounds = true;
                            } else if(exception.name) {
                                throw exception.name + ":" + exception.message + "\n" + JSON.stringify(exception);
                            } else {
                                throw "Unknown error" + JSON.stringify(exception);
                            }
                        }
                    }
                }
            }

            new_filename = "map-" + walk_sanitised_name + ".html";
            new_path = path.join(greatwalks_repo, new_filename);
            great_walks.walks.push({"id": walk_sanitised_name, "name": walk_name, "map_filename":new_filename, "walk_filename": "walk-" + walk_sanitised_name + ".html"});
            process_pages.push({
                page_path: walks_template_path,
                page_title: walk_name,
                mustache_data: map_mustache_data,
                page_id: "map",
                destination_path: new_path
            });

        }
        map_data = undefined;
        locations_data = undefined;
    }
    
    if(some_locations_were_out_of_bounds){
        process.stdout.write(" - WARNING: Some map locations were out of bounds.\n            See walks/" + path.basename(out_of_bounds_path) + " for more details.\n");
    }
    if(some_locations_were_too_close) {
        process.stdout.write(" - WARNING: Some map locations were too close to one another.\n            See walks/" + path.basename(too_close_locations_path) + " for more details.\n");
    }
}());


(function(){
    // Generate Walk Info Page
    for(var i = 0; i < walks_paths.length; i++){
        var walk_name = walks_paths[i],
            walk_sanitised_name = walk_name.toLowerCase().replace(/ /g, "-"),
            walk_path = path.join(approot, "walks", walk_name),
            elevation_profile_image = "img/walks/" + walk_sanitised_name + "/profile.jpg",
            elevation_profile_image_fullpath = path.join(greatwalks_repo, elevation_profile_image),
            elevation_profile_image_dimensions,
            elevation_dimensions_json,
            content_path,
            youtube_path,
            content_data,
            new_path = path.join(greatwalks_repo, "walk-" + walk_sanitised_name + ".html"),
            map_filename = "map-" + walk_sanitised_name + ".html",
            carousel_path = path.join(walk_path, "Carousel"),
            carousel_files,
            carousel_deck_index,
            carousel_web_path,
            y,
            thumbnails_per_slide = 3,
            walk_mustache_data;

        if(ignore_names.indexOf(walk_name) !== -1) continue;

        content_path = path.join(walk_path, "index.mustache");
        youtube_path = path.join(walk_path, "youtube.txt");

        if(fs.statSync(walk_path).isDirectory()) {
            walk_mustache_data = clone(mustache_data);
            walk_mustache_data['walk-id'] = walk_sanitised_name;
            if(fs.existsSync(elevation_profile_image)){
                elevation_dimensions_json = get_image_dimensions(elevation_profile_image);
                walk_mustache_data["elevation-profile-image-width"] = elevation_dimensions_json.width;
                walk_mustache_data["elevation-profile-image-halfwidth"] = elevation_dimensions_json.width / 2;
                walk_mustache_data["elevation-profile-image-height"] = elevation_dimensions_json.height;
                walk_mustache_data["elevation-profile-modal-height"] = elevation_dimensions_json.height + 20;
            }
            walk_mustache_data["walk-image-directory"] = path.join("img/walks/", walk_sanitised_name) + "/";
            walk_mustache_data["youtube-id"] = fs.readFileSync(youtube_path, 'utf8');
            walk_mustache_data["map_filename"] = map_filename;
            walk_mustache_data["elevation-profile-image"] = elevation_profile_image;
            walk_mustache_data.carousel = [];
            walk_mustache_data.carousel_thumbnails = [];
            if(fs.statSync(carousel_path).isDirectory()){
                carousel_files = fs.readdirSync(carousel_path);
                for(y = 0; y < carousel_files.length; y++){
                    carousel_web_path = "img/walks/" + walk_sanitised_name + "/carousel-" + carousel_files[y].toNormalizedFilename();
                    walk_mustache_data.carousel.push({
                        "path": carousel_web_path,
                        "id": carousel_files[y].toId()
                    });
                    carousel_deck_index = Math.floor(y / thumbnails_per_slide);
                    if(walk_mustache_data.carousel_thumbnails[carousel_deck_index] === undefined){
                        walk_mustache_data.carousel_thumbnails[carousel_deck_index] = {
                            "thumbnails":[],
                            "active": carousel_deck_index === 0 ? "active":""
                        };
                    }
                    //process.stdout.write(carousel_files[y] + "\n" + carousel_files[y].toNormalizedFilename() + "\n" + carousel_web_path + "\n\n");
                    walk_mustache_data.carousel_thumbnails[carousel_deck_index].thumbnails.push({
                        "path": carousel_web_path,
                        "id": carousel_files[y].toId()
                    });
                }
            }

            process_pages.push({
                page_path: content_path,
                page_title: walk_name,
                mustache_data: walk_mustache_data,
                page_id: "walk",
                destination_path: new_path
            });
        }
    }
}());


(function(){
    var process_page_arguments,
        i,
        html_page,
        maps_details = JSON.stringify(mustache_data.maps_details);
    for(i = 0; i < process_pages.length; i++){
        process_page_arguments = process_pages[i];
        process_page_arguments.mustache_data.maps_details = maps_details;
        html_page = process_page(
            process_page_arguments.page_path,
            process_page_arguments.page_title,
            process_page_arguments.mustache_data,
            process_page_arguments.page_id);
        fs.writeFileSync(process_page_arguments.destination_path, html_page);
        process.stdout.write(" - Building Page: " + path.basename(process_page_arguments.destination_path) + "\n");
    }
}());


function process_page(htmlf_path, page_title, page_mustache_data, page_id){
    var raw_htmlf_data = fs.readFileSync(htmlf_path, 'utf8').toString(),
        htmlf_data = resolve_includes(raw_htmlf_data, path.dirname(htmlf_path), htmlf_path),
        htmlf_path_extension = htmlf_path.substr(htmlf_path.lastIndexOf(".") + 1),
        htmlf_filename = path.basename(htmlf_path),
        html_page,
        share_social_detail_key,
        chosen_share_social,
        chosen_share_social_key,
        social_item_key,
        page_key = htmlf_path;

    if(page_mustache_data && page_mustache_data.map_id !== undefined) {
        page_key = page_mustache_data.map_id;
    }

    for(share_social_detail_key in share_social_details){
        if(page_key.indexOf(share_social_detail_key) !== -1) {
            chosen_share_social = share_social_details[share_social_detail_key];
            chosen_share_social_key = share_social_detail_key;
        }
    }
    if(chosen_share_social === undefined) {
        chosen_share_social_key = "default";
        chosen_share_social = share_social_details[chosen_share_social_key];
    }
    for(social_item_key in share_social_details['default']){
        if(chosen_share_social[social_item_key] === undefined) {
            chosen_share_social[social_item_key] = share_social_details['default'][social_item_key];
        }
    }

    page_mustache_data.title = page_title || path.basename(htmlf_path);
    page_mustache_data.page_id = page_id;
    page_mustache_data.body = mustache.to_html(htmlf_data, page_mustache_data);
    html_page = mustache.to_html(template, page_mustache_data);

    

    if(html_page !== undefined){
        html_page = html_page
                        .replace(/replace_social_text/g, encodeURIComponent(chosen_share_social.social_text).replace(/'/g, "%27"))
                        .replace(/replace_twitter_url/g, encodeURIComponent(chosen_share_social.twitter_url).replace(/'/g, "%27"))
                        .replace(/replace_facebook_image/g, encodeURIComponent(chosen_share_social.facebook_image).replace(/'/g, "%27"))
                        .replace(/replace_facebook_url/g, encodeURIComponent(chosen_share_social.facebook_url).replace(/'/g, "%27"))
                        .replace(/&Auml;/g, "\u0100")  //macronised A
                        .replace(/&auml;/g, "\u0101")  //macronised a
                        .replace(/&Euml;/g, "\u0112")  //macronised E
                        .replace(/&euml;/g, "\u0113")  //macronised e
                        .replace(/&Iuml;/g, "\u012A")  //macronised I
                        .replace(/&iuml;/g, "\u012B")  //macronised i
                        .replace(/&Ouml;/g, "\u014C")  //macronised O
                        .replace(/&ouml;/g, "\u014D")  //macronised o
                        .replace(/&Uuml;/g, "\u016A")  //macronised U
                        .replace(/&uuml;/g, "\u016B") //macronised u
                        .replace(/Maori/gi, function(match, offset, the_string){
                            var maori_length = "Maori".length,
                                less_than_offset = the_string.lastIndexOf("<", offset + maori_length - 1),
                                greater_than_offset = the_string.lastIndexOf(">", offset + maori_length - 1),
                                debug_less_than_extract = the_string.substring(less_than_offset, offset + maori_length).replace(/[\n\r]/g, " "),
                                debug_greater_than_extract = the_string.substring(greater_than_offset, offset + maori_length).replace(/[\n\r]/g, " ");
                            
                            var is_a_text_node = greater_than_offset > less_than_offset;
                            //if(htmlf_path.match(/Rakiura Track/)) {
                            //    console.log((is_a_text_node ? "IS A TEXT NODE" : "IS NOT A TEXT NODE") +  "\n" + greater_than_offset + " / " + less_than_offset + "\nGREATER (" + debug_greater_than_extract.length + "): " + debug_greater_than_extract + "\nLESS (" + debug_less_than_extract.length + "): " + debug_less_than_extract + "\n\n");
                            // }
                            if(is_a_text_node) {
                                return "M&#257;ori";
                            } else {
                                return match;
                            }
                        }) //may be too broad, may cause problems if the word Maori is in a URL or something
                        .replace(/([0-9.]+) km/gi, function(match, contents, offset, s){
                            return format_kilometres(parseFloat(contents));
                        })
                        .replace(/([0-9.]+) metres/gi, function(match, contents, offset, s){
                            return format_metres(parseFloat(contents));
                        })
                        .replace(/([0-9.]+) kg/gi, function(match, contents, offset, s){
                            return format_kilograms(parseFloat(contents));
                        });
    }
    return html_page;
}

function extract_value_between(map_data_array, greater_than, less_than) {
    for(var i = 0; i < map_data_array.length; i++){
        var item = parseFloat(map_data_array[i]);
        if(!isNaN(item) && item > greater_than && item < less_than) {
            return item;
        }
    }
    return undefined;
}

function format_kilometres(kilometres){
    return retain_precision(kilometres, "km", kilometres * kilometres_to_miles, "mi");
}

function format_metres(metres) {
    return retain_precision(metres, "m", metres * metres_to_feet, "ft");
}

function format_kilograms(kilograms) {
    return retain_precision(kilograms, "kg", kilograms * kilograms_to_pounds, "lbs");
}

function retain_precision(value1, units1, value2, units2) {
    /* Rounds value2 to the precision [same number of decimal places] as that of value1
     * and then returns a formatted string
     */
    var position_of_dot = value1.toString().indexOf("."),
        factor;
    if(position_of_dot === -1){
        return value1 + units1 + " / " + Math.round(value2) + units2;
    }
    factor = Math.pow(10, value1.toString().length - position_of_dot - 1);
    return (Math.round(value1 * factor) / factor) + units1 + " / " + (Math.round(value2 * kilometres_to_miles * factor) / factor) + units2;
}

function pixel_location(map_latitude, map_longitude, map_pixel_width, map_pixel_height, degrees_per_pixel_scaled_by, location_latitude, location_longitude, map_name, location_name){
    var pixel = {
        "latitude": location_latitude,
        "longitude": location_longitude,
        "latitude_offset": location_latitude - map_latitude,
        "longitude_offset": location_longitude - map_longitude
        },
        offmap = false,
        offmap_message = "WARNING location out of bounds " + map_name + ": " + location_name + "\n";
    if(pixel.latitude === undefined || pixel.longitude === undefined || map_latitude === undefined || map_longitude === undefined) {
        throw {
            name: "BadData",
            message: "pixel_location was called with invalid data pixel_location(" + map_latitude + "," + map_longitude + "," + map_pixel_width + "," + map_pixel_height + "," + degrees_per_pixel_scaled_by + "," + location_latitude + "," + location_longitude + ",'" + map_name + "','" + location_name + "'"
        };
    }
    pixel.left = Math.round(pixel.longitude_offset / degrees_per_pixel_scaled_by);
    pixel.top = -Math.round(pixel.latitude_offset / degrees_per_pixel_scaled_by);
    if(pixel.left > map_pixel_width || pixel.top > map_pixel_height) {
        offmap = true;
    } else if (pixel.left.toString() === "NaN" || pixel.top.toString() === "NaN") {
        offmap = true;
    }
    if(offmap){
        console.log("Offmap " + JSON.stringify(pixel));
        throw {
            name: "OutOfBounds",
            message: offmap_message
        };
    }
    //process.stdout.write("[" + pixel.left.toString() + "]");
    if(JSON.stringify(pixel).toLowerCase().indexOf("nan") !== -1){
        console.log(JSON.stringify(pixel));
    }
    return pixel;
}

function execSync(cmd) {
    // nodeJS doesn't have a synchronous exec (e.g. execSync()).
    // full credit and blame for this function goes to
    // http://stackoverflow.com/questions/4443597/node-js-execute-system-command-synchronously/9051718#9051718

    var exec  = require('child_process').exec;
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


process.stdout.write("Success\n\n");
