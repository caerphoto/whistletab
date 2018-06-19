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

  var dataStore = W.dataStore ? W.dataStore : {
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
  };

  var tab = {
    el: this.el = D.querySelector('#tab'),
    tabTemplate: D.querySelector('#tab-entry').innerHTML,
    errorTemplate: D.querySelector('#tab-entry-error').innerHTML,
    spacerTemplate: '<span class="spacer"></span>',
    slurTemplate: '<span class="slur">(</span>',

    noteMatcher: /-{2,3}.*$|-|[a-g]#?\+{0,2}|\n| /gi,

    fingerings: {
      'd':   '------',
      'd#':  '-----h',
      'e':   '-----o',
      'f':   '----ho',
      'f#':  '----oo',
      'g':   '---ooo',
      'g#':  '--hooo',
      'a':   '--oooo',
      'a#':  '-hoooo',
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
      'c#++': 'oooooo'
    },
    symbolMap: {
      'o': '\u25cb', // white circle
      '-': '\u25cf', // black circle
      'h': '\u25d1'  // circle with right half black
    },

    commentFromNote: function (note, isHeading) {
      var commentWords = note.replace(/^-{2,3}(.*)$/, '$1').split(' ');
      var para = D.createElement('p');

      if (isHeading) {
        para.appendChild(D.createTextNode(note.slice(3)));
      } else {
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
      }
      para.className = isHeading ? 'comment heading' : 'comment lyric';

      return para.outerHTML;
    },
    noteTemplate: function (note) {
      // Uppercase notes are shorthand for `<note>+`
      if (/[A-G]/.test(note)) {
        note += '+';
      }
      if (/\+/.test(note)) {
        note = note.toUpperCase();
      }
      return note.
        replace('#', '<span class="sharp">\u266f</span>'). // sharp symbol
        replace('++', '<sup>@</sup>').
        replace('+', '<sup>+</sup>').
        replace('@', '++');
    },
    tabFromNote: function (note) {
      var fingers;

      if (note === '\n') {
        return '<div class="line-break"></div>';
      }

      if (note === '') {
        return '';
      }

      if (note === ' ') {
        return this.spacerTemplate;
      }

      if (note === '-') {
        return this.slurTemplate;
      }

      if (/^---/.test(note)) {
        return this.commentFromNote(note, true);
      }

      if (/^--/.test(note)) {
        return this.commentFromNote(note, false);
      }

      if (this.fingerings[note]) {
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
      var tabs;

      if (lines.length === 0) {
        this.el.innerHTML = '';
        return;
      }

      notes = lines.reduce(function (n, line) {
        if (line === '') return n.concat('\n');
        return n.concat(line.match(self.noteMatcher), '\n');
      }, []);

      tabs = notes.map(function (note) {
        return this.tabFromNote(note);
      }, this);

      this.el.innerHTML = tabs.join('');
    },
    setSpacing: function (toValue) {
      this.el.className = 'spacing' + toValue;
    }
  };

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
      this.overwriteButton.addEventListener('click', this.overwriteTab.bind(this));
      this.deleteButton.addEventListener('click', this.deleteTab.bind(this));

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
      var isServerTab = event && event.target.id === this.serverTabsForm.id;
      var tabToLoad;

      isServerTab = isServerTab || forceServerTab;
      tabToLoad = this.getSelectedTab(isServerTab);

      if (event) {
        event.preventDefault();
      }

      this.setHashParams(isServerTab, this.getSelectedIndex(isServerTab));

      this.tabInput.setValue(tabToLoad.tab);
      this.tabInput.setSpacing(tabToLoad.spacing);
      D.title = tabToLoad.name + ' · ' + APP_TITLE;
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
    }
  };

  input.init(tab);
  tabStorage.init(input);

  D.querySelector('#display-options').addEventListener('change', function (event) {
    var checkbox;
    if (event.target.nodeName !== 'INPUT') {
      return;
    }

    checkbox = event.target;
    D.body.classList.toggle(checkbox.id, checkbox.checked);
  });
}(window, window.document));
