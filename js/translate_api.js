var languages = [
	{code: 'af', name: 'Afrikaans'},
	{code: 'sq', name: 'Albanian'},
	{code: 'ar', name: 'Arabic'},
	{code: 'az', name: 'Azerbaijani'},
	{code: 'eu', name: 'Basque'},
	{code: 'bn', name: 'Bengali'},
	{code: 'be', name: 'Belarusian'},
	{code: 'bg', name: 'Bulgarian'},
	{code: 'ca', name: 'Catalan'},
	{code: 'zh-CN', name: 'Chinese Simplified'},
	{code: 'zh-TW', name: 'Chinese Traditional'},
	{code: 'hr', name: 'Croatian'},
	{code: 'cs', name: 'Czech'},
	{code: 'da', name: 'Danish'},
	{code: 'nl', name: 'Dutch'},
	{code: 'en', name: 'English'},
	{code: 'eo', name: 'Esperanto'},
	{code: 'et', name: 'Estonian'},
	{code: 'tl', name: 'Filipino'},
	{code: 'fi', name: 'Finnish'},
	{code: 'fr', name: 'French'},
	{code: 'gl', name: 'Galician'},
	{code: 'ka', name: 'Georgian'},
	{code: 'de', name: 'German'},
	{code: 'el', name: 'Greek'},
	{code: 'gu', name: 'Gujarati'},
	{code: 'ht', name: 'Haitian Creole'},
	{code: 'iw', name: 'Hebrew'},
	{code: 'hi', name: 'Hindi'},
	{code: 'hu', name: 'Hungarian'},
	{code: 'is', name: 'Icelandic'},
	{code: 'id', name: 'Indonesian'},
	{code: 'ga', name: 'Irish'},
	{code: 'it', name: 'Italian'},
	{code: 'ja', name: 'Japanese'},
	{code: 'kn', name: 'Kannada'},
	{code: 'ko', name: 'Korean'},
	{code: 'la', name: 'Latin'},
	{code: 'lv', name: 'Latvian'},
	{code: 'lt', name: 'Lithuanian'},
	{code: 'mk', name: 'Macedonian'},
	{code: 'ms', name: 'Malay'},
	{code: 'mt', name: 'Maltese'},
	{code: 'no', name: 'Norwegian'},
	{code: 'fa', name: 'Persian'},
	{code: 'pl', name: 'Polish'},
	{code: 'pt', name: 'Portuguese'},
	{code: 'ro', name: 'Romanian'},
	{code: 'ru', name: 'Russian'},
	{code: 'sr', name: 'Serbian'},
	{code: 'sk', name: 'Slovak'},
	{code: 'sl', name: 'Slovenian'},
	{code: 'es', name: 'Spanish'},
	{code: 'sw', name: 'Swahili'},
	{code: 'sv', name: 'Swedish'},
	{code: 'ta', name: 'Tamil'},
	{code: 'te', name: 'Telugu'},
	{code: 'th', name: 'Thai'},
	{code: 'tr', name: 'Turkish'},
	{code: 'uk', name: 'Ukrainian'},
	{code: 'ur', name: 'Urdu'},
	{code: 'vi', name: 'Vietnamese'},
	{code: 'cy', name: 'Welsh'},
	{code: 'yi', name: 'Yiddish'}
];

var TranslateSettingsUI = function(ui) { // Binds settings UI to toolbar
	this.ui = ui;
	$('.main_translate_options').popover({
		html: true,
		placement: 'bottom',
		title: 'Translate options',
		container: 'body',
		content: function() { // Generate HTML
			var div = '<div class="translate_options_form"><form role="form"><div class="form-group"><label for="translate_from">Translate from:</label><select class="form-control" id="translate_from"></select></div><div class="form-group"><label for="translate_to">Translate to:</label><select class="form-control" id="translate_to"></select></div></form></div>';
			return div;
		}.bind(this)
	}).on('shown.bs.popover', function(evt) { // Called when popover is about to show
		var selectFrom = $('#translate_from').empty();
		var selectTo = $('#translate_to').empty();
		for (var i = 0; i < languages.length; i++) { // Create options
			selectFrom.append($('<option value="'+languages[i].code+'">'+languages[i].name+'</option>'));
			selectTo.append($('<option value="'+languages[i].code+'">'+languages[i].name+'</option>'));
		};
		selectFrom.off('input').on('change', function() { // Changed
			this.ui.data.storage.set({translate_from: selectFrom.val()});
		}.bind(this));
		selectTo.off('input').on('change', function() { // Changed
			this.ui.data.storage.set({translate_to: selectTo.val()});
		}.bind(this));
		this.ui.data.storage.get({translate_from: 'en', translate_to: 'en'}, function(err, data) { // Settings came
			if (err) { // Failed
				return this.ui.showError(err);
			};
			selectFrom.val(data.translate_from);
			selectTo.val(data.translate_to);
		}.bind(this));
	}.bind(this));
};
