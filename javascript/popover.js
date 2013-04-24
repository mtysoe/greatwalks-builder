/*
 * Wrapper for Bootstrap's PopOver
 * http://twitter.github.com/bootstrap/javascript.html#popovers
 * This wrapper ensures that all other popovers are closed when
 * a new one opens, and that they can be closed by clicking on
 * the body tag and so on.
 * NOTE: there's a popular plugin called BootstrapX that claims
 * to do the same but it was very buggy on touch devices.
 */
(function($){
    "use strict";

    var existing_popovers = [],
        $window = $(window),
        $body,
        loaded_init_once = false,
        hide_popovers_timeout,
        too_small_for_popovers = function($this){
            if ($window.width() > 600) return false;
            if($("body.walk").length === 1) return true;
            if($this.is("#weta")) return true;
            return false;
        },
        popover_init = function(event){
            $body = $("body");
            $("body.map, #wrapper,#map").click(function(event){
                if($(event.target).is(this)) { //if we reached this event directly without bubbling...
                    window.hide_all_popovers_no_bubbling(event);
                }
            });
            if(!loaded_init_once){
                $("body").on("click", ".popover", function(event){
                    var $html = $("html");
                    window.hide_all_popovers_no_bubbling(event);
                    $html.trigger("popover-click");
                    //there can be detached popovers (e.g. after a page change)
                    //where the source link is now missing.
                    //these need to be removed.
                    if(hide_popovers_timeout){
                        clearTimeout(hide_popovers_timeout);
                    }
                    hide_popovers_timeout = setTimeout(function(){
                        $(".popover").remove();
                        //console.log("removing all popovers");
                    }, 100);
                });
                loaded_init_once = true;
            }
        },
        get_distance = function(latitude, longitude, include_description){
            var last_known_position = localStorage["geolocation-last-known-position"],
                current_time_in_epoch_milliseconds = (new Date()).getTime(),
                distance_away_in_kilometers,
                description_class = include_description ? "with-description" : "";

            if(last_known_position !== undefined) {
                last_known_position = JSON.parse(last_known_position);
                if(last_known_position.timestamp > current_time_in_epoch_milliseconds - window.position_expires_after_milliseconds) {
                    distance_away_in_kilometers = window.difference_between_positions_in_kilometers(last_known_position.coords.latitude, last_known_position.coords.longitude, latitude, longitude);
                    return '<b class="distance_away ' + description_class + '">Distance: ' + window.format_distance(distance_away_in_kilometers) + '</b>';
                }
            }
            return "";
        },
        get_popover_placement = function($sender){
            //console.log("Determining placement");
            var placement = $sender.data("placement"),
                offset,
                window_dimensions,
                scroll_top;
            if(placement !== undefined) return placement;
            //console.log("No default placement...determining it dynamically");
            window_dimensions = {"width": $window.width(), "height": $window.height()};
            scroll_top = $window.scrollTop();
            offset = $sender.offset();
            offset.top -= scroll_top;
            offset.top += $sender.height() / 2;
            offset.left += $sender.width() / 2;
            if(window_dimensions.width > 650) { //use left/right
                //console.log("widescreen " + window_dimensions.width + " " + offset.left);
                if(offset.left > window_dimensions.width / 2) {
                    return "left";
                } else {
                    return "right";
                }
            }
            //console.log("smallscreen" + window_dimensions.width);
            if(offset.top > window_dimensions.height / 2) {
                return "top";
            } else {
                return "bottom";
            }
        };

    window.hide_all_popovers = function(event, except_this_one){
        var $popover;
        while(existing_popovers.length){
            $popover = existing_popovers.pop();
            if(!except_this_one || !$popover.is(except_this_one)) {
                $popover.popover('hide');
            }
        }
    };

    window.hide_all_popovers_no_bubbling = function(event, except_this_one){
        window.hide_all_popovers(event, except_this_one);
        if(!event) return;
        event.preventDefault();
        event.stopPropagation();
        if(event.originalEvent) {
            event.originalEvent.stopPropagation();
        }
    };
   

    window.hide_popover = function(event){
        $(this).popover('hide');
    };

    window.toggle_popover_modal = function(event, options) {
        var $this = $(this),
            this_id = $this.attr("id") || 'generated-id-xxxxxxxxxxxxxx'.replace(/[x]/g, function(){
                                                return (Math.random()*16|0).toString(16);
                                           }),
            modal_id = "modal_" + this_id,
            $modal = $("#" + modal_id);

        if($modal.length === 0) {
            $modal = $("<div/>").addClass("modal hide fade popover-modal").attr("id", modal_id);
            $body.append($modal);
        }
        $this.attr("id", this_id).attr({"data-toggle": "modal", "role": "button"});
        if(options.content){
            $modal.html(options.content);
        } else {
            $modal.html($this.data("content"));
        }
        $modal.modal("toggle");
        return false;
    };

    window.toggle_popover = function(event){
        var $this = $(this),
            content_template = $this.data("content-template"),
            popover_class = $this.data("popover-class"),
            options = {html: true, trigger: "manual", "placement": get_popover_placement($this)},
            distance_placeholder = "[DISTANCE]",
            old_options,
            includes_description = false;
        window.hide_all_popovers(event, $this);
        if(popover_class) {
            options.template = '<div class="popover ' + popover_class + '"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>';
        }
        if(content_template !== undefined) { //if there is a template then there is dynamic content. bootstrap popovers cache content so we need to destroy the content and then rebuild it
            includes_description = (content_template.indexOf(distance_placeholder) + distance_placeholder.length + 5) < content_template.length;
            options.content = content_template.replace(distance_placeholder,
                get_distance($this.data("latitude"), $this.data("longitude"), includes_description));
            old_options = $this.data('popover');
            if(old_options) {
                old_options.options.content = options.content;
                $this.data('popover', old_options);
            }
        }
        if(too_small_for_popovers($this)) return window.toggle_popover_modal.apply(this, [event, options]);
        $this.popover(options).popover('toggle');
        existing_popovers.push($this);
        if(event.originalEvent) {
            event.originalEvent.stopPropagation();
        }
        return false;
    };

    window.show_popover = function(event, override_content){
        var $this = $(this),
            options = {html: true, trigger: "manual", "placement": get_popover_placement($this)};
        if(too_small_for_popovers($this)) return window.toggle_popover_modal.apply(this, [event, options]);
        window.hide_all_popovers(event, $this);
        if(override_content !== undefined) {
            options.content = override_content;
        }
        $this.popover(options).popover('show');
        existing_popovers.push($this);
        if(!event) return;
        event.stopPropagation();
        if(event.originalEvent) {
            event.originalEvent.stopPropagation();
        }
    };

    window.pageload(popover_init);

    // override back button behaviour for app
    window.bypass_back_button = function() {
        // if modal present, close modal only
        if( $(".modal-backdrop").length ) {
            $(".modal-backdrop").trigger('click');
            return;
        }

        if ( $('#show_slideout_navigation').length && $('#show_slideout_navigation').attr("checked") === 'checked' ) {
            $('#show_slideout_navigation').attr("checked", false);
            return;
        }

        // if we're on index page and back button pressed, close app
        if ( document.location.pathname === '/android_asset/www/index.html' ) {
            navigator.app.exitApp();
        }

        // otherwise, go back one page
        navigator.app.backHistory();
    };

    // enable back button override behaviour if device is android
    if(navigator.userAgent.match(/Android/i)) {
        document.addEventListener("deviceready", function() {
            document.addEventListener("backbutton", window.bypass_back_button,false);
        }, false);
    }
}(jQuery));
