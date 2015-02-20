angular.module('dmp-app', ['restmod'])

.factory('Employee', function(restmod) {
    return restmod.model('/employee');
})

.controller('MainCntrl', ['$scope', 'Employee', 
    function($scope, Employee) {
        var test1 = Employee.$search({Id: 3, isActive: true});
        test1.$then(function(){
            console.log('working');
        });

        var employee = Employee.$find(3);
        employee.name = 'Gaurav';
        employee.$fetch({isActive: true});
        employee.$save();


        var test = Employee.$build({name: 'Gaurav'});
        test.surname = 'Singh';
        test.$save();

        employee.$resolve();
        employee.$resolve().$asPromise();
        employee.$destroy();
        // test.$remove();
}]);


// $search, $find, $fetch, $build, $save, $destroy

//angular.isFuntion