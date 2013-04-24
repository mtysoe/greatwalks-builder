/*
 * Handles the navbars (including the bottom one, if it's there)
 */
(function($){
	"use strict";
	var navbar_init = function(){
		var $navbar_social = $("#share-social a"),
			$page1 = $("#page1"),
			$show_slideout_navigation = $("#show_slideout_navigation"),
			$wrapper = $("#wrapper"),
			reset_width_height = {"width": "auto", "height": "auto"},
			page_change = function(event){
				$page1.find(".social-links").hide();
				$show_slideout_navigation.attr("checked", false);
				$wrapper.css(reset_width_height);
			},
			$html = $("html").bind("doc:page-change", page_change);

		$navbar_social.fastPress(function(){
			$page1.find(".social-links").toggle(); // don't cache jQuery selector because it's loaded in/out all the time
			return false;
		});

		$("#show_slideout_navigation").change(function(event){
			// When on a very small screen AND when the slideout navigation is exposed hide the logo because it will mess up the display
			var $this = $(this),
				$logo;
			if($(window).height() > 400 && $(window).width() > 400) return;
			$logo = $("#logo");
			if($this.is(":checked")) {
				$logo.hide();
			} else {
				$logo.show();
			}
		});
	};
    window.pageload(navbar_init);
}(jQuery));