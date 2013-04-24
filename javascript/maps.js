/*global alert nz_map_dimensions console*/
(function($){
    "use strict";
    var $wrapper,
        $new_zealand_map_wrapper,
        $new_zealand_map_img,
        text_sizes = ["size800", "size700", "size600", "size500", "size400", "size300", "size200", "size100"],
        $window,

        adjust_maps_height = function(event){
            var available_width = $window.width(),
                available_height = $window.height(),
                offset = $new_zealand_map_img.offset(),
                remaining_height = available_height - offset.top,
                fixed_dimension = (available_width / remaining_height < nz_map_dimensions.ratio) ? "width" : "height",
                target_dimensions = {width:undefined, height:undefined};

            if(fixed_dimension === "width") {
                target_dimensions.width = available_width;
                target_dimensions.height = target_dimensions.width / nz_map_dimensions.ratio;
            } else {
                target_dimensions.height = remaining_height - 10;
                target_dimensions.width = target_dimensions.height * nz_map_dimensions.ratio;
            }
            if(target_dimensions.width > nz_map_dimensions.width) {
                target_dimensions.width = nz_map_dimensions.width;
                nz_map_dimensions.height = nz_map_dimensions.height;
            }
            $new_zealand_map_wrapper.width(target_dimensions.width).height(target_dimensions.height);
            $new_zealand_map_img.width(target_dimensions.width).height(target_dimensions.height);
            target_dimensions.chosen_text_size = Math.round(target_dimensions.width / 100) * 100;
            if(target_dimensions.chosen_text_size > 800) {
                target_dimensions.chosen_text_size = 800;
            } else if(target_dimensions.chosen_text_size < 100) {
                target_dimensions.chosen_text_size = 100;
            }
            $new_zealand_map_wrapper
                .addClass("size" + target_dimensions.chosen_text_size)
                .removeClass(text_sizes.join(" ").replace("size" + target_dimensions.chosen_text_size, ""));
            $wrapper.width(available_width).height(remaining_height);
            //$("#debug").text("size" + target_dimensions.chosen_text_size);
            $new_zealand_map_wrapper.show();
        },
        maps_init = function(event){
            $window = $(window);
            $wrapper = $("#wrapper");
            $new_zealand_map_wrapper = $wrapper.find("#new-zealand-map");
            $new_zealand_map_img = $new_zealand_map_wrapper.find("img");
            $window.bind("resize orientationchange", adjust_maps_height);
            adjust_maps_height();
            setTimeout(adjust_maps_height, 200);
        };

    window.pageload(maps_init, "/maps.html");
}(jQuery));

