'use strict';

RMModule.factory('RMUtils', ['$log', function($log) {

  var PROTO_SETTER = (function() {
    var Test = function() {};
    if (Object.setPrototypeOf) {
      return function(_target, _proto) {
        Object.setPrototypeOf(_target, _proto);
      };
    } else if ((new Test).__proto__ === Test.prototype) {
      return function(_target, _proto) {
        _target.__proto__ = _proto;
      };
    }
  })();

  var Utils = {
    CREATE_MASK: 'C',
    UPDATE_MASK: 'U',
    READ_MASK: 'R',
    assert: function(_condition, _msg /*, params */ ) {
      if (!_condition) {
        var params = Array.prototype.slice.call(arguments, 2);
        $log.error(_msg); // log error message
        throw new Error(_msg);
      }
    },
    joinUrl: function(_head, _tail) {
      if (!_head || !_tail) return null;
      return (_head + '').replace(/\/$/, '') + '/' + (_tail + '').replace(/^\//, '');
    },
    cleanUrl: function(_url) {
      return _url ? _url.replace(/\/$/, '') : _url;
    },
    override: function(_super, _fun) {
      if (!_super || typeof _fun !== 'function') return _fun;
      return function() {
        var oldSuper = this.$super;
        try {
          this.$super = _super;
          return _fun.apply(this, arguments);
        } finally {
          this.$super = oldSuper;
        }
      };
    },
    extendOverriden: function(_target) {
      for (var i = 1; i < arguments.length; i++) {
        var other = arguments[i];
        for (var key in other) {
          if (other.hasOwnProperty(key)) {
            _target[key] = _target[key] && typeof _target[key] === 'function' ? Utils.override(_target[key], other[key]) : other[key];
          }
        }
      }
      return _target;
    },
    buildArrayType: function() {
      var arrayType;
      var SubArray = function() {
        var arr = [];
        arr.push.apply(arr, arguments);
        PROTO_SETTER(arr, SubArray.prototype);
        return arr;
      };
      SubArray.prototype = [];
      SubArray.prototype.last = function() {
        return this[this.length - 1];
      };
      arrayType = SubArray;
      return arrayType;
    }
  };
  return Utils;
}]);