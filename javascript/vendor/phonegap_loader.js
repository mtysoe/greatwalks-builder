(function(){
    "use strict";
    var has_finalized = false,
        has_deviceready = false,
        scripts = [],
        on_deviceready = function(){
            has_deviceready = true;
            if(has_finalized) load_scripts();
        },
        load_scripts = function(){
            var script,
                script_element,
                i,
                body_element = document.getElementsByTagName("body")[0],
                load_next_script = function(){
                if(scripts.length === 0){
                    $(document).trigger("phonegap:ready");
                    return;
                }
                script = scripts.shift();
                script_element = document.createElement("script");
                script_element.setAttribute("src", script);
                script_element.addEventListener("load", load_next_script, false);
                body_element.appendChild(script_element);
                };
            load_next_script();
        };

    window.phonegap_script_loader = {
        add_scripts: function (new_scripts){
            scripts = scripts.concat(new_scripts);
            return window.phonegap_script_loader;
        },
        finalize: function(){
            has_finalized = true;
            if(has_deviceready) load_scripts();
            return window.phonegap_script_loader;
        }
    };

    if (window.Media && navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        document.addEventListener("deviceready", on_deviceready, false);
    } else {
        document.addEventListener("DOMContentLoaded", on_deviceready, false);
    }
}());
