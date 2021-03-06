define(function(require) {
'use strict';
var initDeclaredNestings = require('../initDeclaredNestings');
var prsStCon = require('../prsStCon');
var nestWIndex = require('../nest-watch/index')
var initWatchList = nestWIndex.initList;
var initNestSel = require('../dcl/nest_sel/init');
var initNestConcat = require('../dcl/nest_conj/init');
var initNestCompx = require('../dcl/nest_compx/init');
var initApis = require('../dcl/effects/legacy/api/init')
var initRoutes = require('../dcl/routes/init')
var __handleInit = require('../dcl/passes/handleInit/handle');
var _updateAttr = require('_updateAttr');


function connectStates(self) {
  // prefill own states before connecting relations
  self.__initStates();

  prsStCon.connect.parent(self, self);
  prsStCon.connect.root(self, self);
  prsStCon.connect.nesting(self, self);

  initWatchList(self, self.compx_nest_matches)
}

function connectNests(self) {
  if (self.nestings_declarations) {
    self.nextTick(initDeclaredNestings, null, false, self.current_motivator);
  }

  initNestSel(self);
  initNestConcat(self);
  initNestCompx(self);
}

function markInitied(md) {
  // - this state shuld be true when all preparations, all initial triggers and subscribtions are done
  // - use it to not produce effects for states changes during initialization
  _updateAttr(md, '$meta$inited', true);
}

return function postInitModel(self, opts) {
  connectStates(self)
  connectNests(self)

  initWatchList(self, self.st_nest_matches)
  initRoutes(self)


  if (self.init_v2_data) {
    __handleInit(self, self.init_v2_data)
    self.init_v2_data = null
  } else {
    __handleInit(self, null)
  }

  initApis(self, opts && opts.interfaces)

  self.nextTick(markInitied, null, false, self.current_motivator);
  Object.seal(self)
}
})
