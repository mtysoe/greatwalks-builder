/*global navigator document*/
(function($){
    "use strict";
    var modal_init = function(event){
        /*
        Making changes to Bootstrap Modals?
        Keep this in mind http://stackoverflow.com/questions/10636667/bootstrap-modal-appearing-under-background/11788713#11788713
        AND also be aware that on the Samsung Galaxy Note tablet (GT-N8000) it also occurs with position:absolute;
        */
        var $body = $("body"),
            $html = $("html");
        $(".modal").appendTo("body");
        $body.on("click", ".modal", function(){
            $(this).modal("hide");
            $html.trigger("close-modal");
        });
        $body.on("click", ".modal-backdrop", function(){
           $html.trigger("close-modal");
        });
    };
    window.pageload(modal_init);
}(jQuery));