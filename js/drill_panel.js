var DrillPanelTab = function() { // Provides file manager tab
	this.caption = 'Drill';
	this.timeoutID = null;
	this.config = {
		timeout: 5, 
		visible_0: true, 
		visible_1: true, 
		visible_2: true, 
		size_0: 20, 
		size_1: 20, 
		size_2: 20
	};
};
DrillPanelTab.prototype = new TabProvider();

DrillPanelTab.prototype.onShow = function() { // Relaod groups
	this.words = [];
	this.ui.data.listSelectedWords(function(err, list) { // All words to show
		if (err) { // Failed
			return this.ui.showError(err); // Show error and stop
		};
		this.words = list;
		log('Words to show:', list.length);
		this.applyStyle();
		this.nextWord();
	}.bind(this));
};

DrillPanelTab.prototype.saveConfig = function() { // Save new configuration
	this.ui.data.storage.set(this.config);
};

DrillPanelTab.prototype.createDOM = function() {
	var dom = $('<div class="tab_body"><div class="drill_panel_left"><div class="drill_panel_top_buttons"><button type="button" class="btn btn-success drill_do_window">Open in new window</button></div><div class="drill_panel_wrap"><div class="drill_line_0 drill_line"></div><div class="drill_line_1 drill_line"></div><div class="drill_line_2 drill_line"></div></div></div><div class="drill_panel_right"><form role="form" id="drill_panel_right"></form></div></div>');
	this.div = dom;
	var captions = ['Original:', 'Transcription:', 'Translation:'];
	var createLineConfigUI = function(index) { // Creates line config buttons
		var line = $('<div class="form-group"><label class="drill_line_title"></label><div class="btn-toolbar drill_config_line" role="toolbar"><button type="button" class="btn btn-default drill_line_size_up">+1</button><div class="drill_line_size"></div><button type="button" class="btn btn-default drill_line_size_down">-1</button><button type="button" class="btn btn-default drill_line_visible_button"></button></div></div>');
		this.div.find('#drill_panel_right').append(line);
		line.find('.drill_line_title').text(captions[index]);
		line.find('.drill_line_size_up').on('click', function() { // Size up
			this.config['size_'+index]+=2;
			this.saveConfig();
			showLineSize();
			this.applyStyle();
		}.bind(this));
		line.find('.drill_line_size_down').on('click', function() { // Size up
			if (this.config['size_'+index]<5) { // Too small
				return;
			};
			this.config['size_'+index]-=2;
			this.saveConfig();
			showLineSize();
			this.applyStyle();
		}.bind(this));
		var showLineSize = function() { // Shows current size
			line.find('.drill_line_size').text(''+this.config['size_'+index]);
		}.bind(this);
		var showVisibility = function() { // Shows visibility state
			var btn = line.find('.drill_line_visible_button');
			if (this.config['visible_'+index]) { // Visible
				btn.removeClass('btn-danger').addClass('btn-info').text('On');
			} else { // Hidden
				btn.addClass('btn-danger').removeClass('btn-info').text('Off');
			};
		}.bind(this);
		line.find('.drill_line_visible_button').on('click', function() { // 
			this.config['visible_'+index] = !this.config['visible_'+index];
			this.saveConfig();
			this.applyStyle();
			showVisibility();
		}.bind(this));
		showLineSize();
		showVisibility();
	}.bind(this);
	var createTimeoutConfigUI = function() { // Timeout +/-
		var line = $('<div class="form-group"><label class="drill_line_title">Timeout:</label><div class="btn-toolbar drill_config_line" role="toolbar"><button type="button" class="btn btn-default drill_line_size_up">+1</button><div class="drill_line_size"></div><button type="button" class="btn btn-default drill_line_size_down">-1</button></div></div>');
		this.div.find('#drill_panel_right').append(line);
		line.find('.drill_line_size_up').on('click', function() { // Size up
			this.config['timeout']++;
			this.saveConfig();
			showLineSize();
		}.bind(this));
		line.find('.drill_line_size_down').on('click', function() { // Size up
			if (this.config['timeout']<2) { // Too small
				return;
			};
			this.config['timeout']--;
			this.saveConfig();
			showLineSize();
		}.bind(this));
		var showLineSize = function() { // Shows current size
			line.find('.drill_line_size').text(''+this.config['timeout']);
		}.bind(this);
		showLineSize();
	}.bind(this);
	this.ui.data.storage.get(this.config, function(err, newdata) { // Config received
		if (!err) { // OK
			this.config = newdata;
		};
		for (var i = 0; i < 3; i++) { // Only 3 lines
			createLineConfigUI(i);
		};
		createTimeoutConfigUI();
		this.applyStyle();
	}.bind(this));
	dom.find('.drill_do_window').on('click', function() { // Toggle new window
		this.toggleWindow();
	}.bind(this))
	return dom;
};

DrillPanelTab.prototype.toggleWindow = function() { // Shows/hides window
	if (this.popup) { // Close popup
		this.popup.close();
		this.popup = null;
		return;
	};
	this.popup = true;
	chrome.app.window.create('popup.html', {
		id: 'popup',
		alwaysOnTop: true,
		bounds: {
			width: 400,
			height: 300
		},
		minWidth: 300,
		minHeight: 300
	}, function(win) { // Window created
		
		$(window).on('message', function(evt) { // Received message
			var data = evt.originalEvent.data;
			if (data.type == 'popup') { // Received style
				this.popup = win;
				this.applyStyle();
				this.nextWord();
			};
		}.bind(this));
	}.bind(this));
};

DrillPanelTab.prototype.applyStyle = function() { // Applies style according to config
	if (this.popup) { // Send message
		this.popup.contentWindow.postMessage({
			type: 'style',
			style: this.config
		}, '*');
		return;
	};
	var applyToLine = function(index) { // One line handling
		var div = this.div.find('.drill_line_'+index);
		div.css('font-size', ''+(this.config['size_'+index])+'px');
		if (this.config['visible_'+index]) { // Line visible
			div.removeClass('drill_line_hidden');
		} else { // Line hidden
			div.addClass('drill_line_hidden');
		};
	}.bind(this);
	for (var i = 0; i < 3; i++) { // We support 3 lines only
		applyToLine(i);
	};
};

DrillPanelTab.prototype.nextWord = function() { // Show next word
	if (this.timeoutID) { // Have timeout
		clearTimeout(this.timeoutID);
	};
	if (this.words.length == 0) { // No words
		return; // Break;
	};
	var index = Math.floor(Math.random()*this.words.length);
	var fillLine = function(index, word) { // Fills line
		this.div.find('.drill_line_'+index).text(word.items[index] || '');
	}.bind(this);
	this.timeoutID = setTimeout(function() { // next word
		this.nextWord();
	}.bind(this), 1000*this.config.timeout);
	if (this.popup) { // Send message
		this.popup.contentWindow.postMessage({
			type: 'word',
			word: this.words[index]
		}, '*');
		return;
	};
	for (var i = 0; i < 3; i++) { // Fill lines
		fillLine(i, this.words[index]);
	};
};
