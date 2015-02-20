'use strict';

RMModule.factory('RMExtendedApi', ['$q', function($q) {
  return {
    $unwrap: function(_raw, _mask) {
      try {
        _raw = this.$type.unpack(this, _raw);
        return this.$decode(_raw, _mask);
      } finally{}
    },
    $wrap: function(_mask) {
      var raw = this.$encode(_mask);
      raw = this.$type.pack(this, raw);
      return raw;
    },
    $resolve: function(_params) {
      return this.$action(function() {
        if (!this.$resolved) this.$fetch(_params);
      });
    }
  };
}]);