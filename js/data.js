var LocalSettingsProvider = function() { // Local storage API
};

LocalSettingsProvider.prototype.get = function(defObject, handler) { // Returns value by name
};

LocalSettingsProvider.prototype.set = function(valuesObj, handler) { // Sets value by name
};

var ChromeSettingsProvider = function() { // Chrome impl.
};

ChromeSettingsProvider.prototype.get = function(defObject, handler) { // Returns values by names
	chrome.storage.local.get(defObject, function(items) { // When done
		if (items) { // No error
			return handler(null, items);
		} else { // Error
			return handler('Storage error');
		};
	}.bind(this));
};

ChromeSettingsProvider.prototype.set = function(valuesObj, handler) { // Sets values by names
	chrome.storage.local.set(valuesObj, function(items) { // When done
		if (!handler) { // No one cares
			return;
		};
		if (items) { // No error
			return handler(null, items);
		} else { // Error
			return handler('Storage error');
		};
	}.bind(this));
};

var DataProvider = function() { // Extends IndexedDB
	this.parseWorker = new Worker('js/workers/file_parse.js');
	this.textWorker = new Worker('js/workers/text_parse.js');
	this.scratchpad = [];
	this.storage = new ChromeSettingsProvider();
};
DataProvider.prototype = new IndexedDB();

DataProvider.prototype.init = function(handler) { // Opens DB
	this.open('data', 1, function(err) { // Open done
		if (err) { // Failed
			log('Open failed');
			handler(err.message);
		} else { // Opened
			handler();
		};
	}.bind(this));
};

DataProvider.prototype.upgrade = function(db, t, version) { // Create stores, indexes, etc
	switch(version) {
		case 1: // Init version
			var collections = db.createObjectStore('collections', {keyPath: 'id'});
			collections.createIndex('name', 'name');
			var files = db.createObjectStore('files', {keyPath: 'id'});
			files.createIndex('collection_id', 'collection_id');
			files.createIndex('name', 'name');
			files.createIndex('uid', 'uid');
			var words = db.createObjectStore('words', {keyPath: 'id'});
			words.createIndex('file_id', 'file_id');
			break;
	}
};

DataProvider.prototype.list = function(req, handler) {
	var result = [];
	this.execRequest(req, function (err, cursor) {
		if (err) {
			return handler(err);
		};
		if (cursor) {
			result.push(cursor.value || cursor);
			if (cursor.continue) {
				return cursor.continue();
			};
		};
		handler(null, result);
	});
};

DataProvider.prototype.newCollection = function(name, handler) { // Creates new collection
	var t = this.update('collections');
	var obj = {
		id: id(),
		name: name
	};
	this.execTransaction(t, function(err) { // Add done
		handler(err, obj);
	}.bind(this));
	try { // Execute insert
		t.objectStore('collections').add(obj);
	} catch (e) { // DB error
		this.cancelTransaction(t);
		handler('DB error');
	};
};

DataProvider.prototype.newFile = function(obj, handler) { // Creates new collection
	var t = this.update('files');
	obj.id = id();
	this.execTransaction(t, function(err) { // Add done
		handler(err, obj);
	}.bind(this));
	try { // Execute insert
		t.objectStore('files').add(obj);
	} catch (e) { // DB error
		this.cancelTransaction(t);
		handler('DB error');
	};
};

DataProvider.prototype.updateFile = function(obj, handler) { // Creates new collection
	var t = this.update('files');
	this.execTransaction(t, function(err) { // Add done
		handler(err, obj);
	}.bind(this));
	try { // Execute insert
		t.objectStore('files').put(obj);
	} catch (e) { // DB error
		this.cancelTransaction(t);
		handler('DB error');
	};
};

DataProvider.prototype.updateCollection = function(object, handler) { // Saves collection configuration
	var t = this.update('collections');
	this.execTransaction(t, function(err) { // Add done
		handler(err, object);
	}.bind(this));
	try { // Execute insert
		t.objectStore('collections').put(object);
	} catch (e) { // DB error
		this.cancelTransaction(t);
		handler('DB error');
	};
};

DataProvider.prototype.listCollections = function(handler) { // Fetches all collections
	var t = this.fetch('collections');
	return this.list(t.objectStore('collections').openCursor(), handler);
};

DataProvider.prototype.listFiles = function(collectionID, handler) { // Fetches all collections
	var t = this.fetch('files');
	return this.list(t.objectStore('files').index('collection_id').openCursor(IDBKeyRange.only(collectionID)), handler);
};

DataProvider.prototype.listSelectedWords = function(handler) { // Returns all selected words, including scratchpad
	var t = this.fetch('files', 'words');
	this.list(t.objectStore('files').openCursor(), function(err, files) { // All files
		if (err) { // Failed
			return handler(err); // Break
		};
		var arr = [];
		for (var i = 0; i < files.length; i++) { // Only need selected files
			if (files[i].selected) { // Our case
				arr.push(files[i].id); // Only need ID to get all words
			};
		};
		var result = [];
		iterateOver(arr, function(id, cb) { // For every fileID
			this.listWords(id, function(err, list) { // All words
				if (err) { // Failed
					return cb(err);
				};
				for (var i = 0; i < list.length; i++) { // Copy to result
					result.push(list[i]);
				};
				cb(null);
			}.bind(this))
		}.bind(this), function(err) { // All done
			if (err) { // Failed
				return handler(err); // Stop
			};
			for (var i = 0; i < this.scratchpad.length; i++) { // Finally all words from scratchpad
				result.push(this.scratchpad[i]);
			};
			handler(null, result);
		}.bind(this));
	}.bind(this));
};

var iterateOver = function (array, handler, cb, config) {
	if (!config) { // Create empty
		config = {};
	};
	if (array.length == 0) { // No items
		return cb? cb(null, []): null;
	};
	var maxThreads = config.threads || 1;
	var threads = 0; // Number of threads active
	var result = []; // Results here
	var active = true; // When error happens, stop reporting
	var started = 0; // Number of threads started
	var results = 0; // Number of callbacks received
	var start = function() { // Starts new threads, if possible
		while (threads<maxThreads && started<array.length) { // Start new thread
			threads++;
			started++;
			onItem(started-1);
		};
	};
	var onItem = function (index) {
		var item = array[index];
		handler(item, function (err, res) {
			threads--;
			if (err) {
				active = false;
				return cb? cb(err, item, index): null;
			};
			results++;
			if (!config.ignorenull) { // All results with order
				result[index] = res;
			} else {
				if (null != res) { // Only not nulls without order
					result.push(res);
				};
			}
			if (results >= array.length) { // All results received
				return cb? cb(null, result): null;
			};
			start();
		}, index);
	};
	start();
};

DataProvider.prototype.addWord = function(word, fileID, handler) { // Adds new word (will be uploaded later)
	word.id = id();
	word.file_id = fileID;
	word.pending = true;
	var t = this.update('words');
	this.execTransaction(t, handler);
	try { // Execute insert
		t.objectStore('words').put(word);
	} catch (e) { // DB error
		this.cancelTransaction(t);
		handler('DB error');
	};
};

DataProvider.prototype.replaceWords = function(fileID, words, handler) { // Removes old and adds new files
	var t = this.update('words');
	this.execTransaction(t, function(err) { // Add done
		if (!err) { // Done - send message to Worker
			this.manageWords({command: 'delete', fileID: fileID});
			if (words.length>0) { // Also have new words
				this.manageWords({command: 'add'}, words);
			};
		};
		handler(err, words);
	}.bind(this));
	var store = t.objectStore('words');
	var wordsRemoved = 0;
	this.execRequest(store.index('file_id').openCursor(IDBKeyRange.only(fileID)), function(err, cursor) { // Opened
		if (err) {
			return handler(err);
		};
		if (cursor) {
			cursor.delete();
			wordsRemoved++;
			if (cursor.continue) {
				return cursor.continue();
			};
		};
		log('replaceWords', fileID, wordsRemoved, words.length);
		for (var i = 0; i < words.length; i++) { // Save words
			var w = words[i];
			w.id = id();
			w.file_id = fileID;
			store.put(w);
		};
	}.bind(this));
};

DataProvider.prototype.parse = function(fileID, pattern, content, handler) { // Parses file
	var messageHandler = function(evt) { // Parse done
		// log('Parsing done:', evt.data, fileID);
		this.parseWorker.removeEventListener('message', messageHandler);
		this.replaceWords(fileID, evt.data.items, handler);
	}.bind(this);
	this.parseWorker.addEventListener('message', messageHandler);
	this.parseWorker.postMessage({
		content: content,
		pattern: pattern
	});
};

DataProvider.prototype.deleteFile = function(id, handler) { // Saves collection configuration
	this.replaceWords(id, [], function(err) { // Replaced
		if (err) { // Failed
			return handler(err);
		};
		var t = this.update('files');
		this.execTransaction(t, function(err) { // Add done
			handler(err);
		}.bind(this));
		try { // Execute insert
			t.objectStore('files').delete(id);
		} catch (e) { // DB error
			this.cancelTransaction(t);
			handler('DB error');
		};
	}.bind(this));
};

DataProvider.prototype.listWords = function(fileID, handler) { // Fetches all collections
	var t = this.fetch('words');
	return this.list(t.objectStore('words').index('file_id').openCursor(IDBKeyRange.only(fileID)), handler);
};

DataProvider.prototype.reloadWords = function(handler) { // Reload all words
	return this.list(this.fetch('words').objectStore('words').openCursor(), function(err, list) { // Loaded
		if (err) { // Failed
			return handler(err);
		};
		this.manageWords({command: 'delete'});
		if (list.length>0) { // Also have new words
			this.manageWords({command: 'add'}, list);
		};
		this.manageWords({command: 'add'}, this.scratchpad);
		handler(err, list);
	}.bind(this));
};

DataProvider.prototype.addProcessResultHandler = function(handler) { // Adds Worker listener
	this.textWorker.addEventListener('message', handler);
};

DataProvider.prototype.manageWords = function(command, words) { // Sends words management command to Worker
	this.textWorker.postMessage({
		command: command,
		words: words
	});
};

DataProvider.prototype.processText = function(lines) { // Sends text to parse to Worker
	this.textWorker.postMessage({
		command: {command: 'process'},
		lines: lines
	});
};

DataProvider.prototype.toScratchpad = function(word) {
	this.scratchpad.push(word);
	this.manageWords({command: 'add'}, [word]);
};

DataProvider.prototype.fromScratchpad = function(word) { // Remove word from scratchpad
	for (var i = 0; i < this.scratchpad.length; i++) { // Search by original
		var item = this.scratchpad[i];
		if (item.items[0] == word.items[0]) { // Found
			this.scratchpad.splice(i, 1);
			i--;
		};
	};
};
