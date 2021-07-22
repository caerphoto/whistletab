(function (W, D) {
  var DEFAULT_TABS = [
    {
      name: 'Basic Scale',
      tab: 'def#gabc#'
    },
    {
      name: 'Extended Scale',
      tab: 'def# gab c#\nd+e+f#+ g+a+b+ c#+\nd++e++f#++ g++a++b++ c#++'
    }
  ];

  var APP_TITLE = 'Tin Whistle Tab Creator';

  var dataStore = W.dataStore || {
    getItem: function (key, callback) {
      var dataString = W.localStorage.getItem(key);
      if (typeof callback === 'function') {
        callback(dataString);
      }
    },
    setItem: function (key, dataString, callback) {
      W.localStorage.setItem(key, dataString);
      if (typeof callback === 'function') {
        callback();
      }
    }
  };

  if (W.dataStore) {
    D.body.classList.add('server-store');
  }

  var input = {
    el: D.querySelector('#notes'),
    spacing: D.querySelector('#spacing'),
    output: null,

    init: function (target) {
      this.output = target;
      this.el.addEventListener('input', this.updateOutput.bind(this));
      this.spacing.addEventListener('input', this.updateSpacing.bind(this));
      this.el.focus();
    },
    setValue: function (newValue) {
      this.el.value = newValue;
      this.updateOutput();
    },
    getValue: function () {
      return this.el.value;
    },
    setSpacing: function (newValue) {
      this.spacing.value = newValue || '0';
      this.updateSpacing();
    },
    getSpacing: function () {
      return this.spacing.value;
    },
    updateOutput: function () {
      this.output.setTab(this.el.value);
    },
    updateSpacing: function () {
      this.output.setSpacing(this.spacing.value);
    }
  }; // input obj

  var tab = {
    el: this.el = D.querySelector('#tab'),
    tabTemplate: D.querySelector('#tab-entry').innerHTML,
    errorTemplate: D.querySelector('#tab-entry-error').innerHTML,
    spacerTemplate: '<span class="spacer"></span>',
    slurTemplate: '<span class="slur">(</span>',

    noteMatcher: /^-{1,3}.*$|-|[a-g]#?\+{0,2}|\n| /gi,

    spacing: 1,
    // These are the spacings as defined in ems in the CSS
    spacings: [0, 0.1, 0.2, 0.3, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8],
    cachedInput: null,
    showNotes: true,
    staves: [],

    fingerings: {
      'd':   '------',
      'd#':  '-----h',
      'e':   '-----o',
      'f':   '----ho',
      'f#':  '----oo',
      'g':   '---ooo',
      'g#':  '--Hooo',
      'a':   '--oooo',
      'a#':  '-Hoooo',
      'b':   '-ooooo',
      'c':   'o--ooo',
      'c#':  'oooooo',

      'D':  'o-----',
      'D#': '-----h',
      'E':  '-----o',
      'F':  '----ho',
      'F#': '----oo',
      'G':  '---ooo',
      'G#': '--o--o',
      'A':  '--oooo',
      'A#': '-o-ooo',
      'B':  '-ooooo',
      'C':  'o-o---',
      'C#': 'ooo---',

      'd+':  'o-----',
      'd#+': '-----h',
      'e+':  '-----o',
      'f+':  '----ho',
      'f#+': '----oo',
      'g+':  '---ooo',
      'g#+': '--o--o',
      'a+':  '--oooo',
      'a#+': '-o-ooo',
      'b+':  '-ooooo',
      'c+':  'o-o---',
      'c#+': 'ooo---',

      'd++':  'o-----',
      'e++':  '-----o',
      'f#++': '----oo',
      'g++':  '---ooo',
      'a++':  'o----o',
      'b++':  '-ooooo',
      'c#++': 'oooooo',

      'D+':  'o-----',
      'E+':  '-----o',
      'F#+': '----oo',
      'G+':  '---ooo',
      'A+':  'o----o',
      'B+':  '-ooooo',
      'C#+': 'oooooo'
    },
    symbolMap: {
      'o': '\u25cb', // white circle
      '-': '\u25cf', // black circle
      'H': '\u25d0', // circle with left half black
      'h': '\u25d1'  // circle with right half black
    },
    measure1Em: function () {
      const ul = this.el.querySelector('ul');
      const rect = ul.getBoundingClientRect();

      // Fingering elements have a width of 1.2em defined in the CSS.
      this.emSize = rect.width / 1.2;

      return this.emSize;
    },

    calculateNoteSpacing: function () {
      return this.emSize * (this.spacings[this.spacing] + 1.2);
    },

    lyricsFromNote: function (note) {
      var commentWords = note.replace(/^--(.*)$/, '$1').split(' ');
      var para = D.createElement('p');

      commentWords.forEach(function (word) {
        var spacingWrapper = D.createElement('span');
        var wordEl = D.createElement('span');
        var textNode = D.createTextNode(word);
        wordEl.appendChild(textNode);
        wordEl.className = 'word';
        spacingWrapper.className = 'spacer';
        spacingWrapper.appendChild(wordEl);
        para.appendChild(spacingWrapper);
      });
      para.className = 'comment lyric';

      return para.outerHTML;
    },
    commentFromNote: function (note, isHeading) {
      var para = D.createElement('p');
      var text = note.replace(/^-{1,3}(.*)$/, '$1');
      para.appendChild(D.createTextNode(text));
      para.className = isHeading ? 'comment heading' : 'comment text';
      return para.outerHTML;
    },
    noteTemplate: function (note) {
      var htmlNote;
      var octave = '';

      if (/[a-g](#)?\+/.test(note)) {
        note = note.toUpperCase().slice(0, -1);
      }
      // Uppercase notes are shorthand for `<note>+`
      if (/[A-G]/.test(note)) {
        octave = '+';
      }
      if (/\+/.test(note)) {
        note = note.toUpperCase().slice(0, -1);
        octave = '++';
      }

      htmlNote = '<span class="tab-note--letter">' + note + '</span>';
      htmlNote = htmlNote.replace('#', '<span class="sharp">\u266f</span>'); // sharp symbol
      if (octave) {
        htmlNote += '<sup>' + octave + '</sup>';
      }

      return htmlNote;
    },
    staffFromNotes: function (notes) {
      const noteSpacing = this.calculateNoteSpacing();
      const newStaff = new window.Staff(notes, this.showNotes, noteSpacing);
      this.staves.push(newStaff);
      return newStaff.toHtml();
    },
    tabFromNote: function (note, staffNotes, prevWasNote) {
      // staffNotes is a list of notes that this function modifies. Each
      // note, space and slur is added to it, and when a line break is reached,
      // a staff is added and the list is reset.
      var fingers;

      if (note === '\n' && prevWasNote) {
        var staff = this.staffFromNotes(staffNotes);
        staffNotes.length = 0;
        return staff + '<div class="line-break"></div>';
      }

      if (note === '\n') {
        return '<div class="line-break"></div>';
      }

      if (note === '') {
        return '';
      }

      if (note === ' ') {
        staffNotes.push(note);
        return this.spacerTemplate;
      }

      if (note === '-') {
        staffNotes.push(note);
        return this.slurTemplate;
      }

      if (/^---/.test(note)) {
        return this.commentFromNote(note, true);
      }

      if (/^--/.test(note)) {
        return this.lyricsFromNote(note, false);
      }

      if (/^-/.test(note)) {
        return this.commentFromNote(note);
      }

      if (this.fingerings[note]) {
        staffNotes.push(note);
        fingers = this.fingerings[note].split('');
      } else {
        return this.errorTemplate;
      }

      return fingers.reduce(function (html, finger, index) {
        var placeholder = '$' + index.toString();
        return html.replace(placeholder, this.symbolMap[finger]);
      }.bind(this), this.tabTemplate.concat()).
        replace('$N', this.noteTemplate(note));
    },

    setTab: function (inputString) {
      var self = this;
      var lines = inputString.split('\n');
      var notes;
      var staffNotes = [];
      var tabs;
      var prevWasNote = false;

      this.staves = [];
      this.cachedInput = inputString;

      if (lines.length === 0) {
        this.el.innerHTML = '';
        return;
      }

      notes = lines.reduce(function (n, line) {
        if (line === '') return n.concat('\n');
        return n.concat(line.match(self.noteMatcher), '\n');
      }, []);

      tabs = notes.map(function (note) {
        var mapped = this.tabFromNote(note, staffNotes, prevWasNote);
        prevWasNote = !!this.fingerings[note];
        return mapped;
      }, this);

      this.el.innerHTML = tabs.join('');
      this.measure1Em();
    },

    refresh: function () {
      if (!this.cachedInput) return;

      this.setTab(this.cachedInput);
    },

    setSpacing: function (toValue) {
      this.spacing = parseInt(toValue, 10);
      this.el.className = 'spacing' + this.spacing;

      if (this.staves.length === 0) return;

      const newStaves = [];
      const staffEls = Array.from(this.el.querySelectorAll('.staff'));

      staffEls.forEach(function (el, index) {
        const oldStaff = this.staves[index];
        const notes = oldStaff.notes;
        const noteSpacing = this.calculateNoteSpacing();
        const newStaff = new window.Staff(notes, this.showNotes, noteSpacing);
        newStaff.render();
        this.el.replaceChild(newStaff.svg, el);
        newStaves.push(newStaff);
      }, this);

      this.staves = newStaves;
    }
  }; // tab obj

  var tabStorage = {
    nameInput: D.querySelector('#tab-name'),
    sourceInput: D.querySelector('#tab-source'),
    savedTabList: D.querySelector('#tab-list'),
    serverTabList: D.querySelector('#server-tab-list'),

    deleteButton: D.querySelector('#delete-tab'),
    overwriteButton: D.querySelector('#overwrite-tab'),
    saveTabForm: D.querySelector('#save-tab-form'),
    savedTabsForm: D.querySelector('#saved-tabs-form'),
    serverTabsForm: D.querySelector('#server-tabs-form'),

    printTitle: D.querySelector('#print-title'),
    tabSourceLink: D.querySelector('#tab-source-link'),

    tabInput: null,

    savedTabs: [],

    STORAGE_KEY: 'saved-tabs',

    init: function (input) {
      var params = this.getHashParams();

      this.tabInput = input;
      this.saveTabForm.addEventListener('submit', this.saveTab.bind(this));

      this.savedTabsForm.addEventListener('submit', this.loadTab.bind(this));
      this.serverTabsForm.addEventListener('submit', this.loadTab.bind(this));
      this.savedTabsForm.addEventListener('dblclick', this.loadTab.bind(this));
      this.serverTabsForm.addEventListener('dblclick', this.loadTab.bind(this));

      this.overwriteButton.addEventListener('click', this.overwriteTab.bind(this));
      this.deleteButton.addEventListener('click', this.deleteTab.bind(this));
      this.savedTabsForm.addEventListener('click', this.toggleCollapse.bind(this));
      this.serverTabsForm.addEventListener('click', this.toggleCollapse.bind(this));

      // Load and render user tabs list
      this.fetchTabs(function () {
        var initialIndex = 0;


        if (params[0] === 'u') {
          initialIndex = Math.min(params[1], this.savedTabs.length - 1);
          this.renderSavedTabList(initialIndex);
          this.renderSavedTabList(0, true);
          this.loadTab();
        } else {
          initialIndex = Math.min(params[1], window.serverTabs.length - 1);
          this.renderSavedTabList(0);
          this.renderSavedTabList(initialIndex, true);
          this.loadTab(null, true);
        }
      });
    },

    setHashParams: function (isServer, index) {
      var params = [isServer ? 's' : 'u', index.toString()];
      window.location.hash = params.join('');
    },

    getHashParams: function () {
      var params = ['u', 0];

      if (window.location.hash) {
        params[0] = window.location.hash.slice(1, 2);
        params[1] = window.location.hash.slice(2);
      }

      params[1] = parseInt(params[1], 10);

      return params;
    },

    fetchTabs: function (whenDone) {
      dataStore.getItem(this.STORAGE_KEY, function (jsonData) {
        if (jsonData) {
          this.savedTabs = JSON.parse(jsonData);
        } else {
          this.savedTabs = DEFAULT_TABS;
          this.storeTabs();
        }

        whenDone.call(this);
      }.bind(this));
    },
    storeTabs: function () {
      dataStore.setItem(this.STORAGE_KEY, JSON.stringify(this.savedTabs));
    },

    saveTab: function (event) {
      event.preventDefault();

      if (!this.nameInput.value) {
        return;
      }

      this.printTitle.innerHTML = this.nameInput.value;

      this.savedTabs.push({
        tab: this.tabInput.getValue(),
        spacing: this.tabInput.getSpacing(),
        name: this.nameInput.value,
        sourceUrl: this.sourceInput.value
      });

      this.storeTabs();
      this.renderSavedTabList(this.savedTabs.length - 1);
      this.nameInput.value = '';
    },

    getSelectedIndex: function (useServerTabs) {
      var form = useServerTabs ? this.serverTabsForm : this.savedTabsForm;
      var elements = form.elements['selected-tab-index'];
      var i;
      for (i = 0; i < elements.length; i += 1) {
        if (elements[i].checked) {
          return parseInt(elements[i].value, 10);
        }
      }

      return 0;
    },
    getSelectedTab: function (useServerTabs) {
      var tabs = useServerTabs ? window.serverTabs : this.savedTabs;
      return tabs[this.getSelectedIndex(useServerTabs)];
    },

    setSourceHeading: function (url) {
      if (url) {
        this.tabSourceLink.innerHTML = url;
        this.tabSourceLink.href = url;
      } else {
        this.tabSourceLink.innerHTML = 'unknown';
        this.tabSourceLink.href = '';
      }
    },

    loadTab: function (event, forceServerTab) {
      var isServerTab = event && event.currentTarget === this.serverTabsForm;
      var tabToLoad;

      isServerTab = !!(isServerTab || forceServerTab);
      tabToLoad = this.getSelectedTab(isServerTab);

      if (event) {
        event.preventDefault();
      }

      this.setHashParams(isServerTab, this.getSelectedIndex(isServerTab));

      this.tabInput.setValue(tabToLoad.tab);
      this.tabInput.setSpacing(tabToLoad.spacing);
      D.title = tabToLoad.name + ' ⋮ ' + APP_TITLE;
      this.printTitle.innerHTML = tabToLoad.name;
      this.printTitle.scrollIntoView(true, { behaviour: 'smooth' });
      this.setSourceHeading(tabToLoad.sourceUrl);
    },

    overwriteTab: function () {
      var tabToOverwrite = this.getSelectedTab();
      var newName = W.prompt('Tab name:', tabToOverwrite.name);

      if (newName) {
        tabToOverwrite.name = newName;
        tabToOverwrite.tab = this.tabInput.getValue();
        tabToOverwrite.spacing = this.tabInput.getSpacing();
        this.storeTabs();
        this.renderSavedTabList(this.getSelectedIndex());
      }
    },

    deleteTab: function () {
      var index = this.getSelectedIndex();
      var tabToDelete = this.getSelectedTab();

      if (W.confirm(
        'Are you sure you want to delete the selected tab?\n\n' +
        'Name: ' + tabToDelete.name
      )) {
        this.savedTabs.splice(index, 1);
        this.storeTabs();
        this.renderSavedTabList();
      }
    },

    renderSavedTabList: function (selectedIndex, useServerTabs) {
      var frag = D.createDocumentFragment();
      var tabs = useServerTabs ? window.serverTabs : this.savedTabs;
      var tabList = useServerTabs ? this.serverTabList : this.savedTabList;
      if (!selectedIndex) {
        selectedIndex = 0;
      }

      tabs.forEach(function (savedTab, index) {
        var label = D.createElement('label');
        var text = D.createTextNode(savedTab.name);
        var input = D.createElement('input');

        input.type = 'radio';
        input.name = 'selected-tab-index';
        input.value = index.toString();
        if (index === selectedIndex) {
          input.checked = true;
        }

        label.appendChild(input);
        label.appendChild(text);
        frag.appendChild(label);
      });

      tabList.innerHTML = '';
      tabList.appendChild(frag);
    },

    toggleCollapse: function (event) {
      var form;
      if (!event.target.matches('.tab-list legend')) return;
      switch (event.target.getAttribute('data-form-name')) {
        case 'user':
          form = this.savedTabsForm;
          break;
        case 'server':
          form = this.serverTabsForm;
          break;
        default:
          return;
      }
      form.classList.toggle('collapsed');
    }
  }; // tabStorage obj

  var config = {
    options: {
      'white-background': false,
      'show-fingering': true,
      'show-notes': true,
      'show-lyrics': true,
      'show-staves': false,
      'show-staff-notes': true
    },

    form: D.querySelector('#display-options'),

    init: function () {
      this.form.addEventListener('change', this.optionChange.bind(this));
      this.form.addEventListener('click', this.formClick.bind(this));
      this.load();
      this.form.addEventListener('submit', function (event) {
        event.preventDefault();
      });
    },

    setOption: function (option, isOn) {
      this.options[option] = !!isOn;
      D.body.classList.toggle(option, !!isOn);

      if (option === 'show-staff-notes') {
        tab.showNotes = !!isOn;
        tab.refresh();
      }
    },

    setCheckbox: function (option, isOn) {
      var checkbox = D.querySelector('#' + option);
      checkbox.checked = isOn;
    },

    save: function () {
      var json = JSON.stringify(this.options);
      W.localStorage.setItem('options', json);
    },

    load: function () {
      var json = W.localStorage.getItem('options');
      var loadedOptions;

      try {
        loadedOptions = JSON.parse(json);
      } catch (err) {
        W.console.error(err);
        return;
      }

      Object.keys(this.options).forEach(function (option) {
        var isOn = !!loadedOptions[option];
        this.options[option] = isOn;
        this.setOption(option, isOn);
        this.setCheckbox(option, isOn);
      }, this);
    },

    formClick: function (event) {
      if (!event.target.classList.contains('dialog-toggle')) return;

      this.form.classList.toggle('open');
    },

    optionChange: function (event) {
      var checkbox;
      if (event.target.nodeName !== 'INPUT') {
        return;
      }

      checkbox = event.target;
      this.setOption(checkbox.id, checkbox.checked);
      this.save();
    }
  }; // config obj

  input.init(tab);
  tabStorage.init(input);
  config.init();


}(window, window.document));
