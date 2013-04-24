/*globals map_details maps_details difference_between_positions_in_kilometers format_distance geolocation position_expires_after_milliseconds Modernizr Camera alert*/
(function($){
    "use strict";
    
    (function(){
        var PIx = 3.141592653589793,
            degrees_to_radians = function(degrees) {
                return degrees * PIx / 180;
            },
            kilometres_to_miles = 0.621371,
            one_hour_in_milliseconds = 60 * 60 * 1000;

        window.format_distance = function(kilometres){
             return (Math.round(kilometres * 100) / 100) + "km / " + (Math.round(kilometres * kilometres_to_miles * 100) / 100) + "mi";
        };

        window.difference_between_positions_in_kilometers = function(lat1, lon1, lat2, lon2, lat3, lon3){
            if(lat3 !== undefined && lon3 !== undefined) {
                //normally lat3/lon3 aren't given and this function just figures out the distance
                // between two points.
                // however if lat3/lon3 are given then this function finds out the distance between
                // a point and the closest side of a square (e.g. a map graphic).
                if(lat1 < lat3) {
                    lat2 = lat3;
                }
                if(lon1 > lon3) {
                    lon2 = lon3;
                }
            }
            // courtesy of http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points/27943#27943
            var R = 6371; // adverage radius of the earth in km
            var dLat = degrees_to_radians(lat2-lat1);  // Javascript functions in radians
            var dLon = degrees_to_radians(lon2-lon1);
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(degrees_to_radians(lat1)) * Math.cos(degrees_to_radians(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // Distance in km
        };

        window.position_expires_after_milliseconds = one_hour_in_milliseconds;
    }());

    var map_init = function(){
        var map_id = $("#map_id").text(),
            map_details = maps_details[map_id],
            open_tooltip,
            hammer_defaults = {
                prevent_default: true,
                scale_treshold: 0,
                drag_min_distance: 0
            },
            pixels_to_longitude_latitude = function(map_x, map_y){
                return {
                    longitude: map_details.longitude + (map_x / map_details.degrees_per_pixel),
                    latitude: map_details.latitude + (map_y / map_details.degrees_per_pixel)
                };
            },
            longitude_latitude_to_pixels = function(longitude, latitude){
                return {
                    left: Math.abs((longitude - map_details.longitude) / map_details.degrees_per_pixel) + "px",
                    top: Math.abs((latitude - map_details.latitude) / map_details.degrees_per_pixel) + "px"
                };
            },
            geolocation_success = function(event, position){
                /*
                Latitude:          position.coords.latitude
                Longitude:         position.coords.longitude
                Altitude:          position.coords.altitude
                Accuracy:          position.coords.accuracy
                Altitude Accuracy: position.coords.altitudeAccuracy
                Heading:           position.coords.heading
                Speed:             position.coords.speed
                */
                var youarehere_pixels = {
                        "top": -parseInt((position.coords.latitude - window.map_details.latitude) / window.map_details.degrees_per_pixel, 10),
                        "left": parseInt((position.coords.longitude - window.map_details.longitude) / window.map_details.degrees_per_pixel, 10)
                    },
                    edge_buffer_pixels = 10,
                    $youarehere = $("#youarehere").data("latitude", position.coords.latitude).data("longitude", position.coords.longitude),
                    $youarehere_offmap = $youarehere.find(".offmap"),
                    youarehere_css = {position: "absolute"},
                    youarehere_offmap_css = {position: "absolute", left: $youarehere.width() - 15, top: $youarehere.height()},
                    offmap = false,
                    difference_distance_in_kilometres = Math.round(
                            difference_between_positions_in_kilometers(
                                position.coords.latitude, position.coords.longitude,
                                window.map_details.latitude, window.map_details.longitude,
                                window.map_details.extent_latitude, window.map_details.extent_longitude
                            ) * 100) / 100;
                
                $youarehere_offmap.html("you are off the map by about " + format_distance(difference_distance_in_kilometres));
                if(youarehere_pixels.left < 0) {
                    youarehere_pixels.left = edge_buffer_pixels;
                    youarehere_offmap_css.left = edge_buffer_pixels;
                    offmap = true;
                } else if(youarehere_pixels.left > window.map_details.map_pixel_width){
                    youarehere_pixels.left = window.map_details.map_pixel_width - edge_buffer_pixels;
                    youarehere_offmap_css.left -= $youarehere_offmap.width() + edge_buffer_pixels;
                    offmap = true;
                }
                if(youarehere_pixels.top < 0) {
                    youarehere_pixels.top = edge_buffer_pixels;
                    youarehere_offmap_css.top = edge_buffer_pixels;
                    offmap = true;
                } else if(youarehere_pixels.top > window.map_details.map_pixel_height){
                    youarehere_pixels.top = window.map_details.map_pixel_height - edge_buffer_pixels;
                    youarehere_offmap_css.top = -$youarehere_offmap.height() - edge_buffer_pixels;
                    offmap = true;
                }
                youarehere_css.left = youarehere_pixels.left + "px";
                youarehere_css.top = youarehere_pixels.top + "px";
                youarehere_offmap_css.left += "px";
                youarehere_offmap_css.top += "px";
                $youarehere.css("webkit-box-shadow", "0px 0px 5px " + (position.coords.accuracy / 5000) + "px rgba(0, 0, 255, 0.3)");
                if(!offmap){
                    $youarehere_offmap.hide();
                } else {
                    $youarehere_offmap.css(youarehere_offmap_css).show();
                }
                $youarehere.css(youarehere_css).show();
                user_actions.update_last_updated();
            },
            geolocation_failure = function(event, msg){
                user_actions.$user_actions_panel.find("#refresh-geolocation").addClass("disabled").html("GeoLocation failure,<br>try again?").attr("title", msg);
                user_actions.$user_actions_panel.find(".last-updated").hide();
            },
            current_time_in_epoch_milliseconds,
            user_actions = {
                $user_actions_panel: $("#user_actions"),
                $photo_preview: $("#photo-preview"),
                initialize_user_photos: function(){
                    var user_photos_string = localStorage["user-photos"],
                        user_photos,
                        user_map_photos,
                        user_map_photo,
                        i;
                    if(user_photos_string === undefined) return;
                    user_photos = JSON.parse(user_photos_string);
                    if(user_photos[map_details.map_id] === undefined) return;
                    user_map_photos = user_photos[map_details.map_id];
                    for(i = 0; i < user_map_photos.length; i++){
                        user_map_photo = user_map_photos[i];
                        user_actions.add_photo_to_map(user_map_photo.imageURI, user_map_photo.latitude, user_map_photo.longitude);
                    }
                },
                panel_toggle: function(event){
                    var user_is_off_map = $("#youarehere").find(".offmap").is(":visible"),
                        error_html,
                        hyperlink;
                    if(navigator.camera && !user_is_off_map) {
                        if(user_actions.$user_actions_panel.hasClass("hidden")){
                            user_actions.$user_actions_panel.removeClass("hidden");
                        } else {
                            user_actions.$user_actions_panel.addClass("hidden");
                        }
                    } else {
                        if(navigator.camera && user_is_off_map) {
                            error_html = "You're off the map so we can't take location photos<br>Use your regular camera app";
                        } else if(!navigator.camera && user_is_off_map) {
                            error_html = "No camera available<br>(and you're off the map anyway so we can't take location photos)";
                        } else if(!navigator.camera && !user_is_off_map) {
                            error_html = "No camera available";
                        }
                        hyperlink = $("<a/>").html(error_html).addClass("btn disabled");
                        user_actions.$user_actions_panel.toggleClass("hidden");
                        user_actions.$camera_error.html(hyperlink);
                        user_actions.update_last_updated();
                    }
                },
                update_last_updated: function(){
                    var last_updated_at = window.geolocation_get_last_update(),
                        difference_in_seconds,
                        difference_in_minutes,
                        text;

                    if(user_actions.$user_actions_panel.is(".hidden")){
                        return;
                    }

                    if(last_updated_at !== undefined) {
                        difference_in_seconds = Math.round(((new Date()).getTime() - last_updated_at.getTime()) / 1000);
                        if(difference_in_seconds < 10) {
                            text = "Last updated a few seconds ago.";
                        } else if(difference_in_seconds < 120) {
                            text = "Last updated " + difference_in_seconds + " seconds ago.";
                        } else {
                            difference_in_minutes = Math.round(difference_in_seconds / 60);
                            text = "Last updated " + difference_in_minutes + " minutes ago.";
                        }
                        user_actions.$last_updated.attr("title", difference_in_seconds + " seconds").text(text).hide().fadeIn();
                    } else {
                        user_actions.$last_updated.hide();
                    }
                },
                data_photo_uri_key: "content-image-uri",
                show_user_photo: function(event){
                    var $photo = user_actions.$photo_preview,
                        $this = $(this);
                    $photo.attr("src", $this.data(user_actions.data_photo_uri_key)).show();
                },
                add_photo_to_map: function(imageURI, latitude, longitude, display_immediately, add_to_localStorage){
                    var user_photo_data = {
                        "longitude": longitude,
                        "latitude": latitude
                        },
                        user_photo_style,
                        user_photos,
                        user_photo;
                    if(latitude !== undefined && longitude !== undefined) {
                        user_photo_style = longitude_latitude_to_pixels(longitude, latitude);
                        user_photo_style.position = "absolute";
                    }
                    user_photo_data[user_actions.data_photo_uri_key] = imageURI;
                    var $photo_icon = $("<a/>").addClass("location location-icon location-user-photo").data(user_photo_data);
                    if(user_photo_style){
                        $photo_icon.css(user_photo_style);
                    }
                    $("#map").append($photo_icon);
                    if(Modernizr.touch) {
                        $photo_icon.hammer(hammer_defaults).bind('tap', user_actions.show_user_photo);
                    } else {
                        $photo_icon.click(user_actions.show_user_photo);
                    }
                    if(display_immediately === true) {
                        user_actions.show_user_photo.call($photo_icon); //I could unwrap it with .get(0) but it'll still work in show_user_photo
                    }
                    if(add_to_localStorage === true) {
                        user_photos = localStorage["user-photos"];
                        if(user_photos === undefined) {
                            user_photos = {};
                        }
                        if(user_photos[map_details.map_id] === undefined){
                            user_photos[map_details.map_id] = [];
                        }
                        user_photo = {
                            "imageURI": imageURI,
                            "latitude": latitude,
                            "longitude": longitude
                        };
                        user_photos[map_details.map_id].push(user_photo);
                        localStorage["user-photos"] = JSON.stringify(user_photos);
                    }
                },
                take_photo: function(){
                    var camera_success = function(imageURI) {
                            var $photo_preview = $("#photo-preview").attr("src", imageURI),
                                last_known_position = window.geolocation_get_last_position();
                            if(last_known_position !== undefined) {
                                user_actions.add_photo_to_map(imageURI, last_known_position.coords.latitude, last_known_position.coords.longitude, true, true);
                            } else {
                                user_actions.add_photo_to_map(imageURI, undefined, undefined, true, true);
                            }
                            user_actions.$user_actions_panel.addClass("hidden");
                        },
                        camera_fail = function onFail(message) {
                            alert('Failed because: ' + message);
                        };
                    navigator.camera.getPicture(camera_success, camera_fail, {quality: 50, destinationType: Camera.DestinationType.FILE_URI});
                    return false;
                },
                camera_error_timer:undefined,
                $camera_error: $("#user_actions").find(".take-photo"),
                $refresh_geolocation: $("#user_actions").find(".refresh-geolocation"),
                refresh_geolocation: function(event){
                    user_actions.$user_actions_panel.find("#refresh-geolocation").removeClass("disabled").text("Refresh GeoLocation");
                    user_actions.$user_actions_panel.find(".last-updated").show();

                    window.geolocation_refresh();
                    return false;
                },
                $last_updated: $("#user_actions").find(".last-updated")
            },
            youarehere_hammer,
            toggle_map_key = function(event){
                var $map_key = $("#map-key");
                $map_key.toggle();
                return false;
            },
            $html = $("html"),
            last_position = window.geolocation_get_last_position();

        $html.bind("doc:geolocation:failure", geolocation_failure);
        $html.bind("doc:geolocation:success", geolocation_success);
        window.map_details = map_details;

        if(last_position){
            console.log("there is a position", last_position);
            geolocation_success(undefined, last_position);
        }

        $html.bind("doc:geolocation:success", geolocation_success);
        
        $("#weta").fastPress(window.toggle_popover);
        $("#map .location").fastPress(window.toggle_popover);
        $("#take-photo").fastPress(user_actions.take_photo);
        $("#toggle-map-key, #map-key").fastPress(toggle_map_key);
        $("#youarehere, #no_gps").fastPress(user_actions.panel_toggle);

        user_actions.initialize_user_photos();
        user_actions.$refresh_geolocation.fastPress(user_actions.refresh_geolocation);
        

    };

    window.pageload(map_init, "/map-");
}(jQuery));