/* globals window Modernizr Hammer */
/* Simple click wrapper */
(function($){
    var hammer_defaults = {
            prevent_default: true,
            scale_treshold: 0,
            drag_min_distance: 0
        },
        $wrapper,
        $html,
        $html_title,
        $body,
        $page_contents_wrapper_page1,
        $page_contents_wrapper_page2,
        modernizr_touch = Modernizr.touch,
        fastPress_hyperlink = function(event){
            var $this = $(this),
                this_href = $this.attr("href");
            
            //because #internal links aren't done 'fast' and neither are protocol links e.g. tel: http:// https://
            if(!this_href || this_href.substr(0, 1) === "#" || this_href.substr(0, 4) === "tel:") {
                return true;
            } else if(this_href.indexOf(":") !== -1){
                var ref = window.open(this_href, '_blank');
                return true;
            }

            if(navigator.userAgent.match(/Android/i)) {
               return true;
            }

            window.hide_all_popovers();
            
            $.get(this_href, function(new_page, textStatus, jqXHR){
                var title = new_page.replace(/^[\s\S]*<title(.*?)>|<\/title>[\s\S]*$/g, ''),
                    $new_page,
                    $new_page_contents;

                new_page = new_page
                        .replace(/^[\s\S]*<body(.*?)>/g, '<div$1>')
                        .replace(/<\/body>[\s\S]*$/g, '</div>'); // jQuery can't parse entire pages http://stackoverflow.com/a/12848798
                $new_page = $(new_page);
                $new_page_contents = $("#page1", $new_page).contents();
                
                if($new_page_contents.length > 0) {
                    $html_title.text("*" + title);
                    $body.attr("class", $new_page.attr("class"));
                    $page_contents_wrapper_page1.html($new_page_contents);
                    if(window.history.pushState) window.history.pushState("", title, this_href);
                    $html.trigger("doc:page-change", this_href);
                } else { //there's an error, try to handle it gracefully by just going to the page
                    window.location = window.location.toString()
                        .substr(
                            0,
                            window.location.toString().lastIndexOf("/") + 1) +
                        this_href;
                }
            });
            return false;
        },
        fast_press_init = function(event){
            var listen_on = modernizr_touch ? "touchstart" : "click";
            $wrapper = $("#wrapper");
            $body = $("body");
            $html = $("html");
            $html_title = $("title");
            $page_contents_wrapper_page1 = $("#page1");
            $page_contents_wrapper_page2 = $("#page2");
            // $body.on(listen_on, "a", fastPress_hyperlink);
        };
    $.prototype.fastPress = function(callback){
        if(callback === undefined) {
            if(modernizr_touch) {
                return this.trigger('touchstart');
            }
            return this.trigger('click');
        }
        if(modernizr_touch) {
            this.hammer(hammer_defaults).bind('touchstart', callback);
            return this;
        }
        return this.click(callback);
    };
    window.pageload(fast_press_init);
}(jQuery));
