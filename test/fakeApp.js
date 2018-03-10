define(function(require) {
'use strict';

var spv = require('spv');
var AppModel = require('js/models/AppModelBase');
var prepare = require('js/libs/provoda/structure/prepare');



return function fakeApp(props) {
  var all = {
    init: function(self, opts) {
      self.app = self;
    },
  };
  var App = spv.inh(AppModel, all, props);
  return prepare(App);
}

});