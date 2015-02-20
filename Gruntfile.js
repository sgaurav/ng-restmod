'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: {name: 'angular-restmod'},
    // bower: {
    //   install: {}
    // },
    concat: {
      options: {
        banner: '(function(angular, undefined) {\n\'use strict\';\n',
        footer: '})(angular);',
        process: function(src, filepath) {
          return src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
        }
      },
      dist: {
        files: {
          'dist/angular-restmod.js': [
            'src/module.js',
            'src/module/**/*.js'
          ]
        }
      }
    },
    uglify: {
      options: {
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/*.js'],
      options: {
        curly: false,
        browser: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        expr: true,
        node: true,
        globals: {
          exports: true,
          angular: false,
          $: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task
  grunt.registerTask('default', ['build']);

  // Build task
  grunt.registerTask('build', [ 'jshint', 'concat', 'uglify']);

};
