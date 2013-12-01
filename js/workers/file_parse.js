var parse = function(data, rexp) { // Parses file and sends data back as array
	console.log('Parse: '+data.length+' '+rexp);
	var patt = new RegExp(rexp);
	var lines = data.split('\n');
	var result = [];
	for (var i = 0; i < lines.length; i++) { // For every line
		var m = lines[i].trim().match(patt);
		if (!m) { // Not found
			continue;
		};
		m.splice(0, 1);
		result.push({
			items: m
		});
	};
	postMessage({
		items: result
	});
};

onmessage = function (evt) {
	parse(evt.data.content, evt.data.pattern);
};

