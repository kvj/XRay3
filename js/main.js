yepnope({
	load: ['lib/jquery.min.js', 'bstrap/css/bootstrap.min.css', 'bstrap/js/bootstrap.min.js', 'css/main.css', 'js/translate.js', 'js/fmanager.js', 'js/idb.js', 'js/data.js'],
	complete: function() { // Load theme done
		log('About to show UI');
		var ui = new UI();
		var data = new DataProvider();
		data.init(function(err) { // Open result
			if (err) { // Failed
				// TODO: Show error
				return;
			};
			ui.data = data;
			var ttab = ui.addTab(TranslateTab);
			var ftab = ui.addTab(FileManagerTab);
			ui.selectTab(ttab.id);
		}.bind(this));
	}
});

var log = function() {
	if (!window.console) { // No console
		return;
	};
	console.log.apply(console, arguments);
};

var _id = 0;

var id = function() {
	var id = new Date().getTime();
	if (id <= _id) {
		id = _id+1;
	}
	_id = id;
	return id;
};

var TabProvider = function() { // Super class
};

TabProvider.prototype.onShow = function() { // Called when tab is shown (by click or from code)
};

TabProvider.prototype.createDOM = function() { // Called when UI is about to be created (show first time)
};

var UI = function() { // Object created at application startup
	this.createDOM();
};

UI.prototype.createDOM = function() { // Create DOM objects with jQuery
	var dom = $('<nav class="navbar navbar-default" role="navigation"><div class="navbar-header"><a class="navbar-brand" href="#">XRay3</a></div><p class="navbar-text navbar-right main_auth">???</p></nav><div class="main_tabs"><ul class="nav nav-tabs main_tabs_ul"></ul></div><div class="main_body"/><div class="main_status"></div></div><div class="main_scratchpad panel panel-default"><div class="scratchpad_body"><ul class="list-group scratchpad_list"></ul></div><div class="panel-footer"><span class="scratchpad_counter">(1)</span><span class="scratchpad_title">Scratchpad</span><div class="pull-right btn-group"><button class="btn btn-xs btn-primary scratchpad_toggle"><span class="glyphicon glyphicon-resize-full"></span></button></div></div>');
	this.scratchpadVisible = false;
	this.tabs = [];
	dom.find('.scratchpad_toggle').on('click', function() {
		this.toggleScratchpad();
	}.bind(this));
	$(document.body).append(dom);
	this.div = dom;
};

UI.prototype.toggleScratchpad = function() {
	this.scratchpadVisible = !this.scratchpadVisible;
	if (this.scratchpadVisible) {
		$('.main_scratchpad').addClass('scratchpad_visible');
	} else {
		$('.main_scratchpad').removeClass('scratchpad_visible');
	}
};

UI.prototype.refreshScratchpad = function() {
	$('.scratchpad_counter').text('('+this.data.scratchpad.length+')');
	var ul = $('.scratchpad_list').empty();
	var onWord = function(li, word, i) {
		// Drag
	}.bind(this);
	for (var i = 0; i<this.data.scratchpad.length; i++) {
		var word = this.data.scratchpad[i];
		var li = $('<li class="list-group-item scratchpad_item"></li>');
		var text = word.items.join(' / ');
		li.text(text);
		onWord(li, word, i);
		ul.append(li);
	};
};

UI.prototype.showError = function(error) { // Show error
	$('.main_status').text(error);
};

UI.prototype.addTab = function(type) { // Creates new object and adds new tab
	var obj = new type(this);
	obj.dom = false;
	obj.id = id();
	obj.ui = this;
	var li = $('<li><a href="#">'+obj.caption+'</a></li>');
	this.tabs.push(obj);
	$('.main_tabs_ul').append(li);
	log('Created new tab:', obj.caption, obj.id);
	li.attr('id', 'tab'+obj.id);
	li.find('a').on('click', function() { // Clicked on tab
		this.selectTab(obj.id);
	}.bind(this));
	return obj;
};

UI.prototype.selectTab = function(id) { // Selects tab by ID
	log('selectTab', id);
	$('.main_tabs_ul').find('li.active').removeClass('active');
	for (var i = 0; i < this.tabs.length; i++) { // Search tab by ID
		var tab = this.tabs[i];
		if (tab.id == id) { // Found
			if (!tab.dom) { // UI not created yet
				var dom = tab.createDOM();
				if (!dom) { // No UI
					log('No DOM is created for', tab.caption);
					continue;
				};
				tab.dom = true;
				dom.attr('id', 'body'+tab.id);
				$('.main_body').append(dom);
			};
			$('.main_body').children().hide();
			$('.main_body').find('#body'+tab.id).show();
			$('.main_tabs_ul').find('#tab'+id).addClass('active');
			tab.onShow();
		};
	};
};
