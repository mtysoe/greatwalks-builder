/* globals window Modernizr Hammer */
/* Geolocation */
(function($){
    var $html,
        one_second_in_milliseconds = 1000,
        geo = {
            watch_id: undefined,
            settings: {
                maximumAge:600000,
                enableHighAccuracy: true,
                timeout: one_second_in_milliseconds * 300
            },
            last_updated: undefined,
            timer: undefined,
            last_known_position: undefined,
            localStorage_position_cache_key: "geolocation-last-known-position",
            trigger_frequency_milliseconds: 2000,
            trigger_update: function(){
                if(geo.last_known_position === undefined) return;
                $html.trigger("doc:geolocation:success", geo.last_known_position);
                geo.timer = setTimeout(geo.trigger_update, geo.trigger_frequency_milliseconds);
            },
            init: function(){
                $html = $("html");
                    
                if (navigator.geolocation) {
                    geo.watch_id = navigator.geolocation.watchPosition(geo.success, geo.error, geo.settings);
                } else {
                    geo.error();
                }

                //if(geo.timer){
                //    clearTimeout(geo.timer);
                //}
                //geo.timer = setTimeout(geo.trigger_update, geo.trigger_frequency_milliseconds);
            },
            refresh: function(){
                try{
                    geolocation.clearWatch(geo.watch_id);
                } catch(exception){
                }
                geo.settings.enableHighAccuracy = true;
                geo.watch_id = navigator.geolocation.watchPosition(geo.success, geo.error, geo.settings);
            },
            success: function(position){
                geo.last_updated = new Date();
                geo.last_known_position = position;
                $html.trigger("doc:geolocation:success", position);
            },
            error: function(msg){
                if(msg.toString().match(/timeout/)) return; //Not an error we're concerned with.
                try{
                    geolocation.clearWatch(geo.watch_id);
                } catch(exception){
                }
                console.log("error", msg);
                if(geo.settings.enableHighAccuracy === true) { //high accuracy failed so retry with low accuracy
                    geo.settings.enableHighAccuracy = false;
                    geo.watch_id = navigator.geolocation.watchPosition(geo.success, geo.error, geo.settings);
                } else {
                    $html.trigger("doc:geolocation:failure");
                }
            }
        };
    window.pageload(geo.init);
    window.geolocation_get_settings = function(){
        return geo.settings;
    };
    window.geolocation_get_last_position = function(){
        return geo.last_known_position;
    };
    window.geolocation_refresh = function(){
        return geo.refresh();
    };
    window.geolocation_get_last_update = function(){
        return geo.last_updated;
    };
}(jQuery));