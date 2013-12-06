var TranslateTab = function() { // Provides translate tab
	this.caption = 'Translate';
};

TranslateTab.prototype = new TabProvider();

TranslateTab.prototype.createDOM = function() {
	this.ui.data.addProcessResultHandler(function(evt) { // Word translated
		this.onWordTranslated(evt.data.line, evt.data.position, evt.data.word);
	}.bind(this));
	var dom = $('<div class="tab_body"><div class="translate_left"><div class="btn-toolbar" role="toolbar"><div class="translate_toolbar btn-group"><button type="button" class="btn btn-primary translate_tool_enter">New text...</button></div><div class="btn-group"><button type="button" class="btn btn-default translate_tool_to_right">Translate...</button></div></div><div class="translate_text"></div><div class="translate_area_panel panel panel-default"><div class="panel-heading">Enter text here</div><div class="panel-body"><textarea class="form-control translate_area_textarea" rows="3"></textarea><div class="btn-group translate_area_buttons"><button type="button" class="btn btn-default translate_do_process">Process</button><button type="button" class="btn btn-default translate_do_cancel">Cancel</button></div></div></div></div><div class="translate_right"><div class="translate_form"><form role="form"><div class="form-group"><label for="translate_form_original">Original</label><div class="input-group"><input type="text" class="form-control" id="translate_form_original"/><span class="input-group-btn"><button class="btn btn-default translate_do_translate" type="button">Translate</button></span></div></div><div class="form-group"><label for="translate_form_transcript">Transciption</label><input type="text" class="form-control input-sm" id="translate_form_transcript"/></div><div class="form-group"><label for="translate_form_translate">Translation</label><input type="text" class="form-control input-sm" id="translate_form_translate"/></div><div><button type="button" class="btn btn-success translate_tool_save">Scratchpad</button></div></form></div></div></div>');
	this.div = dom;
	dom.find('.translate_do_cancel').on('click', function() { // Hide panel
		this.toggleAreaPanel(false);
	}.bind(this));
	dom.find('.translate_do_process').on('click', function() { // Hide panel and start translate
		this.toggleAreaPanel(false);
		this.startProcessing(this.div.find('.translate_area_textarea').val());
	}.bind(this));
	dom.find('.translate_tool_enter').on('click', function() { // Show panel
		this.toggleAreaPanel(true);
	}.bind(this));
	dom.find('.translate_text').on('dragover', function(evt) { // Show panel
		evt.preventDefault();
	}.bind(this)).on('drop', function(evt) {
		evt.preventDefault();
		var text = evt.originalEvent.dataTransfer.getData("Text");
		this.startProcessing(text);
	}.bind(this));
	dom.find('.translate_tool_to_right').on('click', function() {
		var range = window.getSelection();
		var text = $.trim(range.toString());
		if (text) {
			dom.find('#translate_form_original').val(text);
			dom.find('#translate_form_transcript').val('');
			dom.find('#translate_form_translate').val('');
		};
	});
	dom.find('.translate_tool_save').on('click', function() {
		var orig = $.trim(dom.find('#translate_form_original').val());
		if (!orig) {
			this.ui.showError('Original is empty');
		};
		var word = {
			items: [orig]
		};
		var val = $.trim(dom.find('#translate_form_transcript').val());
		if (val) {
			word.items.push(val);
		}
		val = $.trim(dom.find('#translate_form_translate').val());
		if (val) {
			word.items.push(val);
		}
		this.toScratchpad(word);
		dom.find('#translate_form_original').val('');
		dom.find('#translate_form_transcript').val('');
		dom.find('#translate_form_translate').val('');
	}.bind(this));
	dom.find('.translate_do_translate').on('click', function() { // Translate original
		var orig = $.trim(dom.find('#translate_form_original').val());
		if (!orig) {
			return this.ui.showError('Original is empty');
		};
		this.ui.data.storage.get({translate_from: 'en', translate_to: 'en'}, function(err, data) { // Settings came
			if (err) { // Failed
				return this.ui.showError(err);
			};
			dom.find('#translate_form_transcript').val('');
			dom.find('#translate_form_translate').val('');
			window.open('http://translate.google.com/#'+data.translate_from+'/'+data.translate_to+'/'+encodeURIComponent(orig), 'xray3_translate');
		}.bind(this));
	}.bind(this));
	return dom;
};

TranslateTab.prototype.toggleAreaPanel = function(visible) { // Toggles visibility of area panel
	var panel = this.div.find('.translate_area_panel');
	if (visible) { // Show panel and focus
		panel.addClass('translate_area_panel_visible');
		panel.find('.translate_area_textarea').val('').focus().select();
	} else {
		panel.removeClass('translate_area_panel_visible');
	}
};

TranslateTab.prototype.toScratchpad = function(word) {
	this.ui.data.toScratchpad(word);
	this.ui.refreshScratchpad();
	if (this.text) { // Refresh text
		this.startProcessing(this.text);
	};
};

TranslateTab.prototype.onWordTranslated = function(line, pos, word) { // When word is translated
	if (!this.lines || this.lines.length<=line) { // Out of bounds
		return false;
	};
	var div = this.div.find('.translate_text');
	var lineDiv = div.children().eq(line);
	// log('Show word:', line, pos, word, lineDiv.children().size());
	var index = 0;
	lineDiv.children().each(function(i, el) { // Search for the place
		var charsInWord = $(el).data('chars') || 0;
		if (charsInWord>0) { // Word already - skip
			index += charsInWord;
		} else {
			if (index == pos) { // We found it
				var chars = word.items[0].length;
				var div = $('<div class="word"><div class="word_transcript"></div><div class="word_original"></div></div>');
				div.data('chars', chars);
				div.find('.word_original').text(word.items[0]);
				div.attr('title', word.items[word.items.length-1]);
				if (word.items.length>2) { // Have transcription
					div.find('.word_transcript').text(word.items[1]);
				};
				div.insertBefore(el);
				for (var j = 0; j < chars; j++) { // Remove single chars
					lineDiv.children().eq(i+1).remove();
				};
				div.tooltip({
					placement: 'auto bottom',
					container: 'body'
				});
				return false;
			};
			index++;
		}
		if (index>pos) { // Out of bounds
			return false;
		};
	});
};

TranslateTab.prototype.startProcessing = function(text) { // Displays text and starts processing
	var div = this.div.find('.translate_text').empty();
	var lines = text.split('\n');
	var outLines = [];
	for (var i = 0; i < lines.length; i++) { // Process lines one by one
		var line = $.trim(lines[i]);
		if (!line) { // Skip
			continue;
		};
		var lineDiv = $('<div class="translate_text_line"></div>');
		div.append(lineDiv);
		outLines.push(line);
		for (var j = 0; j < line.length; j++) { // Add chars
			var charDiv = $('<span class="translate_text_char"></span>');
			charDiv.text(line.charAt(j));
			lineDiv.append(charDiv);
		};
	};
	this.text = text;
	this.lines = outLines;
	this.ui.data.processText(outLines);
};

TranslateTab.prototype.onShow = function() { // Reload words?
	this.ui.data.reloadWords(function(err) { // Loaded
		if (err) { // Failed
			return this.ui.showError(err);
		};
		this.ui.refreshScratchpad();
	}.bind(this));
};
