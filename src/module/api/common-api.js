'use strict';

RMModule.factory('RMCommonApi', ['$http', 'RMFastQ', function($http, $q) {
  function wrapPromise(_ctx, _fun) {
    var dsp = _ctx.$dispatcher();
    return function(_last) {
      var oldPromise = _ctx.$promise;
      _ctx.$promise = undefined;
      try {
        _ctx.$last = _last;
        var result = dsp ? _ctx.$decorate(dsp, _fun, [_ctx]) : _fun.call(_ctx, _ctx);
        return result === undefined ? _ctx.$promise : result;
      } finally {
        _ctx.$promise = oldPromise;
      }
    };
  }
  var CommonApi = {
    $url: function() {
      return this.$scope.$urlFor(this);
    },
    $dispatcher: function() {
      return this.$$dsp;
    },
    $asPromise: function() {
      var _this = this;
      return this.$promise ? this.$promise.then(
        function() {
          return _this;
        },
        function() {
          return $q.reject(_this);
        }
      ) : $q.when(this);
    },
    $then: function(_success, _error) {
      if (!this.$promise) {
        this.$promise = $q.when(wrapPromise(this, _success)(this));
      } else {
        this.$promise = this.$promise.then(
          _success ? wrapPromise(this, _success) : _success,
          _error ? wrapPromise(this, _error) : _error
        );
      }
      return this;
    },
    $always: function(_fun) {
      return this.$then(_fun, _fun);
    },
    $finally: function(_cb) {
      this.$promise = this.$promise['finally'](wrapPromise(this, _cb));
      return this;
    },
    $send: function(_options, _success, _error) {
      var action = this.$$action;
      return this.$always(function() {
        this.$response = null;
        this.$status = 'pending';
        return $http(_options).then(wrapPromise(this, function() {
          if (action && action.canceled) {
            this.$status = 'canceled';
          } else {
            this.$status = 'ok';
            this.$response = this.$last;
            if (_success) _success.call(this, this.$last);
          }
        }), wrapPromise(this, function() {
          if (action && action.canceled) {
            this.$status = 'canceled';
          } else {
            this.$status = 'error';
            this.$response = this.$last;

            if (_error) _error.call(this, this.$last);
            return $q.reject(this);
          }
        }));
      });
    },
    $action: function(_fun) {
      var status = {
        canceled: false
      },
      pending = this.$pending || (this.$pending = []);
      pending.push(status);
      return this.$always(function() {
        var oldAction = this.$$action;
        try {
          if (!status.canceled) {
            this.$$action = status;
            return _fun.call(this);
          } else {
            return $q.reject(this);
          }
        } finally {
          this.$$action = oldAction;
        }
      }).$finally(function() {
        pending.splice(pending.indexOf(status), 1);
      });
    }
  };
  return CommonApi;
}]);