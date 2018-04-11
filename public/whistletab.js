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

  var input = {
    el: D.querySelector('#notes'),
    output: null,

    init: function (target) {
      this.output = target;
      this.el.addEventListener('input', this.updateOutput.bind(this));
      this.el.focus();
    },
    setValue: function (newValue) {
      this.el.value = newValue;
      this.updateOutput();
    },
    getValue: function () {
      return this.el.value;
    },
    updateOutput: function () {
      this.output.setTab(this.el.value);
    }
  };

  var tab = {
    el: this.el = D.querySelector('#tab'),
    tabTemplate: D.querySelector('#tab-entry').innerHTML,
    errorTemplate: D.querySelector('#tab-entry-error').innerHTML,
    spacerTemplate: '<span class="spacer"></span>',

    fingerings: {
      'D':   '------',
      'D#':  '-----h',
      'E':   '-----o',
      'F':   '----ho',
      'F#':  '----oo',
      'G':   '---ooo',
      'G#':  '--hooo',
      'A':   '--oooo',
      'A#':  '-hoooo',
      'B':   '-ooooo',
      'C':   'o--ooo',
      'C#':  'oooooo',

      'D+':  'o-----',
      'D#+': '-----h',
      'E+':  '-----o',
      'F+':  '----ho',
      'F#+': '----oo',
      'G+':  '---ooo',
      'G#+': '--o--o',
      'A+':  '--oooo',
      'A#+': '-o-ooo',
      'B+':  '-ooooo',
      'C+':  'o-o---',
      'C#+': 'ooo---',

      'D++':  'o-----',
      'E++':  '-----o',
      'F#++': '----oo',
      'G++':  '---ooo',
      'A++':  'o----o',
      'B++':  '-ooooo',
      'C#++': 'oooooo'
    },
    symbolMap: {
      'o': '\u25cb', // white circle
      '-': '\u25cf', // black circle
      'h': '\u25d1'  // circle with right half black
    },
    noteTemplate: function (note) {
      return note.
        replace('#', '<span class="sharp">\u266f</span>'). // sharp symbol
        replace('++', '<sup>@</sup>').
        replace('+', '<sup>+</sup>').
        replace('@', '++');
    },
    tabFromNote: function (note) {
      var fingers;
      var noteLookup;

      if (note === '\n') {
        return '<br>';
      }

      if (note === '') {
        return '';
      }

      if (note === ' ') {
        return this.spacerTemplate;
      }

      noteLookup = note.toUpperCase();

      if (this.fingerings[noteLookup]) {
        fingers = this.fingerings[noteLookup].split('');
      } else {
        return this.errorTemplate;
      }

      return fingers.reduce(function (html, finger, index) {
        var placeholder = '$' + index.toString();
        return html.replace(placeholder, this.symbolMap[finger]);
      }.bind(this), this.tabTemplate.concat()).
        replace('$N', this.noteTemplate(noteLookup));
    },
    setTab: function (noteString) {
      var notes = noteString.match(/[a-g]#?\+{0,2}|\n| /g);
      var tabs;

      if (!notes || notes.length === 0) {
        this.el.innerHTML = '';
        return;
      }

      tabs = notes.map(function (note) {
        return this.tabFromNote(note);
      }, this);

      this.el.innerHTML = tabs.join('');
    }
  };

  var tabStorage = {
    nameInput: D.querySelector('#tab-name'),
    savedTabList: D.querySelector('#tab-list'),

    deleteButton: D.querySelector('#delete-tab'),
    saveTabForm: D.querySelector('#save-tab-form'),
    savedTabsForm: D.querySelector('#saved-tabs-form'),

    printTitle: D.querySelector('#print-title'),

    tabInput: null,

    savedTabs: [],

    STORAGE_KEY: 'saved-tabs',

    init: function (input) {
      this.tabInput = input;
      this.saveTabForm.addEventListener('submit', this.saveTab.bind(this));
      this.savedTabsForm.addEventListener('submit', this.loadTab.bind(this));
      this.deleteButton.addEventListener('click', this.deleteTab.bind(this));

      this.fetchTabs(function () {
        this.tabInput.setValue(this.savedTabs[0].tab);
        this.printTitle.innerHTML = this.savedTabs[0].name;
        this.renderSavedTabList();
      });


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
        name: this.nameInput.value
      });

      this.storeTabs();
      this.renderSavedTabList(this.savedTabs.length - 1);
      this.nameInput.value = '';
    },

    getSelectedIndex: function () {
      var elements = this.savedTabsForm.elements;
      return parseInt(elements['selected-tab-index'].value, 10);
    },

    loadTab: function (event) {
      var tabToLoad = this.savedTabs[this.getSelectedIndex()];
      event.preventDefault();
      this.tabInput.setValue(tabToLoad.tab);
      this.printTitle.innerHTML = tabToLoad.name;
    },

    deleteTab: function () {
      var index = this.getSelectedIndex();
      if (W.confirm(
        'Are you sure you want to delete the selected tab?\n\n' +
        'Name: ' + this.savedTabs[index].name
      )) {
        this.savedTabs.splice(index, 1);
        this.storeTabs();
        this.renderSavedTabList();
      }
    },

    renderSavedTabList: function (selectedIndex) {
      var frag = D.createDocumentFragment();
      if (!selectedIndex) {
        selectedIndex = 0;
      }

      this.savedTabs.forEach(function (savedTab, index) {
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

      this.savedTabList.innerHTML = '';
      this.savedTabList.appendChild(frag);
    }
  };

  input.init(tab);
  tabStorage.init(input);
}(window, window.document));
