/*globals window localStorage JSON geolocation navigator */
(function($){
    "use strict";
    var one_second_in_milliseconds = 1000,
        $report_error,
        report_error_template = "mailto:greatwalks@doc.govt.nz?subject=Issue on Great Walks track- please fix&body=The issue is near {{Latitude}}/{{Longitude}} (Lat/Long)",
        geolocation_success = function(event, position){
            $report_error.attr("href", report_error_template
                .replace(/\{\{Longitude\}\}/, position.coords.longitude)
                .replace(/\{\{Latitude\}\}/, position.coords.latitude)
            );
        },
        info_init = function(){
            $report_error = $(".report_error");
            $("html").bind("doc:geolocation:success", geolocation_success);
        };
    window.pageload(info_init, "/info.html");
}(jQuery));