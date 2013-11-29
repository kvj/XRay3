var DataProvider = function() { // Extends IndexedDB
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

DataProvider.prototype.listCollections = function(handler) { // Fetches all collections
	var t = this.fetch('collections');
	return this.list(t.objectStore('collections').openCursor(), handler);
};

