/*globals Connection */
/*
 * Responsible for making changes to pages based on whether the device is online or offline
 */
(function($){
    "use strict";
    var going_online_offline_init = function(){
            document.addEventListener("online", going_online, false);
            document.addEventListener("offline", going_offline, false);
            if(navigator.network && navigator.network.connection.type === Connection.NONE) {
                going_offline();
            } else { //either we're online or the browser can't tell us if it's online, so assume online
                going_online();
            }
        },
       going_online = function(){
            $("#share-social").show();
            /*
            //Loss of connectivity crashes entire app. Disabling Youtube until we can find a proper fix for this.
            $(".youtube").each(function(){
                var $this = $(this),
                    youtube_id = $this.data("youtube-id");
                $this.html($('<iframe width="560" height="315" frameborder="0" allowfullscreen></iframe>')
                    .attr("src", "http://www.youtube.com/embed/" + youtube_id));
            });
            */
        },
       going_offline = function(){
            $("#share-social").hide();
            $(".youtube").each(function(){
                var $this = $(this);
                $this.empty();
            });
        };
    
    window.pageload(going_online_offline_init);
}(jQuery));