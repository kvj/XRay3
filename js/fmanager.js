var FileProvider = function() { // Abstract class for Drive API
};

FileProvider.prototype.load = function(handler) { // Tries to load API
};

FileProvider.prototype.auth = function(handler) { // Starts auth flow
};

FileProvider.prototype.logout = function(handler) { // Removes token
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

FileProvider.prototype.logout = function(handler) { // Removes token
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
		log('Token is there');
		$('<a href="#" class="navbar-link">Logout</a>').appendTo(p).on('click', function() { // Start auth flow
			this.api.logout(function(err) { // Logout done
				delete this.api.token;
				this.updateStatus(null);
			}.bind(this));
		}.bind(this));
	}
};


FileManagerTab.prototype.createDOM = function() {
	var dom = $('<div class="tab_body"><div class="fmanager_left"><div class="fmanager_groups"><div class="fmanager_groups_toolbar btn-toolbar"><button class="btn btn-success btn-sm fmanager_new_group">New group</button></div><div class="fmanager_groups_list"></div></div><div class="fmanager_browser"></div></div><div class="fmanager_right"></div></div>');
	dom.find('.fmanager_new_group').on('click', function() { // New group
		log('Add new collection:', this.ui.data);
		this.ui.data.newCollection('Untitled', function(err) { // Added
			if (err) { // Error
				this.ui.showError(err);
				return;
			};
			this.reloadGroups();
		}.bind(this));
	}.bind(this));
	this.div = dom;
	this.reloadGroups();
	return dom;
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
			var panel = $('<div class="panel panel-default"><div class="panel-heading"><span class="group_title"></span><div class="pull-right btn-group"><button class="btn btn-primary btn-xs group_config"><span class="glyphicon glyphicon-wrench"></span></button><button class="btn btn-xs btn-primary group_refresh"><span class="glyphicon glyphicon-refresh"></span></button><button class="btn btn-xs btn-primary group_file_add"><span class="glyphicon glyphicon-plus"></span></button></div></div><div class="panel-body"></div></div>');
			div.append(panel);
			panel.find('.group_title').text(item.name);
			var processGroup = function(panel, item) { // Handlers
				panel.find('.group_config').on('click', function() { // editGroup
					this.editGroup(item);
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
		div.remove();
		this.reloadGroups();
		return false;
	}.bind(this));
};
