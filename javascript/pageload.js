/* globals window Modernizr Hammer */
/* Simple click wrapper */
(function($){
    var callback_pathname = {},
        $html,
        pageload_init = function(){
            $html = $("html").bind("doc:page-change", pageload_pagechange);
        },
        pageload_pagechange = function(event){
            var pathname_contains,
                pathname = window.location.pathname,
                callback,
                i;

            for(pathname_contains in callback_pathname){
                if(pathname.indexOf(pathname_contains) !== -1 ) {
                    //console.log("calling " + pathname_contains);
                    for(i = 0; i < callback_pathname[pathname_contains].length; i++){
                        callback_pathname[pathname_contains][i](event);
                    }
                }
            }
        };

    window.pageload = function(callback, pathname_contains){
        if(pathname_contains) {
            if(!callback) {
                throw "window.pageload() called with callback=" + callback;
            }
            if(callback_pathname[pathname_contains] === undefined) {
                callback_pathname[pathname_contains] = [];
            }
            callback_pathname[pathname_contains].push(callback);
        }
        if(pathname_contains && window.location.pathname.indexOf(pathname_contains) === -1 ) return;
        if (window.Media && navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            document.addEventListener("deviceready", callback, false);
        } else {
            $(document).ready(callback);
        }

    };

    window.pageload(pageload_init);
}(jQuery));