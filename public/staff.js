/*eslint indent: ["warn", 2] */
(function (W, D) {
  const DEFAULT_SPACING = 30;

  function setAttributes(obj, attrs) {
    Object.keys(attrs).forEach(function (key) {
      obj.setAttribute(key, attrs[key]);
    });
  }

  function svgEl(name, attrs, content) {
    const el = D.createElementNS('http://www.w3.org/2000/svg', name);
    setAttributes(el, attrs);
    if (content) {
      el.appendChild(D.createTextNode(content));
    }
    return el;
  }

  function Staff(notes) {
    this.svg = D.createElement('svg');
    this.notes = notes;

    //this.NOTE_WIDTH = (noteWidth * DEFAULT_SPACING) || 60;
    this.NOTE_WIDTH = 30;
    this.STAFF_HEIGHT = 100;
    this.PAD_X = 10;
    this.PAD_T = 40;
    this.PAD_B = 20;
    this.NOTE_X_OFFSET = this.PAD_X + this.NOTE_WIDTH * 1.5;
    this.LINE_SPACE = (this.STAFF_HEIGHT - this.PAD_T - this.PAD_B) / 4;
    this.init();
  }

  Staff.prototype = {
    collapsedNotes: function () {
      // Remove sequences of more than one space
      if (!this._collapsedNotes) {
        let lastNote = '';
        this._collapsedNotes = this.notes.reduce(function (acc, note) {
          if (note === ' ') {
            if (lastNote !== ' ') {
              acc.push(note);
            }
          } else {
            acc.push(note);
          }
          lastNote = note;
          return acc;
        }, []);
      }
      return this._collapsedNotes;
    },
    calculateWidth: function () {
      const staff = this;

      this.width = this.collapsedNotes().reduce(function (sum, note) {
        if (note === '-') return sum;
        return sum + staff.NOTE_WIDTH;
      }, 0) + this.PAD_X * 2 + this.NOTE_X_OFFSET;
      return this.width;
    },

    normaliseNotes: function () {
      this.notes = this.notes.map(function (note) {
        if (/[A-G]#?$/.test(note)) {
          return note.toLowerCase() + '+';
        }

        if (/[A-G]#\+/.test(note)) {
          return note.replace('+', '++').toLowerCase();
        }

        return note;
      });

    },

    init: function () {
      this.calculateWidth();
      this.normaliseNotes();

      setAttributes(this.svg, {
        xmlns: 'http://www.w3.org/2000/svg',
        x: 0,
        y: 0,
        width: this.width,
        height: this.STAFF_HEIGHT,
        viewBox: `0 0 ${this.width} ${this.STAFF_HEIGHT}`,
        preserveAspectRatio: 'xMidYMid meet',
        'class': 'staff'
      });
    },

    noteY: function (note) {
      const scale = 'd e f g a b c'.split(' ');
      const natural = note.charAt(0);
      let offset = scale.indexOf(natural.toLowerCase());

      if (/[a-g]#?\+\+|[A-G]#?\+/.test(note)) offset += 14;
      if (/[a-g]#?\+$/.test(note)) offset += 7;

      return this.STAFF_HEIGHT - this.PAD_B -
        offset * (this.LINE_SPACE / 2) +
        this.LINE_SPACE / 2 +
        0.5;
    },

    pitchY: function (note) {
      return this.noteY(note) + this.LINE_SPACE / 2.1;
    },

    drawBarLine: function (x) {
      this.svg.appendChild(svgEl('line', {
        x1: x,
        x2: x,
        y1: this.PAD_T,
        y2: this.STAFF_HEIGHT - this.PAD_B,
        stroke: 'black'
      }));
    },

    drawLines: function () {
      //this.drawBarLine(this.PAD_X);
      //this.drawBarLine(this.width - this.PAD_X);
      let y;

      for (let i = 0; i < 5; i += 1) {
        y = this.PAD_T + i * this.LINE_SPACE + 0.5;
        this.svg.appendChild(svgEl('line', {
          x1: this.PAD_X,
          x2: this.width - this.PAD_X,
          y1: y,
          y2: y,
          stroke: 'black'
        }));
      }
    },

    drawClef: function () {

    },

    drawLedgerLine: function (x, y) {
      const ledgerScale = 1.4;

      this.svg.appendChild(svgEl('line', {
        x1: x - this.LINE_SPACE / ledgerScale,
        x2: x + this.LINE_SPACE / ledgerScale,
        y1: y,
        y2: y,
        stroke: 'black'
      }));
    },
    drawLedgerLines: function (note, x) {
      const natural = note.replace('#', '');
      let ledgerNotes = [];
      let noteIndex;
      let offset = 0;

      if (/[b]\+$|[dfac]\+\+/.test(natural)) {
        ledgerNotes = 'b+ d++ f++ a ++ c++'.split(' ');
        offset = this.LINE_SPACE / 2;
      } else if (/[ac]\+$|[egb]\+\+$/.test(natural)) {
        ledgerNotes = 'a+ c+ e++ g++ b++'.split(' ');
      }

      noteIndex = ledgerNotes.indexOf(natural) + 1;

      ledgerNotes.slice(0, noteIndex).forEach(function (ln) {
        this.drawLedgerLine(x, this.noteY(ln) + offset);
      }, this);
    },

    drawPitchSign: function (note, xPos, sign) {
      this.svg.appendChild(svgEl('text', {
        x: xPos,
        y: this.pitchY(note),
        'class': 'pitch-sign'
      }, sign));

    },

    drawKey: function (key) {
      const keySignatures = {
        'c': [],
        'g': ['f#+'],
        'd': ['f#+', 'c#'],
        'a': ['f#+', 'c#', 'g#+']
      };
      let x = this.NOTE_X_OFFSET - this.NOTE_WIDTH * 1.4;

      if (!keySignatures[key]) return;

      keySignatures[key].forEach(function (sig) {
        let sign = /#/.test(sig) ? '♯' : '♭';
        this.drawPitchSign(sig, x, sign);
        x += this.NOTE_WIDTH / 4;
      }, this);
    },

    drawNotes: function () {
      let prevNote = '';
      let noteIndex = 0;
      this.notes.forEach(function (note) {
        const x = this.NOTE_X_OFFSET + (noteIndex * this.NOTE_WIDTH);
        const y = this.noteY(note);
        const space = this.LINE_SPACE;
        let stemSize = space * 3.5;
        let stemOffset = space / 1.8 - 1.1;
        const pitchSignX = x - space * 1.75;

        if (note === '-') return;

        if (note === ' ') {
          if (prevNote !== note) {
            this.drawBarLine(x + 0.5);
            noteIndex += 1;
          }
        } else {
          this.svg.appendChild(svgEl('ellipse', {
            cx: x,
            cy: y,
            rx: space / 1.8,
            ry: space / 2.8,
            transform: `rotate(-20 ${x} ${y})`
          }));

          if (/[abdeg]#/.test(note)) {
            this.drawPitchSign(note, pitchSignX, '♯');
          }

          if (/[cf]\+?\+?$/.test(note)) {
            this.drawPitchSign(note, pitchSignX, '♮');
          }

          if (/[bc]#?$|[a-g]#?\+$|[a-g]#?\+/.test(note)) {
            stemSize *= -1;
            stemOffset = -stemOffset;
          }
          this.svg.appendChild(svgEl('line', {
            x1: x + stemOffset,
            x2: x + stemOffset,
            y1: y,
            y2: y - stemSize,
            stroke: 'black'
          }));

          this.drawLedgerLines(note, x);
          noteIndex += 1;
        }

        prevNote = note;
      }, this);
    },

    render: function () {
      this.drawLines();
      this.drawClef();
      this.drawKey('d');
      this.drawNotes();
    },

    toHtml: function () {
      this.render();
      return this.svg.outerHTML;
    }
  };

  window.Staff = Staff;
}(window, window.document));
