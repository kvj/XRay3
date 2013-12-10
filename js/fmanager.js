var FileProvider = function() { // Abstract class for Drive API
};

FileProvider.prototype.load = function(handler) { // Tries to load API
};

FileProvider.prototype.auth = function(handler) { // Starts auth flow
};

FileProvider.prototype.logout = function(handler) { // Removes token
};

FileProvider.prototype.browse = function(uid, handler) { // Loads list of file/folders
};

FileProvider.prototype.parents = function(uid, handler) { // Load parents for file
};

FileProvider.prototype.download = function(uid, handler) { // Downloads file by ID
};

FileProvider.prototype.upload = function(uid, content, handler) { // Uploads file by ID
};

var ChromeFileProvider = function() { // Chrome version
	this.scope = 'https://www.googleapis.com/drive/v2/';
};
ChromeFileProvider.prototype = new FileProvider();

ChromeFileProvider.prototype.load = function(handler) { // Loads API
	chrome.identity.getAuthToken({interactive: false}, function(token) {
		log('API token?', token);
		handler(null, token);
	}.bind(this));
};

ChromeFileProvider.prototype.auth = function(handler) { // Loads API
	chrome.identity.getAuthToken({interactive: true}, function(token) {
		log('API token?', token);
		if (token) { // Token loaded
			handler(null, token);
		} else {
			handler('No token obtained');
		}
	}.bind(this));
};

ChromeFileProvider.prototype.logout = function(handler) { // Removes token
	var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
             this.token);
    xhr.send();
	chrome.identity.removeCachedAuthToken({
		token: this.token
	}, function() { // Done
		handler(null);
	}.bind(this));
};

ChromeFileProvider.prototype.xhr = function(query, body, handler, config) { // Make API request
	if (!this.token) { // No login
	};
	if (!config) { // Default - empty
		config = {};
	};
	var url = 'https://www.googleapis.com/drive/v2/'+query;
	if (config.absolute) { // No prefix
		url = query;
	};
	var xhr = new XMLHttpRequest();
	if (url.indexOf('?') != -1) { // Query parameters there
		url += '&';
	} else {
		url += '?';
	}
	url += 'access_token='+this.token;
    xhr.open(config.method || (body? 'POST': 'GET'), url);
	// xhr.setRequestHeader('Authorization', 'Bearer '+this.token);
	xhr.addEventListener('load', function(evt) { // Request complete
		if (xhr.status == 401 && config.relogin != false) { // No authorization and it's not prohibited - let's try to relogin
			return chrome.identity.removeCachedAuthToken({
				token: this.token
			}, function() { // Done
				return this.auth(function(token) { // Token refreshed?
					if (token) { // New token
						this.token = token;
					};
					config.relogin = false;
					return this.xhr(query, body, handler, config); // One more try
				}.bind(this));
			}.bind(this));
		};
		if (xhr.status != 200) { // HTTP error
			return handler('HTTP '+xhr.status);
		};
		if (config.rawOutput) { // No parsing
			return handler(null, xhr.response);
		};
		try { // Parse as JSON
			var json = JSON.parse(xhr.response);
			if (json.error) { // Error response
				return handler(json.error.message)
			};
			handler(null, json);
		} catch (e) { // JSON error
			log('JSON error:', e, xhr.response);
			handler('JSON error');
		};
	}.bind(this));
	xhr.addEventListener('error', function(evt) { // Request failed
		log('Request failed:', xhr);
		handler('HTTP error: '+xhr.responseCode);
	}.bind(this));
    xhr.send(body);
};

ChromeFileProvider.prototype.fileInfo = function(uid, handler) { // Loads metadata for file
	this.xhr('files/'+uid, null, handler);
};

ChromeFileProvider.prototype.browse = function(uid, handler) { // Browse files
	var result = [];
	var uids = [];
	if (!uid) { // Root folder
		uid = 'root';
	};
	var nextPage = function(page) { // Loads next piece of data
		this.xhr('files/'+uid+'/children?maxResults=10&pageToken='+page, null, function(err, data) { // List files
			// log('Children:', err, data);
			if (err) { // Failed
				return handler(err);
			};
			for (var i = 0; i < data.items.length; i++) { // Save uids
				uids.push(data.items[i].id);
			};
			if (data.nextPageToken) { // Have next page
				nextPage(data.nextPageToken);
			} else {
				// Load metainfo
				iterateOver(uids, function(id, cb) { // For every item
					this.fileInfo(id, function(err, info) { // Metadata
						if (err) {
							return cb(err);
						};
						if (info.explicitlyTrashed) { // Ignore
							return cb(null, null);
						};
						cb(null, info);
					}.bind(this));
				}.bind(this), function(err, list) { // Folder contents
					if (err) {
						return handler(err);
					};
					var folderMime = 'application/vnd.google-apps.folder';
					var result = [];
					for (var i = 0; i < list.length; i++) { // Convert to simple objects
						result.push({
							id: list[i].id,
							name: list[i].title,
							folder: list[i].mimeType == folderMime
						});
					};
					result.sort(function(a, b) { // Sort - folders first, sort by name
						if (a.folder && !b.folder) { // Folders first
							return -1;
						};
						if (!a.folder && b.folder) { // Folders first
							return 1;
						};
						return a.name.toLowerCase() > b.name.toLowerCase()? 1: -1;
					});
					handler(null, result);
				}.bind(this), {
					threads: 10,
					ignorenull: true
				});
			}
		}.bind(this));
	}.bind(this);
	nextPage('');
};

FileProvider.prototype.parents = function(uid, handler) { // Load parents for file
	if (!uid) { // Root folder
		uid = 'root';
	};
	this.xhr('files/'+uid+'/parents', null, function(err, data) { // List files
		// log('Children:', err, data);
		if (err) { // Failed
			return handler(err);
		};
		var uids = [];
		for (var i = 0; i < data.items.length; i++) { // Save uids
			uids.push(data.items[i].id);
		};
		iterateOver(uids, function(id, cb) { // For every item
			this.fileInfo(id, function(err, info) { // Metadata
				if (err) {
					return cb(err);
				};
				cb(null, info);
			}.bind(this));
		}.bind(this), function(err, list) { // Folder contents
			if (err) {
				return handler(err);
			};
			var result = [];
			log('Parents:', list);
			for (var i = 0; i < list.length; i++) { // Convert to simple objects
				result.push({
					id: list[i].id,
					name: list[i].title
				});
			};
			handler(null, result);
		}.bind(this), {
			threads: 5,
			ignorenull: true
		});
	}.bind(this));
};

ChromeFileProvider.prototype.upload = function(uid, content, handler) { // Uploads file by ID
	this.xhr('https://www.googleapis.com/upload/drive/v2/files/'+uid+'?uploadType=media', content, function(err, data) { // Uploaded
		log('Upload done:', err, data);
		handler(err, data);
	}.bind(this), {
		absolute: true,
		method: 'PUT'
	});
};

ChromeFileProvider.prototype.download = function(uid, handler) { // Downloads file by ID
	this.fileInfo(uid, function(err, info) { // Metadata
		if (err) { // Failed
			return handler(err);
		};
		this.xhr(info.downloadUrl, null, handler, {
			absolute: true,
			rawOutput: true
		});
	}.bind(this));
};

var FileManagerTab = function() { // Provides file manager tab
	this.caption = 'Sources';
	this.api = new ChromeFileProvider();
	this.api.load(function(err, token) { // API load done
		if (!err) { // Loaded
			this.updateStatus(token);
		};
	}.bind(this));
};
FileManagerTab.prototype = new TabProvider();

FileManagerTab.prototype.onShow = function() { // Relaod groups
	this.reloadGroups();
};

FileManagerTab.prototype.updateStatus = function(token) { // Updates right caption
	var p = $('.main_auth').empty();
	if (!token) { // No token - need new one
		$('<a href="#" class="navbar-link">Login...</a>').appendTo(p).on('click', function() { // Start auth flow
			this.api.auth(function(err, token) { // Auth done
				if (err) { // 
					log('Error:', err);
				} else {
					this.updateStatus(token);
				}
			}.bind(this));
		}.bind(this));
	} else {
		// Token is there
		this.api.token = token;
		log('Token is there', token);
		$('<a href="#" class="navbar-link">Logout</a>').appendTo(p).on('click', function() { // Start auth flow
			this.api.logout(function(err) { // Logout done
				delete this.api.token;
				this.updateStatus(null);
			}.bind(this));
		}.bind(this));
	}
};

FileManagerTab.prototype.createDOM = function() {
	var dom = $('<div class="tab_body"><div class="fmanager_left"><div class="fmanager_groups"><div class="fmanager_groups_toolbar btn-toolbar"><button class="btn btn-success btn-sm fmanager_new_group">New group</button></div><div class="fmanager_groups_list"></div></div><div class="fmanager_browser"><div class="fmanager_load well well-sm"><div class="progress progress-striped active"><div class="progress-bar" role="progressbar" style="width: 100%"></div></div></div><ol class="breadcrumb fmanager_path"></ol><div class="fmanager_browser_files"><ul class="nav nav-pills nav-stacked fmanager_browser_files_list"></ul></div></div></div><div class="fmanager_right"></div></div>');
	dom.find('.fmanager_new_group').on('click', function() { // New group
		// log('Add new collection:', this.ui.data);
		this.ui.data.newCollection('Untitled', function(err) { // Added
			if (err) { // Error
				this.ui.showError(err);
				return;
			};
			this.reloadGroups();
		}.bind(this));
	}.bind(this));
	this.div = dom;
	return dom;
};

FileManagerTab.prototype.browserVisible = function(visible) { // set browser visibility
	if (visible) { // Show
		$('.fmanager_left').addClass('fmanager_browser_visible');
	} else { // Hide
		$('.fmanager_left').removeClass('fmanager_browser_visible');
	};
};

FileManagerTab.prototype.convertSpecialChars = function(str) { // Replaces all \... with supported char sequences
	var pattern = new String(str);
	var reg = /\\([a-z])/;
	var m = pattern.match(reg);
	for (var m = pattern.match(reg); m; m = pattern.match(reg)) {
		var repl = '';
		if (m[1] == 'n') { // New line
			repl = '\n';
		};
		if (m[1] == 't') { // Tab char
			repl = '\t';
		};
		pattern = pattern.replace(m[0], repl);
	};
	return pattern; // All special chars replaced
};

FileManagerTab.prototype.injectValues = function(str, items) { // Replaces {1} with array values
	var pattern = new String(str);
	var reg = /\{([1-9])\}/;
	var m = pattern.match(reg);
	for (var m = pattern.match(reg); m; m = pattern.match(reg)) {
		var repl = '';
		var idx = parseInt(m[1]) || 1;
		if (idx<=items.length && idx>0) { // Have value
			repl = items[idx-1];
		};
		pattern = pattern.replace(m[0], repl);
	};
	return pattern; // All data injected
};

FileManagerTab.prototype.processFiles = function(group, files, handler) { // Downloads, updates and parses files
	iterateOver(files, function(item, cb) { // Process file
		this.api.download(item.uid, function(err, content) { // Downloaded
			if (err) { // Failed
				return cb(err);
			};
			this.ui.data.listWords(item.id, function(err, words) { // All current words
				var addContent = '';
				for (var i = 0; i < words.length; i++) { // Look for words with pending = true
					var word = words[i];
					if (!word.pending) { // Original word
						continue;
					};
					// Pending word
					var newContent = this.convertSpecialChars(group.add_pattern || '');
					newContent = this.injectValues(newContent, word.items);
					if ($.trim(newContent)) { // Have data
						addContent += newContent;
					};
				};
				// log('Process files:', item.name, addContent, content);
				if (addContent) { // Have to upload first
					content += addContent
					this.api.upload(item.uid, content, function(err) { // Uploaded
						if (err) { // Failed to upload
							return cb(err); // Stop parsing
						};
						this.ui.data.parse(item.id, group.pattern, content, cb);
					}.bind(this));
				} else { // No new content - just parse
					this.ui.data.parse(item.id, group.pattern, content, cb);
				};
			}.bind(this));
		}.bind(this));
	}.bind(this), function(err) { // All refreshes done
		handler(err);
	}.bind(this));
};

FileManagerTab.prototype.reloadGroups = function() { // Reload groups
	var div = this.div.find('.fmanager_groups_list');
	this.ui.data.listCollections(function(err, list) { // List of collections
		log('Collections:', err, list);
		if (err) { // Failed
			return this.ui.showError(err);
		};
		div.empty();
		for (var i = 0; i < list.length; i++) { // Create panels
			var item = list[i];
			var panel = $('<div class="panel panel-default"><div class="panel-heading"><span class="group_title"></span><div class="pull-right btn-group"><button class="btn btn-primary btn-xs group_config"><span class="glyphicon glyphicon-wrench"></span></button><button class="btn btn-xs btn-primary group_refresh"><span class="glyphicon glyphicon-refresh"></span></button><button class="btn btn-xs btn-primary group_file_add"><span class="glyphicon glyphicon-plus"></span></button></div></div><div class="panel-body"><ul class="nav nav-pills nav-stacked group_files"><ul></div></div>');
			div.append(panel);
			panel.find('.group_title').text(item.name);
			var processGroup = function(panel, item) { // Handlers
				panel.find('.group_config').on('click', function() { // editGroup
					this.editGroup(item);
				}.bind(this));
				panel.find('.group_file_add').on('click', function() { // editGroup
					this.browserVisible(true);
					this.refreshBrowser(null, function(file) { // Selected file
						log('File selected:', file);
						this.browserVisible(false);
						this.ui.data.newFile({
							uid: file.id,
							name: file.name,
							collection_id: item.id
						}, function(err, item) { // Added file
							if (err) { // Failed
								return this.ui.showError(err);
							};
							this.reloadGroups();
						}.bind(this));
					}.bind(this));
				}.bind(this));
				this.ui.data.listFiles(item.id, function(err, list) { // List of files
					// log('Loaded files:', err, list);
					if (err) { // Failed
						return this.ui.showError(err);
					};
					panel.find('.group_refresh').on('click', function() { // parse files
						this.processFiles(item, list, function(err) { // When refresh done
							if (err) { // Failed
								return this.ui.showError(err);
							};
							this.reloadGroups();
						}.bind(this));
					}.bind(this));
					var ul = panel.find('.group_files');
					var onItem = function(li, file) {
						var refreshCount = function() { // Refreshes counter
							this.ui.data.listWords(file.id, function(err, items) { // Words loaded
								if (!err) { // Loaded
									var total = items.length;
									var pending = 0;
									for (var i = 0; i < items.length; i++) { // Search for pending
										if (items[i].pending) { // Found
											pending++;
										};
									};
									li.find('.fmanager_file_words').text(''+items.length+(pending>0 ? '/'+pending: ''));
									// log('refreshCount', file, items.length, pending);
								};
							}.bind(this));
						}.bind(this);
						var addWord = function(word) { // Called from drop handler. Add to DB
							this.ui.data.addWord(word, file.id, function(err) { // Add word
								if (err) { // Failed
									return this.ui.showError(err);
								};
								this.ui.data.fromScratchpad(word);
								this.ui.refreshScratchpad();
								refreshCount();
							}.bind(this))
						}.bind(this);
						li.on('dragover', function(evt) { // Allow words drag
							// log('dragover', evt.originalEvent.dataTransfer.types.indexOf('Word'));
							evt.preventDefault();
						}.bind(this)).on('drop', function(evt) { // Drop - save
							var orig = evt.originalEvent.dataTransfer.getData('Text');
							var word = JSON.parse(evt.originalEvent.dataTransfer.getData('Word'));
							log('Dropped:', orig, word);
							addWord(word);
							evt.preventDefault();
						}.bind(this));
						li.find('.fmanager_file_name').text(file.name);
						li.find('.group_file_remove').on('click', function() { // Remove file
							this.ui.data.deleteFile(file.id, function(err) { // Removed
								if (err) { // Failed
									return this.ui.showError(err);
								};
								this.reloadGroups();
							}.bind(this));
						}.bind(this));
						li.find('.fmanager_file_selected').attr('checked', file.selected? true: false).on('change', function() { // Remove file
							file.selected = li.find('.fmanager_file_selected').is(':checked');
							log('Value:', file.selected);
							this.ui.data.updateFile(file, function(err) { // Updated
								if (err) { // Show error
									return this.ui.showError(err); // Failed to update
								};
							}.bind(this));
						}.bind(this));
						refreshCount();
					}.bind(this);
					for (var j = 0; j < list.length; j++) { // Show files
						var li = $('<li class="fmanager_file_item"><input type="checkbox" class="input fmanager_file_selected" value="on"/><span class="glyphicon glyphicon-file"></span><span class="fmanager_file_name"></span><span class="badge fmanager_file_words">?</span><div class="pull-right btn-group"><button class="btn btn-primary btn-xs group_file_remove"><span class="glyphicon glyphicon-trash"></span></button></div></li>');
						onItem(li, list[j]);
						ul.append(li);
					};
				}.bind(this));
			}.bind(this);
			processGroup(panel, item);
		};
	}.bind(this));
};

FileManagerTab.prototype.editGroup = function(group) { // Shows dialog and saves result
	var div = $('<div class="panel panel-default group_edit_form"><div class="panel-heading">Collection properties:</div><div class="panel-body"><form role="form"><div class="form-group"><label for="group_name">Name:</label><input type="text" class="form-control" id="group_name"/></div><div class="form-group"><label for="group_pattern">Parse pattern:</label><input type="text" class="form-control" id="group_pattern"/></div><div class="form-group"><label for="group_add_pattern">New item pattern:</label><input type="text" class="form-control" id="group_add_pattern"/></div><button type="submit" class="btn btn-default group_do_save">Save</button> <button type="submit" class="btn btn-danger group_do_cancel">Cancel</button></form></div></div>');
	this.div.find('.fmanager_right').append(div);
	div.find('#group_name').val(group.name);
	div.find('#group_pattern').val(group.pattern || '');
	div.find('#group_add_pattern').val(group.add_pattern || '');
	div.find('.group_do_cancel').on('click', function() { // Just remove
		div.remove();
		return false;
	});
	div.find('.group_do_save').on('click', function() { // Just remove
		group.name = div.find('#group_name').val() || 'Untitled';
		group.pattern = div.find('#group_pattern').val() || '';
		group.add_pattern = div.find('#group_add_pattern').val() || '';
		this.ui.data.updateCollection(group, function(err) { // 
			if (err) { // Report error
				return this.ui.showError(err);
			};
			div.remove();
			this.reloadGroups();
		}.bind(this));
		return false;
	}.bind(this));
};

FileManagerTab.prototype.refreshBrowser = function(parentUID, handler) { // Refreshes browser
	var div = this.div.find('.fmanager_browser_files_list').empty();
	var bcrumbs = this.div.find('.fmanager_path').empty();
	var progress = this.div.find('.fmanager_load');
	progress.addClass('fmanager_load_show');
	this.api.browse(parentUID, function(err, data) { // Folders and files
		log('Files:', err, data);
		if (err) {
			return this.ui.showError();
		};
		var onItem = function(item, li) { // One item handler
			li.on('click', function() { // Clicked
				if (item.folder) { // Load
					this.refreshBrowser(item.id, handler);
				} else {
					handler(item);
				}
			}.bind(this));
		}.bind(this);
		for (var i = 0; i < data.length; i++) { // Render
			var li = $('<li class="fmanager_file_item"><span class="glyphicon"></span><span class="fmanager_file_name"></span></li>');
			li.find('.fmanager_file_name').text(data[i].name);
			li.find('.glyphicon').addClass('glyphicon-'+(data[i].folder? 'folder-close': 'file'));
			div.append(li);
			onItem(data[i], li);
		};
		this.api.parents(parentUID, function(err, list) { // Parents loaded
			if (err) {
				return this.ui.showError();
			};
			if (list.length == 0) { // Root
				list.push({
					id: 'root',
					name: 'Root'
				});
			};
			var onItem = function(li, item) { // Item handler
				li.find('a').text(item.name).on('click', function() { // Browser
					this.refreshBrowser(item.id, handler);
				}.bind(this));
			}.bind(this);
			for (var i = 0; i < list.length; i++) { // Add path
				var li = $('<li><a href="#"></a></li>');
				onItem(li, list[i]);
				bcrumbs.append(li);
			};
			progress.removeClass('fmanager_load_show');
		}.bind(this));
	}.bind(this));
};
