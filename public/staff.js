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
    calculateWidth: function () {
      const staff = this;
      let lastNote = ' ';

      // Collapse notes, i.e. remove sequences of more than one space
      this.notes = this.notes.reduce(function (acc, note) {
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

      this.width = this.notes.reduce(function (sum, note) {
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
      const scale = 'd e f g a b c D E F G A B C'.split(' ');
      const natural = note.charAt(0);
      let offset = scale.indexOf(natural.toLowerCase());

      if (/[a-g]#?\+\+|[A-G]#?\+/.test(note)) offset += 14;
      if (/[a-g]#?\+$/.test(note)) offset += 7;

      return this.STAFF_HEIGHT - this.PAD_B -
        offset * (this.LINE_SPACE / 2) +
        this.LINE_SPACE / 2 +
        0.5;
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

    drawLedgerLines: function (note, x) {
      const natural = note.replace('#', '');
      const ledgerScale = 1.4;
      const y = this.noteY(note);
      const space = this.LINE_SPACE;

      if (/[ac]\+$/.test(natural)) {
        this.svg.appendChild(svgEl('line', {
          x1: x - space / ledgerScale,
          x2: x + space / ledgerScale,
          y1: y + space / 2,
          y2: y + space / 2,
          stroke: 'black'
        }));
      }

      if (/[gb]\+$|[dfac]\+\+/.test(natural)) {
        this.svg.appendChild(svgEl('line', {
          x1: x - space / ledgerScale,
          x2: x + space / ledgerScale,
          y1: y,
          y2: y,
          stroke: 'black'
        }));
      }

    },

    drawPitchSign: function (pos, sign) {
      this.svg.appendChild(svgEl('text', {
        x: pos.x,
        y: pos.y,
        'class': 'pitch-sign'
      }, sign));

    },

    drawKey: function () {
      const space = this.LINE_SPACE;
      let x = this.NOTE_X_OFFSET - this.NOTE_WIDTH * 1.4;
      let y = this.noteY('f#+') + space / 2;

      this.drawPitchSign({ x: x, y: y }, '♯');

      y = this.noteY('c#') + space / 2;
      x += this.NOTE_WIDTH / 4;
      this.drawPitchSign({ x: x, y: y }, '♯');
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
        const pitchSignPos = { x: x - space * 1.75, y: y + space / 2 };

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
            this.drawPitchSign(pitchSignPos, '♯');
          }

          if (/[cf]\+?\+?$/.test(note)) {
            this.drawPitchSign(pitchSignPos, '♮');
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
      this.drawKey();
      this.drawNotes();
    },

    toHtml: function () {
      this.render();
      return this.svg.outerHTML;
    }
  };

  window.Staff = Staff;
}(window, window.document));
