(function (W) {
  W.dataStore = {
    getItem: function (key, callback) {
      var xhr = new XMLHttpRequest();

      xhr.open('GET', '/whistletab/tabs', true);
      xhr.setRequestHeader('Accept', 'application/json; charset=utf-8');
      xhr.addEventListener('load', function (event) {
        if (typeof callback === 'function') {
          callback(event.target.responseText);
        }
      });
      xhr.send();
    },
    setItem: function (key__unused, dataString, callback) {
      var xhr = new XMLHttpRequest();

      xhr.open('POST', '/whistletab/tabs', true);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
      xhr.addEventListener('load', function () {
        if (typeof callback === 'function') {
          callback();
        }
      });
      xhr.send(dataString);
    }
  };
}(window));
