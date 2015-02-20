'use strict';

RMModule.factory('RMCollectionApi', ['RMUtils', function(Utils) {
  var extend = angular.extend;
  return {
    $isCollection: true,
    $decode: function(_raw, _mask) {
      Utils.assert(_raw && angular.isArray(_raw), 'Collection $decode expected array');
      for (var i = 0, l = _raw.length; i < l; i++) {
        this.$buildRaw(_raw[i], _mask).$reveal(); // build and disclose every item.
      }
      return this;
    },
    $encode: function(_mask) {
      var raw = [];
      for (var i = 0, l = this.length; i < l; i++) {
        raw.push(this[i].$encode(_mask));
      }
      return raw;
    },
    $fetch: function(_params) {
      return this.$action(function() {
        var request = {
          method: 'GET',
          url: this.$url(),
          params: this.$params
        };
        if (_params) {
          request.params = request.params ? extend(request.params, _params) : _params;
        }
        this.$send(request, function(_response) {
          this.$unwrap(_response.data);
        });
      });
    },
    $add: function(_obj, _idx) {
      Utils.assert(_obj.$type && _obj.$type === this.$type, 'Collection $add expects record of the same $type');
      return this.$action(function() {
        if (_obj.$position === undefined) {
          if (_idx !== undefined) {
            this.splice(_idx, 0, _obj);
          } else {
            this.push(_obj);
          }
          _obj.$position = true; // use true for now, keeping position updated can be expensive
        }
      });
    }
  };
}]);