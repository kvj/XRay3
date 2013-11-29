var IndexedDB = function() {
};

IndexedDB.prototype.open = function(name, version, handler, versionHandler) {
	version = version || 1;
	if (!window.indexedDB) {
		log('IndexedDB not supported');
		return handler({message: 'Not supported'});
	};
	var request = window.indexedDB.open(name, version);
	request.onerror = function(evt) {
		log('DB error:', evt);
		handler({message: 'Open error: '+evt.target.errorCode});
	}.bind(this);
	var dbReady = function (db) {
		db.onversionchange = function(evt) {
			log('onversionchange', evt);
			db.close();
			if (versionHandler) {
				versionHandler();
			};
		};
		this.db = db;
		this.name = name;
		request.onerror = null;
		handler();
	}.bind(this);
	var upgrade = function(fromVersion, db, transaction) {
		log('Upgrade from', fromVersion, 'to', version, db.version);
		for (var i = fromVersion+1; i<=version; i++) {
				this.upgrade(db, transaction, i);
		};
	}.bind(this);
	request.onsuccess = function(evt) {
		log('DB opened without problems');
		dbReady(request.result);
	}.bind(this);
	request.onupgradeneeded = function (evt) {
		var db = request.result;
		log('Upgrade needed', evt, version, db.transaction);
		upgrade(evt.oldVersion || 0, db, evt.target.transaction);
	};
	request.onblocked = function (evt) {
		log('DB open blocked', evt);
		handler({message: 'DB blocked'});
	};
};

IndexedDB.prototype.upgrade = function(db, transaction, version) {
	log('Do upgrade for', version);
};

IndexedDB.prototype.delete = function(handler) {
	if (!this.db) {
		// Not opened
		return handler({message: 'Not opened'});
	};
	try {
		this.db.close();
		this.db = null;
	} catch (e) {
		return handler({message: 'Not closed: '+e});
	};
	var request = window.indexedDB.deleteDatabase(this.name);
	request.onblocked = function (evt) {
		log('DB delete blocked', evt);
		handler({message: 'DB blocked'});
	};
	request.onsuccess = function(evt) {
		log('DB deleted:', evt);
		handler();
	}.bind(this);
};

IndexedDB.prototype.transaction = function(stores, type) {
	var arr = [];
	for (var i = 0; i < stores.length; i++) {
		arr.push(stores[i]);
	};
	return this.db.transaction(arr, type);
};

IndexedDB.prototype.fetch = function () {
	// Opens readonly transaction
	return this.transaction(arguments, 'readonly');
};

IndexedDB.prototype.update = function () {
	// Opens readwrite transaction
	return this.transaction(arguments, 'readwrite');
};

IndexedDB.prototype.execRequest = function(request, handler) {
	request.onsuccess = function (e) {
		handler(null, e.target.result);
	};
	request.onerror = function(e) {
		log('execRequest error', e);
		handler({message: 'Error: '+e.target.error.name});
	};
};

IndexedDB.prototype.execTransaction = function(t, handler) {
	t.oncomplete = function (e) {
		handler(null, e.target.result);
	};
	t.onerror = function(e) {
		log('execTransaction error', e);
		handler({message: 'Error: '+e.target.error.name});
	};
};

IndexedDB.prototype.cancelTransaction = function(t) {
	t.oncomplete = t.onerror = null;
};

IndexedDB.prototype.cancelRequest = function(t) {
	t.onsuccess = t.onerror = null;
};
