'use strict';

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
