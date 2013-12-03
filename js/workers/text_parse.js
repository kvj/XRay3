var words = [];

var wordsManagement = function(cmd, array) { // Manage words
	if (cmd.command == 'delete') { // Remove words
		if (!cmd.fileID) { // Remove all
			words = [];
		} else { // Filter by file_id
			for (var i = 0; i < words.length; i++) { // Search words
				if (words[i].file_id == cmd.fileID) { // Found
					words.splice(i, 1);
					i--;
				};
			};
		};
	};
	if (cmd.command == 'add') { // Add all
		for (var i = 0; i < array.length; i++) { // Add
			words.push(array[i]);
		};
	};
	console.log('After: '+cmd.command+', words: '+words.length);
};

var processText = function(lines) { // Processes text
	// console.log('processText: '+lines.length);
	for (var i = 0; i < lines.length; i++) { // For every line
		var line = lines[i];
		for (var j = 0; j < line.length; j++) { // For every char
			var maxLen = 0;
			var wordFound = null;
			for (var k = 0; k < words.length; k++) { // For every word available
				var word = words[k];
				var orig = word.items[0];
				if (line.substr(j, orig.length) == orig) { // Found
					if (orig.length>maxLen) { // Biggest one
						maxLen = orig.length;
						wordFound = word;
					};
				};
			};
			if (wordFound) { // Report to UI
				// console.log('Found word: '+wordFound.items);
				postMessage({
					line: i,
					position: j,
					word: wordFound
				});
				j += maxLen-1; // Skip all found chars (-1)
			};
		};
	};
};

onmessage = function (evt) {
	var command = evt.data.command || {};
	if (command.command == 'process') { // Start text processing
		processText(evt.data.lines || []);
		return;
	};
	wordsManagement(command, evt.data.words || []);
};
