'use strict';

RMModule.factory('RMRecordApi', ['RMUtils', function(Utils) {

  var RelationScope = function(_scope, _target, _partial) {
    this.$scope = _scope;
    this.$target = _target;
    this.$partial = Utils.cleanUrl(_partial);
  };

  RelationScope.prototype = {
    $urlFor: function(_resource) {
      if (_resource.$isCollection || this.$target.isNested()) {
        return this.$nestedUrl();
      } else {
        return this.$target.$urlFor(_resource);
      }
    }
  };

  return {
    $initialize: function() {
      this.$super();
    },
    $buildUrl: function(_scope) {
      return (this.$pk === undefined || this.$pk === null) ? null : Utils.joinUrl(_scope.$url(), this.$pk + '');
    },
    $decode: function(_raw, _mask) {
      this.$type.decode(this, _raw, _mask || Utils.READ_MASK);
      if (this.$pk === undefined || this.$pk === null) this.$pk = this.$type.inferKey(_raw); // TODO: warn if key changes
      return this;
    },
    $encode: function(_mask) {
      var raw = this.$type.encode(this, _mask || Utils.CREATE_MASK);
      return raw;
    },
    $fetch: function(_params) {
      return this.$action(function() {
        var url = this.$url('fetch');
        Utils.assert(!!url, 'Cant $fetch if resource is not bound');

        var request = {
          method: 'GET',
          url: url,
          params: _params
        };

        this.$send(request, function(_response) {
          this.$unwrap(_response.data);
        }, function(_response) {});
      });
    },
    $extend: function(_other) {
      return this.$action(function() {
        for (var tmp in _other) {
          if (_other.hasOwnProperty(tmp) && tmp[0] !== '$') {
            this[tmp] = _other[tmp];
          }
        }
      });
    },
    $save: function(_patch) {
      return this.$action(function() {
        var url = this.$url('update'),
          request;
        if (url) {
          request = {
            method: 'PUT',
            url: url,
            data: this.$wrap(Utils.UPDATE_MASK)
          };

          this.$send(request, function(_response) {
            this.$unwrap(_response.data);
          }, function(_response) {});
        } else {
          url = this.$url('create') || this.$scope.$url();
          Utils.assert(!!url, 'Cant $create if parent scope is not bound');
          request = {
            method: 'POST',
            url: url,
            data: this.$wrap(Utils.CREATE_MASK)
          };
          this.$send(request, function(_response) {
            this.$unwrap(_response.data);
            if (this.$scope.$isCollection && this.$position === undefined && !this.$preventReveal) {
              this.$scope.$add(this, this.$revealAt);
            }
          });
        }
      });
    },
    $destroy: function() {
      return this.$action(function() {
        var url = this.$url('destroy');
        if (url) {
          var request = {
            method: 'DELETE',
            url: url
          };

          this.$send(request, function(_response) {});
        }
      });
    },
    $reveal: function(_show) {
      if (_show === undefined || _show) {
        this.$scope.$add(this, this.$revealAt);
      } else {
        this.$preventReveal = true;
      }
      return this;
    }
  };
}]);