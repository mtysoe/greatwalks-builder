(function($){
    "use strict";
    var make_blank = function() {
        if ( navigator.userAgent.match(/iphone|ipad|ipod/i) ) {
            $('ul.banners li a, div.offers li a').attr('target', "_blank");
        }
    };

    window.pageload(make_blank, '/offers');
    window.pageload(make_blank, '/walk-');

    // use childbrowser library to open offer links within app

    $('a.offer-link').click(function() {
        window.plugins.childBrowser.showWebPage($(this).attr('href'), { showLocationBar: false });
        return false;
    });
}(jQuery));
