yepnope({
	load: ['lib/jquery.min.js', 'bstrap/css/bootstrap.min.css', 'bstrap/js/bootstrap.min.js', 'css/main.css', ],
	complete: function() { // Load theme done
		log('About to show UI');
		$(document).ready(function() { // Ready to handle
			handleMessages();
		});
	}
});

var log = function() {
	if (!window.console) { // No console
		return;
	};
	console.log.apply(console, arguments);
};

var handleMessages = function() { // Subscribe to messages
	var dom =$('<div class="drill_panel_wrap"><div class="drill_line_0 drill_line"></div><div class="drill_line_1 drill_line"></div><div class="drill_line_2 drill_line"></div></div>');
	$(document.body).append(dom);
	var applyStyle = function(config) { // Applies style according to config
		var applyToLine = function(index) { // One line handling
			var div = dom.find('.drill_line_'+index);
			div.css('font-size', ''+(config['size_'+index])+'px');
			if (config['visible_'+index]) { // Line visible
				div.removeClass('drill_line_hidden');
			} else { // Line hidden
				div.addClass('drill_line_hidden');
			};
		};
		for (var i = 0; i < 3; i++) { // We support 3 lines only
			applyToLine(i);
		};
	};
	var applyWord = function(word) { // Show word
		var fillLine = function(index, word) { // Fills line
			dom.find('.drill_line_'+index).text(word.items[index] || '');
		}.bind(this);
		for (var i = 0; i < 3; i++) { // Fill lines
			fillLine(i, word);
		};
	};
	$(window).on('message', function(evt) { // Received message
		var data = evt.originalEvent.data;
		if (data.type == 'style') { // Received style
			applyStyle(data.style);
		};
		if (data.type == 'word') { // Received style
			applyWord(data.word);
		};
	});
	window.opener.postMessage({type: 'popup'}, '*');
};

