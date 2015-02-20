'use strict';

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