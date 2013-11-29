var TranslateTab = function() { // Provides translate tab
	this.caption = 'Translate';
};

TranslateTab.prototype = new TabProvider();

TranslateTab.prototype.createDOM = function() {
	var dom = $('<div class="tab_body"></div>');
	return dom;
};
