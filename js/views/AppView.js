define(function(require) {
'use strict';
var spv = require('spv');
var $ = require('cash-dom');
var app_serv = require('app_serv');
var FuncsQueue = require('js/libs/FuncsQueue');
var coct = require('./coct');

var AppBaseView = require('./AppBaseView');
var WPBox = require('./modules/WPBox');
var etc_views = require('./etc_views');
var arrowsKeysNav = require('./utils/arrowsKeysNav');
var MapSliceSpyglass = require('./map_slice/MapSliceSpyglass');
var getAncestorByRooViCon = require('./map_slice/getAncestorByRooViCon');
var getMapSliceView = require('./map_slice/getMapSliceView');
var _updateAttr = require('_updateAttr');

var app_env = app_serv.app_env;

function initRootView(root_view) {
  root_view.all_queues = [];
  root_view.parent_view.all_queues = root_view.all_queues;
  var addQueue = function() {
    this.reverse_default_prio = true;
    root_view.all_queues.push(this);
    return this;
  };
  var resortQueue = function(queue) {
    root_view.resortQueue(queue);
  };

  root_view.lfm_imgq = new FuncsQueue({
    time: [700],
    init: addQueue,
    resortQueue: resortQueue
  });
  root_view.dgs_imgq = new FuncsQueue({
    time: [1200],
    init: addQueue,
    resortQueue: resortQueue
  });

  root_view.dgs_imgq_alt = new FuncsQueue({
    time: [250],
    init: addQueue,
    resortQueue: resortQueue
  });
}

var AppExposedView = spv.inh(AppBaseView.BrowserAppRootView, {}, {
  location_name: 'exposed_root_view',
  'stch-playing': function(target, state) {
    if (app_env.need_favicon){
      if (state){
        target.changeFavicon('playing');
      } else {
        target.changeFavicon('usual');
      }
    }
  },
  changeFavicon: spv.debounce(function(state){
    if (!this.isAlive()){ return; }

    if (state && this.favicon_states[state]){
      this.favicon_node = changeFaviconNode(this.d, this.favicon_node, this.favicon_states[state], 'image/png');
    } else{
      this.favicon_node = changeFaviconNode(this.d, this.favicon_node, this.favicon_states['usual'], 'image/png');
    }
  }, 300),
  favicon_states: {
    playing: 'icons/icon16p.png',
    usual: 'icons/icon16.png'
  }
});

function changeFaviconNode(d, oldLink, src, type) {
  var link = d.createElement('link');
  oldLink = oldLink || d.getElementById('dynamic-favicon');
  link.id = 'dynamic-favicon';
  link.rel = 'shortcut icon';
  if (type){
    link.type = type;
  }

  link.href = src;
  d.head.replaceChild(link, oldLink);
  return link;
}

var AppView = spv.inh(AppBaseView.WebComplexTreesView, {}, {
  /*children_views_by_mn: {
    navigation: {
      $default: nav.baseNavUI,
      start_page: nav.StartPageNavView,
      invstg: nav.investgNavUI
    }
  },*/
  isRootView: true,
  'spyglass-navigation': [MapSliceSpyglass, {
    context_md: false,
    bwlev: false,
  }],
  'collch-spyglass__navigation': true,
  controllers: {
    auth_vk: etc_views.VkLoginUI,
    auth_lfm: etc_views.LfmLoginView,
    image_loader: coct.ImageLoader
  },

  state_change: {
    "wait-vk-login": function(target, state) {
      target.toggleBodyClass(state, 'wait-vk-login');
    },
    "vk-waiting-for-finish": function(target, state){
      target.toggleBodyClass(state, 'vk-waiting-for-finish');
    },
    "slice-for-height": function(target, state){
      target.toggleBodyClass(state, 'slice-for-height');
    },
    "deep_sandbox": function(target, state){
      target.toggleBodyClass(state, 'deep-sandbox');
    },

    // "search_query": function(target, state) {
    // 	target.search_input.val(state || '');
    // }

  },
  checkWaypoints: function() {
    var cwp = this.state('vis_current_wpoint');
    if (!cwp){
      return;
    }

    if (cwp.canUse && !cwp.canUse()){
      _updateAttr(this, 'vis_current_wpoint', false);
    }
  },
  createDetails: function(){
    this._super();
    var _this = this;
    this.wp_box = new WPBox(this, function() {
      return _this.parent_view.important_bwlev_view;
    }, function(waypoint) {
      __updateAttr(this, 'vis_current_wpoint', waypoint);
    }, function(cwp) {
      $(cwp.node).click();
      $(cwp.node).trigger('activate_waypoint');

      setTimeout(function() {
        if (_this.state('vis_current_wpoint') != cwp) {
          return;
        }
        var still_in_use = _this.wp_box.isWPAvailable(cwp);
        if (still_in_use){
          _this.scrollToWP(still_in_use);
        } else {
          __updateAttr(this, 'vis_current_wpoint', false);
        }
      },100);
    }, function() {
      return _this.state('vis_current_wpoint');
    }, function(wp) {
      var cur_wp = _this.state('vis_current_wpoint');
      if (cur_wp == wp) {
        __updateAttr(this, 'vis_current_wpoint', false);
      }
    });

    _this.dom_related_props.push('favicon_node', 'wp_box');

    initRootView(this);
  },
  /*'compx-window_demensions_key': {
    depends_on: ['window_width', 'window_height'],
    fn: function(window_width, window_height) {
      return window_width + '-' + window_height;
    }
  },*/


  toggleBodyClass: function(add, class_name){
    if (add){
      this.c.addClass(class_name);
    } else {
      this.c.removeClass(class_name);
    }
  },

  parts_builder: {
    //samples
    'people-list-item': function() {
      return this.els.ui_samples.children('ul').children('.people-list-item');
    },
    'song-view': function() {
      return this.els.ui_samples.children('ul').children('.song-view');
    },
  },

  buildWidthStreamer: function(target) {
    (function(_this) {
      var app_workplace_width_stream_node = $("#pages_area_width_streamer", _this.d);
      var awwst_win =  app_workplace_width_stream_node[0].contentWindow;

      var style = awwst_win.document.documentElement.style;

      style.padding = 0;
      style.margin = 0;
      style.border = 0;
      style.background = 'transparent';

    // spv.getDefaultView(app_workplace_width_stream_node[0]);
      _this.updateManyStates({
        workarea_width: awwst_win.innerWidth
      });


      var checkWAWidth = spv.debounce(function() {
        //console.log( awwst_win.innerWidth);
        _this.updateManyStates({
          workarea_width: awwst_win.innerWidth
        });
      }, 150);

      spv.addEvent(awwst_win, 'resize', checkWAWidth);

      //$(wd).on('resize', checkWindowSizes);
      _this.onDie(function(){
        spv.removeEvent(awwst_win, 'resize', checkWAWidth);
        awwst_win = null;
        _this = null;
      });


    })(target);
  },
  buildVKSamples: function() {
    var vklc = this.els.ui_samples.children('.vk_login_common');
    vklc.addClass('vk-login-context attention-focuser');
    var _this = this;
    spv.cloneObj(_this.samples, {
      vklc: vklc
    });
  },
  checkSizeDetector: function() {
    var self = this;
    if (!app_env.check_resize) {
      return;
    }

    var detectSize = function(D){
      if (!D){
        return 0;
      } else {
        return $(D).outerHeight();
      }

      //return Math.max(D.scrollHeight, D.offsetHeight, D.clientHeight);
    };
    var getCurrentNode = function() {
      var important_bwlev_view = self.parent_view.important_bwlev_view;
      return important_bwlev_view && important_bwlev_view.getC();
    };

    if (self.rsd_rz){
      clearInterval(self.rsd_rz);
    }

    var oldsize = detectSize(getCurrentNode());
    var offset_top;

    var recheckFunc = function(){
      if (typeof window.document.ScrollSizeChangeHandler != 'function'){
        return;
      }

      var newsize = detectSize(getCurrentNode());

      if (oldsize != newsize){
        if (typeof offset_top == 'undefined'){
          var offset = $(getCurrentNode()).offset();
          offset_top = (offset && offset.top) || 0;
        }
        window.document.ScrollSizeChangeHandler((oldsize = newsize) + offset_top);
      }
    };

    self.rsd_rz = setInterval(recheckFunc, 100);
    this.checkSizeFn = recheckFunc;
  },
  calculateScrollingViewport: function(screens_block) {
    var scrolling_viewport;

    if (screens_block.css('overflow') == 'auto') {
      scrolling_viewport = {
        node: screens_block
      };
    } else if (app_env.as_application){
      scrolling_viewport = {
        node: screens_block
      };
    } else {
      if (app_env.lg_smarttv_app){
        scrolling_viewport = {
          node: screens_block
        };
      } else {
        scrolling_viewport = {
          node: $( this.d.body ),
          offset: true
        };
      }
    }
    return scrolling_viewport;
  },
  tpl_r_events: {
    showTag: function(_1, _2, _3, tag_name) {
      this.parent_view.RPCLegacy('show_tag', tag_name);
    },
  },
  spyglassURL: function(name, pattern, data) {
    this.root_view.parent_view.RPCLegacy(name, pattern, data);
  },
  // tpl_events: {
  //   showArtcardPage: function(artist_name) {
  //     this.spyglassURL('navigation', 'catalog/[:artist_name]', {artist_name: artist_name})
  //   },
  //   showTopTracks: function(artist_name, track_name) {
  //     if (!track_name) {
  //       this.spyglassURL('navigation', 'catalog/[:artist_name]/_', {artist_name: artist_name})
  //     }
  //     this.spyglassURL(
  //       'navigation',
  //       'catalog/[:artist_name]/_/[:artist_name],[:track_name]', {
  //         artist_name: artist_name,
  //         track_name: track_name,
  //       });
  //   },
  //   showArtistAlbum: function(artist, album_name, artist_name) {
  //     this.spyglassURL(
  //       'navigation',
  //       'catalog/[:artist]/[:album_artist],[:album_name]',
  //       {
  //         artist: artist,
  //         album_name: album_name,
  //         artist_name: artist_name || artist,
  //       }
  //     );
  //   },
  //   showResultsPage: function(query) {
  //     this.spyglassURL('navigation', 'search/[:query]', {query: query})
  //   },
  //   showTag: function(tag_name) {
  //     this.spyglassURL('navigation', 'tags/[:tag_name]', {tag_name: tag_name})
  //   },
  //   /*
  //     showArtcardPage
  //     showArtistAlbum
  //     showResultsPage
  //     show_tag
  //     showTopTracks
  //     showNowPlaying
  //   */
  //   spyglassURL: function(e, node, name, pattern, data) {
  //     this.root_view.parent_view.RPCLegacy(name, pattern, data);
  tpl_events: {
    closeNavHelper: function() {
      this.parent_view.RPCLegacy('closeNavHelper');
    },
    showArtcardPage: function (e, node, artist_name) {
      this.parent_view.RPCLegacy('showArtcardPage', artist_name);
    },
    showArtistAlbum: function(e, node, album_artist, album_name, album_id) {
      this.parent_view.RPCLegacy('showArtistAlbum', {
        album_artist: album_artist,
        album_name: album_name,
        album_id: album_id
      });
    },
    showTag: function(e, node, tag_name) {
      this.parent_view.RPCLegacy('showTag', tag_name);
    },
    showTopTracks: function(e, node, artist_name, track_name) {
      this.parent_view.RPCLegacy('showTopTracks', artist_name, track_name);
    },
  },
  selectKeyNodes: function() {
    var slider = this.d.getElementById('slider');
    var screens_block = $( '#screens', this.d );
    var app_map_con = screens_block.children('.app_map_con');
    var scrolling_viewport = this.calculateScrollingViewport(screens_block);

    var start_screen = $( '#start-screen', this.d );


    spv.cloneObj(this.els, {
      screens: screens_block,
      app_map_con: app_map_con,
      scrolling_viewport: scrolling_viewport,
      slider: slider,
      navs: $(slider).children('.navs'),
      nav_helper: $(slider).children().children('#nav-helper'),
      start_screen: start_screen,
      pestf_preview: start_screen.children('.personal-stuff-preview')
    });

  },
  buildAppDOM: spv.precall(AppBaseView.WebComplexTreesView.prototype.buildAppDOM, function() {
    var _this = this;
    var d = this.d;

      console.log('dom ready');

      _this.checkSizeDetector();
      _this.nextTick(_this.buildWidthStreamer);

      $('#widget-url',d).val(window.location.href.replace('index.html', ''));

      if (app_env.bro.browser.opera && ((typeof window.opera.version == 'function') && (parseFloat(window.opera.version()) <= 10.1))){

        $('<a id="close-widget">&times;</a>',d)
          .click(function(){
            window.close();
          })
          .prependTo(_this.els.slider);
      }

      _this.buildVKSamples();

      var d_click_callback = function(e) {
        e.preventDefault();
        app_env.openURL($(this).attr('href'));
        _this.trackEvent('Links', 'just link');
      };

      $(d).on('click', '.external', d_click_callback);
      _this.onDie(function() {
        $(d).off('click', d_click_callback);
      });



      var kd_callback = function(e){
        if (d.activeElement && d.activeElement.nodeName == 'BUTTON'){return;}
        if (d.activeElement && d.activeElement.nodeName == 'INPUT'){
          if (e.keyCode == 27) {
            d.activeElement.blur();
            e.preventDefault();
            return;
          }
        }

        arrowsKeysNav(_this, e);
      };

      $(d).on('keydown', kd_callback);

      _this.onDie(function() {
        $(d).off('keydown', kd_callback);
      });


      _this.onDie(function() {
        _this = null;
        d = null;
      });
  }),
  scrollToWP: function(cwp) {
    if (!cwp){return;}

    var cur_md_md = this.getNesting('current_mp_md');
    var current_mp_bwlev = this.getNesting('current_mp_bwlev')
    var parent_md = cur_md_md.getParentMapModel();
    var parent_bwlev = current_mp_bwlev.getParentMapModel();

    // если родительская вьюха (вьюхи от cwp), соедененная с корнем совпадает
    // с вьюхой соедененной с корнем
    if (parent_md && getAncestorByRooViCon(cwp.view) == getMapSliceView(this.getStoredMpx(parent_md))){
      this.scrollTo($(cwp.node), {
        node: this.general_navigation_view.getLevByBwlev(parent_bwlev).scroll_con
      }, {vp_limit: 0.6, animate: 117});
    }
    this.scrollTo($(cwp.node), false, {vp_limit: 0.6, animate: 117});
  },
  'stch-vis_current_wpoint': function(target, nst, ost) {
    if (ost){
      $(ost.node).removeClass('surf_nav');
    }
    if (nst) {
      $(nst.node).addClass('surf_nav');
      target.scrollToWP(nst);
    }
  },

  trackEvent: function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift('trackEvent');
    this.RPCLegacy.apply(this, args);
  },
  bindLfmTextClicks: function(con) {
    var _this = this;
    con.on('click', 'a', function(e) {
      var node = $(this);
      var link = node.attr('href');
      if (node.is('.bbcode_artist')){
        e.preventDefault();

        var artist_name = decodeURIComponent(link.replace('http://www.last.fm/music/','').replace(/\+/g, ' '));
        _this.root_view.parent_view.RPCLegacy('showTag', artist_name);
        _this.trackEvent('Artist navigation', 'bbcode_artist', artist_name);
      } else if (node.is('.bbcode_tag')){
        e.preventDefault();

        var tag_name = decodeURIComponent(link.replace('http://www.last.fm/tag/','').replace(/\+/g, ' '));
        _this.root_view.parent_view.RPCLegacy('showTag', tag_name);
        _this.trackEvent('Artist navigation', 'bbcode_tag', tag_name);
      } else {
        e.preventDefault();
        app_env.openURL(link);
        _this.trackEvent('Links', 'just link');
      }
    });

  },
  updateImportantBwlev: function(bwlev_view) {
    this.parent_view.important_bwlev_view = bwlev_view;
    this.resortQueue();
    this.checkWaypoints();
    if (this.checkSizeFn) {
      this.checkSizeFn();
    }
  },
});

AppView.AppExposedView = AppExposedView;
return AppView;
});
