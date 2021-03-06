define(function(require) {
'use strict';
var spv = require('spv');
var env = require('env');
var localizer = require('localizer');
var css = require('./view_serv/css')
var loadImage = require('./view_serv/loadImage')
var serv = {css: css};



var addClass = function(old_c, cl){
  var add_c = cl.split(' ');
  var new_c = old_c;
  for (var i=0; i < add_c.length; i++) {
    var re = new RegExp("(^|\\s)" + add_c[i] + "(\\s|$)", "g");
    if (!old_c.match(re)){
    //	var b = (" " + add_c[i]);
      new_c = (new_c + " " + add_c[i]).replace(/\s+/g, " ").replace(/(^ | $)/g, "");
    }
  }
  return new_c;
};

var removeClass = function(old_c, add_c){
  var re = new RegExp("(^|\\s)" + add_c + "(\\s|$)", "g");
  return old_c.replace(re, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "");
};
var toggleClass = function(old_c, toggle_class){
  if (old_c.indexOf(toggle_class) == -1){
    return addClass(old_c, toggle_class);
  } else{
    return removeClass(old_c, toggle_class);
  }
};

var NodeClassStates = function(node, init_state){
  this.node = node;
  this.html_el_state = init_state || node.className || '';

};
NodeClassStates.prototype = {
  addState: function(state){
    this.html_el_state = addClass(this.html_el_state, state);
  },
  toggleState: function(state){
    this.html_el_state = toggleClass(this.html_el_state, state);
  },
  removeState: function(state){
    this.html_el_state = removeClass(this.html_el_state, state);
  },
  applyStates: function(){
    this.node.className = this.html_el_state;
  },
  getFullState: function() {
    return this.html_el_state;
  }
};


serv.handleDocument = function(d, tracking_opts) {
  var dstates = new NodeClassStates(window.document.documentElement);

  if (env.touch_support){dstates.addState('touch-screen');}
  if (env.as_application){

    dstates.addState('as-application');
    dstates.removeState('not-as-application');
  } else{
    dstates.addState('not-as-application');
  }
  if (!env.unknown_app_type){
    if (env.chrome_like_ext){
      dstates.addState('chrome-extension');
    } else {
      dstates.addState(env.app_type.replace('_','-'));
    }


  }
  if (env.cross_domain_allowed) {dstates.addState('cross-domain-allowed');}

  if (serv.css.transform){
    dstates.addState('yes-transform_support');
  } else {
    dstates.addState('no-transform_upport');
  }

  var current_dst = new NodeClassStates(d.documentElement, dstates.getFullState());
  current_dst.applyStates();

  spv.domReady(d, function() {
    if (!d.head){
      d.head = d.getElementsByTagName('head')[0];
    }

    var emptyNode = function(node) {
      var length = node && node.childNodes.length;
      for (var i = length - 1; i >= 0; i--) {
        node.removeChild( node.childNodes[i] );
      }
      /*while (node.firstChild){
        node.removeChild( node.firstChild );
      }*/
      return node;
    };

    var lang = env.lang;

    var nodes_array = d.getElementsByClassName('lang');
    var translatable = [];
    var translate = function(el) {
      var cn = el.className;
      var classes = cn.split(/\s/);
      for (var i = 0; i < classes.length; i++) {
        var cl = classes[i];
        if (cl.match(/localize/)){
          var term = localizer[cl.replace('localize-','')];
          var string = term && (term[lang] || term['original']);
          if (string){
            translatable.push([el, string]);
            //$(el).text();
            break;
          }
        }
      }
    };
    var i;
    for (i = 0; i < nodes_array.length; i++) {
      translate(nodes_array[i]);
    }
    for (i = 0; i < translatable.length; i++) {
      var cur = translatable[i];
      emptyNode(cur[0]).appendChild(d.createTextNode(cur[1]));

    }
  });
};

serv.loadImage = loadImage;

return serv;
});
