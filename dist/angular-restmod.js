(function(angular, undefined) {
'use strict';
// Preload some angular stuff
var RMModule = angular.module('restmod', ['ng', 'platanus.inflector']);

RMModule.provider('restmod', [function() {
  return {
    $get: ['RMModelFactory', '$log', function(buildModel, $log) {

      var arraySlice = Array.prototype.slice;

      var restmod = {
        model: function(_baseUrl/* , _mix */) {
          var model = buildModel(_baseUrl);

          if(arguments.length > 1) {
            model.mix(arraySlice.call(arguments, 1));
          }
          return model;
        }
      };
      return restmod;
    }]
  };
}]);

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
RMModule.factory('RMScopeApi', ['RMUtils', function(Utils) {

  return {
    $urlFor: function(_resource) {
      var scope = this.$type.isNested() ? this : this.$type;
      return typeof _resource.$buildUrl === 'function' ? _resource.$buildUrl(scope) : scope.$url();
    },
    $build: function(_init) {
      return this.$new().$extend(_init);
    },
    $buildRaw: function(_raw, _mask) {
      var obj = this.$new(this.$type.inferKey(_raw));
      obj.$decode(_raw, _mask);
      return obj;
    },
    $find: function(_pk, _params) {
      return this.$new(_pk).$resolve(_params);
    },
    $create: function(_attr) {
      return this.$build(_attr).$save();
    },
    $search: function(_params) {
      return this.$collection(_params).$fetch();
    }
  };
}]);
RMModule.factory('RMBuilder', [function() {
  function Builder() {}
  Builder.prototype = {};
  return Builder;
}]);
RMModule.factory('RMModelFactory', ['inflector', '$log', 'RMUtils', 'RMScopeApi', 'RMCommonApi', 'RMRecordApi', 'RMCollectionApi', 'RMExtendedApi', 'RMSerializer', 'RMBuilder',
  function(inflector, $log, Utils, ScopeApi, CommonApi, RecordApi, CollectionApi, ExtendedApi, Serializer, Builder) {

  var NAME_RGX = /(.*?)([^\/]+)\/?$/,
      extend = Utils.extendOverriden;

  return function(_baseUrl) {

    function Model(_scope, _pk) {
      this.$scope = _scope || Model;
      this.$pk = _pk;
      this.$initialize();
    }

    _baseUrl = Utils.cleanUrl(_baseUrl);

    var config = {
        primaryKey: 'id',
        urlPrefix: null
      },
      serializer = new Serializer(Model),
      defaults = [],
      computes = [],
      builder;

    if(!config.name && _baseUrl) {
      config.name = inflector.singularize(_baseUrl.replace(NAME_RGX, '$2'));
    }
    
    var Collection = Utils.buildArrayType(),
        List = Utils.buildArrayType();

    function newCollection(_params, _scope) {
      var col = new Collection();
      col.$scope = _scope || Model;
      col.$params = _params;
      return col;
    }

    extend(Model, {
      $$chain: [],
      $type: Model,
      $new: function(_pk, _scope) {
        return new Model(_scope || Model, _pk);
      },
      $collection: newCollection,
      $url: function() {
        return config.urlPrefix ? Utils.joinUrl(config.urlPrefix, _baseUrl) : _baseUrl;
      },
      inferKey: function(_rawData) {
        if(!_rawData || typeof _rawData[config.primaryKey] === 'undefined') return null;
        return _rawData[config.primaryKey];
      },
      isNested: function() {
        return !_baseUrl;
      },
      unpack: function(_resource, _raw) { return _raw; },
      pack: function(_record, _raw) { return _raw; },
      decode: serializer.decode,
      encode: serializer.encode,
      decodeName: null,
      encodeName: null
    }, ScopeApi);

    extend(Model.prototype, {
      $type: Model,
      $initialize: function() {
        var tmp, i, self = this;
        for(i = 0; (tmp = defaults[i]); i++) {
          this[tmp[0]] = (typeof tmp[1] === 'function') ? tmp[1].apply(this) : tmp[1];
        }
        for(i = 0; (tmp = computes[i]); i++) {
          Object.defineProperty(self, tmp[0], {
            enumerable: true,
            get: tmp[1]
          });
        }
      }
    }, CommonApi, RecordApi, ExtendedApi);

    extend(Collection.prototype, {
      $type: Model,
      $new: function(_pk, _scope) {
        return Model.$new(_pk, _scope || this);
      },
      $collection: function(_params, _scope) {
        _params = this.$params ? angular.extend({}, this.$params, _params) : _params;
        return newCollection(_params, _scope || this.$scope);
      }
    }, ScopeApi, CommonApi, CollectionApi, ExtendedApi);

    var APIS = {
      Model: Model,
      Record: Model.prototype,
      Collection: Collection.prototype,
      List: List.prototype
    };

    builder = new Builder();
    return Model;
  };

}]);

RMModule.factory('RMFastQ', [function() {

  var isFunction = angular.isFunction,
      catchError = function(_error) {
        return this.then(null, _error);
      };

  function simpleQ(_val, _withError) {
    if(_val && isFunction(_val.then)) return wrappedQ(_val);
    return {
      simple: true,
      then: function(_success, _error) {
        return simpleQ(_withError ? _error(_val) : _success(_val));
      },
      'catch': catchError,
      'finally': function(_cb) {
        var result = _cb();
        if(result && isFunction(_val.then)) {
          return wrappedQ(_val.then(
            function() { return _withError ? simpleQ(_val, true) : _val; },
            function() { return _withError ? simpleQ(_val, true) : _val; })
          );
        } else {
          return this;
        }
      }
    };
  }

  function wrappedQ(_promise) {
    if(_promise.simple) return _promise;
    var simple;
    _promise.then(function(_val) {
      simple = simpleQ(_val);
    }, function(_val) {
      simple = simpleQ(_val, true);
    });
    return {
      then: function(_success, _error) {
        return simple ?
          simple.then(_success, _error) :
          wrappedQ(_promise.then(_success, _error));
      },
      'catch': catchError,
      'finally': function(_cb) {
        return simple ? simple['finally'](_cb) : wrappedQ(_promise['finally'](_cb));
      }
    };
  }

  return {
    reject: function(_reason) {
      return simpleQ(_reason, true);
    },
    when: function(_val) {
      return simpleQ(_val, false);
    },
    wrap: wrappedQ
  };
}]);

RMModule.factory('RMSerializer', ['$filter', 'RMUtils', function($filter, Utils) {

  function extract(_from, _path) {
    var node;
    for(var i = 0; _from && (node = _path[i]); i++) {
      _from = _from[node];
    }
    return _from;
  }

  function insert(_into, _path, _value) {
    for(var i = 0, l = _path.length-1; i < l; i++) {
      var node = _path[i];
      _into = _into[node] || (_into[node] = {});
    }
    _into[_path[_path.length-1]] = _value;
  }

  return function(_strategies) {
    var isArray = angular.isArray;
    var masks = {},
        decoders = {},
        encoders = {},
        mapped = {},
        mappings = {},
        vol = {};

    function isMasked(_name, _mask) {
      if(typeof _mask === 'function') return _mask(_name);
      var mask = masks[_name];
      return (mask && (mask === true || mask.indexOf(_mask) !== -1));
    }

    function decode(_from, _to, _prefix, _mask, _ctx) {
      var key, decodedName, fullName, value, maps, isMapped, i, l,
          prefix = _prefix ? _prefix + '.' : '';

      maps = mappings[_prefix];
      if(maps) {
        for(i = 0, l = maps.length; i < l; i++) {
          fullName = prefix + maps[i].path;
          if(isMasked(fullName, _mask)) continue;

          if(maps[i].map) {
            value = extract(_from, maps[i].map);
          } else {
            value = _from[_strategies.encodeName ? _strategies.encodeName(maps[i].path) : maps[i].path];
          }
          if(!maps[i].forced && value === undefined) continue;
          value = decodeProp(value, fullName, _mask, _ctx);
          if(value !== undefined) _to[maps[i].path] = value;
        }
      }

      for(key in _from) {
        if(_from.hasOwnProperty(key)) {

          decodedName = _strategies.decodeName ? _strategies.decodeName(key) : key;
          if(decodedName[0] === '$') continue;
          if(maps) {
            for(
              isMapped = false, i = 0, l = maps.length;
              i < l && !(isMapped = (maps[i].mapPath === key));
              i++
            );
            if(isMapped) continue;
          }
          fullName = prefix + decodedName;
          // prevent masked or already mapped properties to be set
          if(mapped[fullName] || isMasked(fullName, _mask)) continue;
          value = decodeProp(_from[key], fullName, _mask, _ctx);
          if(value !== undefined) _to[decodedName] = value; // ignore value if filter returns undefined
        }
      }
    }

    function decodeProp(_value, _name, _mask, _ctx) {
      var filter = decoders[_name], result = _value;

      if(filter) {
        result = filter.call(_ctx, _value);
      } else if(typeof _value === 'object') {
        if(isArray(_value)) {
          result = [];
          for(var i = 0, l = _value.length; i < l; i++) {
            result.push(decodeProp(_value[i], _name + '[]', _mask, _ctx));
          }
        } else if(_value) {
          result = {};
          decode(_value, result, _name, _mask, _ctx);
        }
      }

      return result;
    }

    function encode(_from, _to, _prefix, _mask, _ctx) {
      var key, fullName, encodedName, value, maps,
          prefix = _prefix ? _prefix + '.' : '';

      for(key in _from) {
        if(_from.hasOwnProperty(key) && key[0] !== '$') {
          fullName = prefix + key;
          // prevent masked or already mapped properties to be copied
          if(mapped[fullName] || isMasked(fullName, _mask)) continue;

          value = encodeProp(_from[key], fullName, _mask, _ctx);
          if(value !== undefined) {
            encodedName = _strategies.encodeName ? _strategies.encodeName(key) : key;
            _to[encodedName] = value;
          }
          if(vol[fullName]) delete _from[key];
        }
      }

      maps = mappings[_prefix];
      if(maps) {
        for(var i = 0, l = maps.length; i < l; i++) {
          fullName = prefix + maps[i].path;
          if(isMasked(fullName, _mask)) continue;

          value = _from[maps[i].path];
          if(!maps[i].forced && value === undefined) continue;

          value = encodeProp(value, fullName, _mask, _ctx);
          if(value !== undefined) {
            if(maps[i].map) {
              insert(_to, maps[i].map, value);
            } else {
              _to[_strategies.encodeName ? _strategies.encodeName(maps[i].path) : maps[i].path] = value;
            }
          }
        }
      }
    }

    function encodeProp(_value, _name, _mask, _ctx) {
      var filter = encoders[_name], result = _value;
      if(filter) {
        result = filter.call(_ctx, _value);
      } else if(_value !== null && typeof _value === 'object' && typeof _value.toJSON !== 'function') {
        if(isArray(_value)) {
          result = [];
          for(var i = 0, l = _value.length; i < l; i++) {
            result.push(encodeProp(_value[i], _name + '[]', _mask, _ctx));
          }
        } else if(_value) {
          result = {};
          encode(_value, result, _name, _mask, _ctx);
        }
      }
      return result;
    }

    return {
      decode: function(_record, _raw, _mask) {
        decode(_raw, _record, '', _mask, _record);
      },
      encode: function(_record, _mask) {
        var raw = {};
        encode(_record, raw, '', _mask, _record);
        return raw;
      }
    };
  };
}]);
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
}]);})(angular);