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
