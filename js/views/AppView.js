define(['provoda', 'spv', 'jquery', 'app_serv', 'js/libs/FuncsQueue', './nav', './coct' ,'./uacq',
'./StartPageView', './SearchPageView', './ArtcardUI', './ArtistListView',
'./SongsListView', './UserCardPage', './MusicConductorPage', './TagPageView' ,'./YoutubeVideoView',
'./lul', './SongcardPage', './AppBaseView', './modules/WPBox'],
function(provoda, spv, $, app_serv, FuncsQueue, nav, coct, uacq,
StartPageView, SearchPageView, ArtcardUI, ArtistListView,
SongsListView, UserCardPage, MusicConductorPage, TagPageView, YoutubeVideoView,
lul, SongcardPage, AppBaseView, WPBox) {
"use strict";
var app_env = app_serv.app_env;
var localize = app_serv.localize;

var getTreeSample = function() {
	return {
		basetree: null,
		states: {
			stch: [],
			compx_deps: [],
			deep_compx_deps: [],
			
		},
		constr_children: {
			children: {},
			children_by_mn: {}
		},
		tree_children: {},
		m_children: {},
		merged_states: [],
		base_from_parent: null,
		base_root_constr_id: null
	};
};

var bCh = function(item, nesting_name, nesting_space, children_list_index, children_list) {
	var field_path = ['children', nesting_name, nesting_space];
	if (!children_list_index[field_path.join('{}')]) {
		children_list.push(field_path);
	}
};

var bChByMN = function(item, nesting_name, model_name, nesting_space, children_list_index, children_list) {
	var field_path = ['children_by_mn', nesting_name, model_name, nesting_space];
	if (!children_list_index[field_path.join('{}')]) {
		children_list.push(field_path);
	}
};

var iterateChildren = function(children, cb, arg1, arg2) {
	for (var nesting_name in children) {
		for (var nesting_space in children[nesting_name]) {
			cb(children[nesting_name][nesting_space], nesting_name, nesting_space, arg1, arg2);
		}
	}
};
var iterateChildrenByMN = function(children_by_mn, cb, arg1, arg2) {
	for (var nesting_name in children_by_mn) {
		for (var model_name in children_by_mn[nesting_name]) {
			for (var nesting_space in children_by_mn[nesting_name][model_name]) {
				cb(children_by_mn[nesting_name][model_name][nesting_space], nesting_name, model_name, nesting_space, arg1, arg2);
			}
		}
	}
};
var buildFreeChildren = function(tree, base_from_parent, base_root_constr_id) {
	var used_base = base_from_parent;
	var children_list_index = {}, children_list = [];
	if (used_base) {
		if (used_base.children) {
			iterateChildren(used_base.children, bCh, children_list_index, children_list);
		}
		if (used_base.children_by_mn) {
			iterateChildrenByMN(used_base.children_by_mn, bChByMN, children_list_index, children_list);
		}
		
	}
	if (base_from_parent && base_from_parent.states) {
		tree.merged_states = spv.collapseAll(tree.merged_states, base_from_parent.states);
	}
	for (var i = 0; i < children_list.length; i++) {
		var cur = children_list[i];

		var parent_basetree_chi = tree.basetree ? spv.getTargetField(tree.basetree, cur) : (base_from_parent && spv.getTargetField(base_from_parent, cur));

		var struc = getTreeSample();

		spv.setTargetField(tree.tree_children, cur, struc);
		spv.setTargetField(tree.m_children, cur, struc);
		buildFreeChildren(struc, parent_basetree_chi, base_root_constr_id);
		struc.base_from_parent = parent_basetree_chi;
		struc.base_root_constr_id = base_root_constr_id;



		if (!base_root_constr_id) {
			//debugger;
		}
	}
};

var getUsageTree = function(getUsageTree, root_view, base_from_parent, base_root_constr_id) {
	/*
	- collch
	- pv-view внутри .tpl
	- pv-view внутри .tpl нераскрытые

	*/

	/*
	{
		stch
		состояния-источники для compx 
		свои состояния как состояния-источники для compx внутри потомков
		используемые в шаблоне состояния (tpl, tpls, base_tree)

		шаблон, который задекларирован у потомка или шаблон, который родитель сам передаст потомку 
	}
	*/
	getUsageTree = getUsageTree || this.getUsageTree;


	/*
	собираем состояния из контроллера
	1) stch_hs
	2)  full_comlxs_list
	*/
	var tree = getTreeSample();

	var push = Array.prototype.push;


	tree.states.stch = (function() {

		return (this.stch_hs_list && this.stch_hs_list.slice()) || [];

	}).call(this);

	tree.states.compx_deps = (function() {
		if (!this.full_comlxs_list) {
			return [];
		}

		var result = [];

		var compxs_itself = [];

		for (var i = 0; i < this.full_comlxs_list.length; i++) {
			push.apply(result, this.full_comlxs_list[i].depends_on);
			compxs_itself.push(this.full_comlxs_list[i].name);
		}

		return spv.collapseAll(spv.arrayExclude(result, compxs_itself));
		
	}).call(this);


	tree.merged_states = spv.collapseAll(tree.states.stch, tree.states.compx_deps);

	tree.basetree = (function() {

		if (this.base_tree_list) {
			var i, cur;
			var arr = [];

			for (i = 0; i < this.base_tree_list.length; i++) {
				cur = this.base_tree_list[i];


				var sample_name = cur.sample_name;
				if (!sample_name && cur.part_name && typeof this.parts_builder[cur.part_name] == 'string') {
					sample_name = this.parts_builder[cur.part_name];
				}

				if (!sample_name) {
					throw new Error('can\'t get sampler');
				}
				var sampler = root_view.getSampler(sample_name);

				var structure_data = sampler.getStructure(cur.parse_as_tplpart);
	
				arr.push(structure_data);
				//this.structure_data
				
			}
			var merged_tree = {
				node_id: null,
				children: null,
				children_by_mn: null,
				states: null
			};

			var setUndefinedField = function(store, field_path, value) {
				var current_value = spv.getTargetField(store, field_path);
					if (!current_value) {
						spv.setTargetField(store, field_path, value);
					}
			};
			var nesting_name, nesting_space, field_path, model_name;

			var tree_id = [];

			for (i = 0; i < arr.length; i++) {
				cur = arr[i];
				tree_id.push(cur.node_id);
				if (cur.states) {
					if (!merged_tree.states) {
						merged_tree.states = [];
					}
					push.apply(merged_tree.states, cur.states);
				}

				if (cur.children) {
					if (!merged_tree.children) {
						merged_tree.children = {};
					}
					for (nesting_name in cur.children) {
						for (nesting_space in cur.children[nesting_name]) {
							field_path = [nesting_name, nesting_space];
							setUndefinedField(merged_tree.children, field_path, spv.getTargetField(cur.children, field_path));
						}
					}
				}

				if (cur.children_by_mn) {
					if (!merged_tree.children_by_mn) {
						merged_tree.children_by_mn = {};
					}
					for (nesting_name in cur.children_by_mn) {
						if (!merged_tree.children_by_mn[nesting_name]) {
							merged_tree.children_by_mn[nesting_name] = {};
						}
						for (model_name in cur.children_by_mn[nesting_name]) {
							for (nesting_space in cur.children_by_mn[nesting_name][model_name]) {
								field_path = [nesting_name, model_name, nesting_space];
								setUndefinedField(merged_tree.children_by_mn, field_path, spv.getTargetField(cur.children_by_mn, field_path));
							}
						}
					}
				}
			}
			merged_tree.node_id = tree_id.join('&');
			return merged_tree;
			
		} else {
			return null;
		}
		
	}).call(this);


	if (tree.basetree && tree.basetree.states) {
		tree.merged_states = spv.collapseAll(tree.merged_states, tree.basetree.states);
	}

	

	//создаём список для итерации по потомкам
	//могут быть и basetree и конструкторы для одного nest и space а может быть только basetree или только конструктор
	//нужно использовать всё



	var children_list_index = {};
	var children_list = [];

	if (this.children_views) {
		iterateChildren(this.children_views, bCh, children_list_index, children_list);
	}
	if (this.children_views_by_mn) {
		iterateChildrenByMN(this.children_views_by_mn, bChByMN, children_list_index, children_list);
	}

	var used_base = tree.basetree || base_from_parent;

	if (used_base) {
		if (used_base.children) {
			iterateChildren(used_base.children, bCh, children_list_index, children_list);
		}
		if (used_base.children_by_mn) {
			iterateChildrenByMN(used_base.children_by_mn, bChByMN, children_list_index, children_list);
		}
		
	}


	

	if (base_from_parent && base_from_parent.children) {
		//debugger;
	}

	var own_children = {
		children: this.children_views,
		children_by_mn: this.children_views_by_mn
	};

	for (var i = 0; i < children_list.length; i++) {
		var cur = children_list[i];
		var constr = spv.getTargetField(own_children, cur);
		//var basetree = tree.basetree &&  spv.getTargetField(tree.basetree, cur);
		var parent_basetree_chi;
		var chi_constr_id;

		var base_tree_chi = tree.basetree && spv.getTargetField(tree.basetree, cur);
		if (tree.basetree) {
			parent_basetree_chi = base_tree_chi;
			chi_constr_id = this.constr_id;
		} else {
			parent_basetree_chi = base_from_parent && spv.getTargetField(base_from_parent, cur);
			chi_constr_id = base_root_constr_id;
		}


		

		if (constr) {
			var struc = getUsageTree.call(constr.prototype, getUsageTree, root_view, parent_basetree_chi, parent_basetree_chi && chi_constr_id);
			spv.setTargetField(tree.constr_children, cur, struc);
			spv.setTargetField(tree.m_children, cur, struc);
		} else if (parent_basetree_chi) {
			var struc = getTreeSample();
			spv.setTargetField(tree.tree_children, cur, struc);
			spv.setTargetField(tree.m_children, cur, struc);
			buildFreeChildren(struc, parent_basetree_chi, parent_basetree_chi && chi_constr_id);
			struc.base_from_parent = parent_basetree_chi;
			struc.base_root_constr_id = chi_constr_id;
			//getTreeSample
		}
	}
	tree.base_from_parent = base_from_parent || null;
	tree.base_root_constr_id = base_root_constr_id || null;

	if (tree.base_from_parent && tree.base_from_parent.states) {
		tree.merged_states = spv.collapseAll(tree.merged_states, tree.base_from_parent.states);
	}

	return tree;
};

var AppExposedView = function() {};
AppBaseView.BrowserAppRootView.extendTo(AppExposedView, {
	location_name: 'exposed_root_view',
	"stch-doc_title": function(title) {
		this.d.title = title || "";
	},
	'stch-playing': function(state) {
		if (app_env.need_favicon){
			if (state){
				this.changeFavicon('playing');
			} else {
				this.changeFavicon('usual');
			}
		}
	},
	changeFaviconNode: function(d, src, type) {
		var link = d.createElement('link'),
			oldLink = this.favicon_node || d.getElementById('dynamic-favicon');
		link.id = 'dynamic-favicon';
		link.rel = 'shortcut icon';
		if (type){
			link.type = type;
		}
		
		link.href = src;
		d.head.replaceChild(link, oldLink);
		this.favicon_node = link;
	},
	changeFavicon: spv.debounce(function(state){
		if (this.isAlive()){
			if (state && this.favicon_states[state]){
				this.changeFaviconNode(this.d, this.favicon_states[state], 'image/png');
			} else{
				this.changeFaviconNode(this.d, this.favicon_states['usual'], 'image/png');
			}
		}

	},300),
	favicon_states: {
		playing: 'icons/icon16p.png',
		usual: 'icons/icon16.png'
	}
});


var AppView = function(){};
AppView.AppExposedView = AppExposedView;
AppBaseView.extendTo(AppView, {
	children_views_by_mn: {
		map_slice: {
			$default: coct.ListOfListsView,
			start_page : StartPageView,
			invstg: SearchPageView,
			artcard: ArtcardUI,
			artslist: ArtistListView,
			playlist: {
				'main': SongsListView,
				'all-sufficient-details': SongsListView.SongsListDetailedView,
			},
			vk_usercard: UserCardPage.VkUsercardPageView,
			lfm_usercard: UserCardPage.LfmUsercardPageView,
			usercard: UserCardPage,
			allplaces: coct.SimpleListOfListsView,
			mconductor: MusicConductorPage,
			tag_page: TagPageView,
			tagslist: TagPageView.TagsListPage,
			user_playlists: coct.ListOfListsView,
			songs_lists: coct.ListOfListsView,
			artists_lists: coct.ListOfListsView,
			сountries_list: coct.SimpleListOfListsView,
			city_place: coct.SimpleListOfListsView,
			cities_list: coct.SimpleListOfListsView,
			country_place: coct.ListOfListsView,
			tag_artists: coct.ListOfListsView,
			tag_songs: coct.ListOfListsView,
			youtube_video: YoutubeVideoView,
			vk_users: UserCardPage.VkUsersPageView,
			lfm_users: lul.LfmUsersPageView,
			lfm_listened_artists: coct.ListOfListsView,
			lfm_listened_tracks: coct.ListOfListsView,
			lfm_listened_albums: coct.ListOfListsView,
			lfm_listened_tags: lul.UserTagsPageView,
			vk_users_tracks: coct.ListOfListsView,
			lfm_user_tag: coct.ListOfListsView,
			user_acqs_list: uacq.UserAcquaintancesListView,
			albslist: coct.AlbumsListView,
			lula: lul.LULAPageVIew,
			lulas: lul.LULAsPageVIew,
			songcard: SongcardPage,
			justlists: coct.ListOfListsView,
			vk_posts: coct.VKPostsView,
			songcard_cloudcasts: coct.ListOfListsView,
			cloudcasts_list: coct.ListOfListsView,
			blogs_conductor: coct.ListOfListsView,
			blogs_list: coct.ListOfListsView,
			music_blog: coct.ListOfListsView,
		},
		navigation: {
			$default: nav.baseNavUI,
			start_page: nav.StartPageNavView,
			invstg: nav.investgNavUI
		}
	},
	children_views: {
		
		
	},
	'collch-current_mp_md': function(name, value) {
		this.updateState('current_mp_md', value._provoda_id);
	},
	'collch-navigation': {
		place: 'nav.daddy',
		by_model_name: true
	},
	'spec-vget-song': function(md) {
		var parent = md.getParentMapModel();
		var parent_mpx = this.getStoredMpx(parent);

		var parent_view = this.findMpxViewInChildren(parent_mpx, 'all-sufficient-details');
		return parent_view && parent_view.findMpxViewInChildren(this.getStoredMpx(md));
	},
	'collch-$spec-map_slice:song': {
		is_wrapper_parent: '^',
		space: 'all-sufficient-details',
		by_model_name: true,
		place: function(md, view, original_md) {
			return AppBaseView.viewOnLevelP.call(this, {map_level_num: original_md.map_level_num}, view);
		}
	},

	tickCheckFocus: function() {
		if (this.isAlive()){
			this.search_input[0].focus();
			this.search_input[0].select();
		}
	},
	'collch-$spec-map_slice:start_page': function(nesname, md) {
		var view = this.getFreeChildView({
			by_model_name: true,
			nesting_name: nesname,
			nesting_space: 'main'
		}, md);

		if (view){
			var _this = this;
			var checkFocus = function(state) {
				if (state){
					_this.nextLocalTick(_this.tickCheckFocus);
				}
			};
			view.on('state_change-autofocus', function(e) {
				checkFocus(e.value);
			}, {immediately: true});
		}
		this.requestAll();
	},
	'stch-full_page_need': function(state) {
		this.els.screens.toggleClass('full_page_need', !!state);
	},
	'stch-root-lev-search-form': function(state) {
		this.els.search_form.toggleClass('root-lev-search-form', !!state);
	},
	'stch-show_search_form': function(state) {
		if (!state){
			this.search_input[0].blur();
		}
	},
	
	state_change: {
		"wait-vk-login": function(state) {
			this.toggleBodyClass(state, 'wait-vk-login');
		},
		"vk-waiting-for-finish": function(state){
			this.toggleBodyClass(state, 'vk-waiting-for-finish');
		},
		"slice-for-height": function(state){
			this.toggleBodyClass(state, 'slice-for-height');
		},
		"deep_sandbox": function(state){
			this.toggleBodyClass(state, 'deep-sandbox');
		},

		"search_query": function(state) {
			this.search_input.val(state || '');
		}
		
	},
	'compx-now_playing_text': {
		depends_on: ['now_playing'],
		fn: function(text) {
			return localize('now_playing','Now Playing') + ': ' + text;
		}
	},
	remove: function() {
		this._super();
		if (this.d){
			if (this.d.body && this.d.body.firstChild && this.d.body.firstChild.parentNode){
				$(this.d.body).off().find('*').remove();
				
			}
			$(this.d).off();
			$(this.d).remove();
		}
		
		
		this.d = null;
		this.search_input = null;
		this.nav = null;
	},
	createDetails: function(){
		this._super();
		var _this = this;
		this.wp_box = new WPBox();
		this.wp_box.init(this);

		_this.dom_related_props.push('favicon_node', 'wp_box');

		this.all_queues = [];
		var addQueue = function() {
			this.reverse_default_prio = true;
			_this.all_queues.push(this);
			return this;
		};
		var resortQueue = function(queue) {
			_this.resortQueue(queue);
		};

		this.lfm_imgq = new FuncsQueue({
			time: [700],
			init: addQueue,
			resortQueue: resortQueue
		});
		this.dgs_imgq = new FuncsQueue({
			time: [1200],
			init: addQueue,
			resortQueue: resortQueue
		});

		this.dgs_imgq_alt = new FuncsQueue({
			time: [170],
			init: addQueue,
			resortQueue: resortQueue
		});

		setTimeout(function() {
			spv.domReady(_this.d, function() {
				_this.buildAppDOM();
			});
		});

		
		this.on('die', function() {
			this.RPCLegacy('detachUI', this.view_id);
		});

		this.on('vip_state_change-current_mp_md', function() {
			var cwp = this.state('vis_current_wpoint');
			if (cwp){
				if (cwp.canUse && !cwp.canUse()){
					_this.setVisState('current_wpoint', false);
				}
			}

		}, {skip_reg: true, immediately: true});

		this.on('state_change-current_mp_md', function() {
			_this.resortQueue();
		});


		(function() {
			var wd = this.getWindow();
			var checkWindowSizes = spv.debounce(function() {
				_this.updateManyStates({
					window_height: wd.innerHeight,
					window_width: wd.innerWidth
				});
			}, 150);

			spv.addEvent(wd, 'resize', checkWindowSizes);

			//$(wd).on('resize', checkWindowSizes);
			this.onDie(function(){
				spv.removeEvent(wd, 'resize', checkWindowSizes);
				//$(wd).off('resize', checkWindowSizes);
				$(wd).off();
				$(wd).remove();
				wd = null;
				_this = null;
			});


		}).call(this);
		

	},
	/*'compx-window_demensions_key': {
		depends_on: ['window_width', 'window_height'],
		fn: function(window_width, window_height) {
			return window_width + '-' + window_height;
		}
	},*/
	resortQueue: function(queue) {
		if (queue){
			queue.removePrioMarks();
		} else {
			for (var i = 0; i < this.all_queues.length; i++) {
				this.all_queues[i].removePrioMarks();
			}
		}
		var md = this.getNesting('current_mp_md');
		var view = md && this.getStoredMpx(md).getRooConPresentation(this, true);
		if (view){
			view.setPrio();
		}
	},
	onDomBuild: function() {
		this.c = $(this.d.body);
		this.used_data_structure = getUsageTree.call(this, getUsageTree, this);

		this.RPCLegacy('knowViewingDataStructure', this.constr_id, this.used_data_structure);
		console.log(this.used_data_structure);

		this.c.addClass('app-loaded');
		var ext_search_query = this.els.search_input.val();
		//must be before start_page view set its value to search_input
		this.RPCLegacy('checkUserInput', {
			ext_search_query: ext_search_query
		});


		this.completeDomBuilding();
		//JSON.stringify({ uno: 1, dos : 2 }, null, '\t')


	},
	
	
	
	
	
	toggleBodyClass: function(add, class_name){
		if (add){
			this.c.addClass(class_name);
		} else {
			this.c.removeClass(class_name);
		}
	},
	
	parts_builder: {
		//samples
		alb_prev_big: function() {
			return this.els.ui_samples.children('.album_preview-big');
		},
		'song-view': function() {
			return this.els.ui_samples.children('ul').children('.song-view');
		},
		artcard: function() {
			return this.els.ui_samples.children('.art_card');
		},
		track_c: function() {
			return this.els.ui_samples.children('.track-context');
		},
		lfm_authsampl: function() {
			return this.els.ui_samples.children('.lfm-auth-module');
		},
		lfm_scrobling: function() {
			return this.els.ui_samples.children('.scrobbling-switches');
		}
	},
	handleSearchForm: function(form_node) {
		var tpl = this.createTemplate(form_node);
		this.tpls.push(tpl);

	},
	handleStartScreen: function(start_screen) {
		var st_scr_scrl_con = start_screen.parent();
		var start_page_wrap = st_scr_scrl_con.parent();
		var tpl = new this.PvTemplate({
			node: start_page_wrap,
			spec_states: {
				'$lev_num': -1
			},
			struc_store: this.struc_store,
			calls_flow: this._getCallsFlow(),
			getSample: this.getSampleForTemplate
		});

		this.tpls.push(tpl);

		this.lev_containers[-1] = {
			c: start_page_wrap,
			material: start_screen,
			scroll_con: st_scr_scrl_con
		};
	},
	buildAppDOM: function() {
		var _this = this;
		var d = this.d;


		var wd = this.getWindow();
		_this.updateManyStates({
			window_height: wd.innerHeight,
			window_width: wd.innerWidth
		});
		
			console.log('dom ready');

			var slider = d.getElementById('slider');
			var screens_block = $('#screens',d);


			if (app_env.check_resize){
				var detectSize = function(D){
					if (!D){
						return 0;
					} else {
						return $(D).outerHeight();
					}

					//return Math.max(D.scrollHeight, D.offsetHeight, D.clientHeight);
				};
				var getCurrentNode = function() {
					var current_md = _this.getNesting('current_mp_md');
					return current_md && _this.getStoredMpx(current_md).getRooConPresentation(this, true, true).getC();
				};

				var readySteadyResize = function(){
					if (_this.rsd_rz){
						clearInterval(_this.rsd_rz);
					}

					var oldsize = detectSize(getCurrentNode());
					var offset_top;


					var recheckFunc = function(){
						if (typeof documentScrollSizeChangeHandler == 'function'){
							var newsize = detectSize(getCurrentNode());

							if (oldsize != newsize){
								if (typeof offset_top == 'undefined'){
									var offset = $(getCurrentNode()).offset();
									offset_top = (offset && offset.top) || 0;
								}
								documentScrollSizeChangeHandler((oldsize = newsize) + offset_top);
							}

						}
					};

					_this.rsd_rz = setInterval(recheckFunc,100);
					_this.on('vip_state_change-current_mp_md.resize-check', function() {
						recheckFunc();
					}, {
						exlusive: true,
						immediately: true
					});
				};
				readySteadyResize();

			}

			(function(_this) {
				var app_workplace_width_stream_node = $("#pages_area_width_streamer", d);
				var awwst_win =  app_workplace_width_stream_node[0].contentWindow;
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


			})(_this);

			



			var ui_samples = $('#ui-samples',d);


			var search_form = $('#search',d);
			search_form.find('#app_type').val(app_env.app_type);
			search_form.submit(function(){return false;});
			var search_input =  $('#q', search_form);
			_this.search_input = search_input;
			_this.dom_related_props.push('search_input');

			search_input.on('keyup change input', spv.throttle(function() {
				var input_value = this.value;
				_this.overrideStateSilently('search_query', input_value);
				_this.RPCLegacy('search', input_value);
			}, 100));

			search_input.on('keyup', spv.throttle(function(e) {
				if (e.keyCode == 13) {
					_this.RPCLegacy('refreshSearchRequest', Date.now());
				}
			}, 100));

			search_input.on('activate_waypoint', function() {
				search_input.focus();
			});

			_this.onDie(function() {
				search_input = null;
			});


			
			var app_map_con = screens_block.children('.app_map_con');


			//var shared_parts_c = app_map_con.children('.shared-parts');

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
						node: $(d.body),
						offset: true
					};
				}

				/*
				*/
			}

			var start_screen = $('#start-screen',d);

			_this.handleSearchForm(search_form);

			spv.cloneObj(_this.els, {
				ui_samples: ui_samples,
				screens: screens_block,
				app_map_con: app_map_con,
				scrolling_viewport: scrolling_viewport,
				slider: slider,
				navs: $(slider).children('.navs'),
				start_screen: start_screen,
				search_input: search_input,
				search_form: search_form,
				pestf_preview: start_screen.children('.personal-stuff-preview')
			});
			_this.handleStartScreen(start_screen);
			



			


			



			$('#widget-url',d).val(location.href.replace('index.html', ''));


			if (app_env.bro.browser.opera && ((typeof window.opera.version == 'function') && (parseFloat(window.opera.version()) <= 10.1))){

				$('<a id="close-widget">&times;</a>',d)
					.click(function(){
						window.close();
					})
					.prependTo(_this.els.slider);
			}



			var vklc = ui_samples.children('.vk-login-context');

			spv.cloneObj(_this.samples, {
				vklc: vklc,
				vk_login: {
					o: vklc,
					oos: $(),
					hideLoadIndicator: function(){
						this.oos.removeClass('waiting-auth');
						this.load_indicator = false;
					},
					showLoadIndicator:function() {
						this.oos.addClass('waiting-auth');
						this.load_indicator = true;
					},
					remove: function(){
						this.oos.remove();
						this.oos = $();
						su.vk.wait_for_finish = false;
					},
					resetAuth: function(){
						this.oos.find('.auth-container').empty();
					},
					finishing: function(){
						su.vk.wait_for_finish = true;

						this.oos.addClass('vk-finishing');
					},
					vk_login_error: $(),
					captcha_img: $(),
					clone: function(request_description){
						var _this = this;
						var nvk = this.o.clone();
						if (su.vk.wait_for_finish){
							nvk.addClass('vk-finishing');
						}


						if (this.load_indicator){
							nvk.addClass('waiting-auth');
						}
						if (request_description){
							nvk.find('.login-request-desc').text(request_description);
						}
						var auth_c =  nvk.find('.auth-container');
						nvk.find('.sign-in-to-vk').click(function(e){
							var class_name = this.className;
							var clicked_node = $(this);

							var vkdomain = class_name.match(/sign-in-to-vk-ru/) ? 'vkontakte.ru' : 'vk.com';
							if (su.vk_app_mode){
								if (window.VK){
									VK.callMethod('showSettingsBox', 8);
								}
							} else{

								su.vk_auth.requestAuth({
									ru: class_name.match(/sign-in-to-vk-ru/) ? true: false,
									c: _this
								});

							}


							e.preventDefault();
						});
						var input = nvk.find('.vk-code');
						nvk.find('.use-vk-code').click(function() {
							var vk_t_raw = input.val();
							_this.RPCLegacy('vkSessCode', vk_t_raw);
						});

						_this.oos =  _this.oos.add(nvk);
						return nvk;
					}
				}

			});

			//_this.els.search_label = _this.els.search_form.find('#search-p').find('.lbl');

			var justhead = _this.els.navs;
			var daddy = justhead.find('.daddy');
			var np_button = justhead.find('.np-button');
			_this.nav = {
				justhead: justhead,
				daddy: daddy,
				np_button: np_button.remove()
			};

			_this.nav.daddy.empty().removeClass('not-inited');
			_this.dom_related_props.push('nav');


			var npbClickCallback = function(){
				_this.RPCLegacy('showNowPlaying');
			};
			np_button.click(npbClickCallback);

			_this.onDie(function() {
				np_button.off();
			});

			_this.addWayPoint(np_button, {
				canUse: function() {
					return !_this.state('viewing_playing');
				}
			});

			var nptpl = new _this.PvTemplate({
				node: np_button,
				struc_store: _this.struc_store,
				calls_flow: _this._getCallsFlow(),
				getSample: _this.getSampleForTemplate
			});
			_this.tpls.push(nptpl);

			daddy.append(np_button);
			var d_click_callback = function(e) {
				e.preventDefault();
				app_env.openURL($(this).attr('href'));
				seesu.trackEvent('Links', 'just link');
			};

			$(d).on('click', '.external', d_click_callback);
			_this.onDie(function() {
				$(d).off('click', d_click_callback);
			});

			_this.onDomBuild();


			var kd_callback = function(e){
				if (d.activeElement && d.activeElement.nodeName == 'BUTTON'){return;}
				if (d.activeElement && d.activeElement.nodeName == 'INPUT'){
					if (e.keyCode == 27) {
						d.activeElement.blur();
						e.preventDefault();
						return;
					}
				}

				_this.arrowsKeysNav(e);
			};

			$(d).on('keydown', kd_callback);

			_this.onDie(function() {
				$(d).off('keydown', kd_callback);
			});

			_this.RPCLegacy('attachUI', this.view_id);

			_this.onDie(function() {
				_this = null;
				d = null;
			});
	},
	inputs_names: ['input'],
	key_codes_map:{
		'13': 'Enter',
		'37': 'Left',
		'39': 'Right',
		'40': 'Down',
		'63233': 'Down',
		'38': 'Up',
		'63232': 'Up'
	},
	arrowsKeysNav: function(e) {
		var
			key_name,
			_key = e.keyCode;

		var allow_pd;
		if (this.inputs_names.indexOf(e.target.nodeName.toLowerCase()) == -1){
			allow_pd = true;
		}
		key_name = this.key_codes_map[e.keyCode];

		if (key_name && allow_pd){
			e.preventDefault();
		}
		if (key_name){
			//this.RPCLegacy('keyNav', key_name);
			this.wp_box.wayPointsNav(key_name);
		}
	},
	scrollToWP: function(cwp) {
		if (cwp){
			var cur_md_md = this.getNesting('current_mp_md');
			var parent_md = cur_md_md.getParentMapModel();
			if (parent_md && cwp.view.getAncestorByRooViCon('main') == this.getStoredMpx(parent_md).getRooConPresentation(this)){
				this.scrollTo($(cwp.node), {
					node: this.getLevByNum(parent_md.map_level_num).scroll_con
				}, {vp_limit: 0.6, animate: 117});
			}
			this.scrollTo($(cwp.node), false, {vp_limit: 0.6, animate: 117});
		}
	},
	'stch-vis_current_wpoint': function(nst, ost) {
		if (ost){
			$(ost.node).removeClass('surf_nav');
		}
		if (nst) {
			$(nst.node).addClass('surf_nav');
			//if (nst.view.getRooConPresentation(this) ==)

			this.scrollToWP(nst);

			//
		}
	},
	
	appendStyle: function(style_text){
		//fixme - check volume ondomready
		var style_node = this.d.createElement('style');
			style_node.setAttribute('title', 'button_menu');
			style_node.setAttribute('type', 'text/css');

		if (!style_node.styleSheet){
			style_node.appendChild(this.d.createTextNode(style_text));
		} else{
			style_node.styleSheet.cssText = style_text;
		}

		this.d.documentElement.firstChild.appendChild(style_node);

	},
	verticalAlign: function(img, opts){
		//target_height, fix
		var real_height = opts.real_height || (img.naturalHeight ||  img.height);
		if (real_height){
			var offset = (opts.target_height - real_height)/2;

			if (offset){
				if (opts.animate){
					$(img).animate({'margin-top':  offset + 'px'}, opts.animate_time || 200);
				} else {
					$(img).css({'margin-top':  offset + 'px'});
				}

			}
			return offset;
		}
	},
	preloadImage: function(src, alt, callback, place){
		var image = document.createElement('img');
		if (alt){
			image.alt= alt;
		}

		image.onload = function(){
			if (callback){
				callback(image);
			}
		};
		if (place){
			$(place).append(image);
		}
		image.src = src;
		if (image.complete){
			setTimeout(function(){
				if (callback){
					callback(image);
				}
			}, 10);

		}
		return image;
	},
	getAcceptedDesc: function(rel){
		var link = rel.info.domain && ('https://vk.com/' + rel.info.domain);
		if (link && rel.info.full_name){
			return $('<a class="external"></a>').attr('href', link).text(rel.info.full_name);
		}  else if (rel.item.est){
			return $("<span class='desc'></span>").text(su.getRemainTimeText(rel.item.est, true));
		}
	},
	

	create_youtube_video: function(id){
		var youtube_video = document.createElement('embed');
		if (!app_env.chrome_like_ext){
			if (app_env.opera_widget){
				youtube_video.setAttribute('wmode',"transparent");
			} else if (app_env.opera_extension){
				youtube_video.setAttribute('wmode',"opaque");
			}
		}
		

		youtube_video.setAttribute('type',"application/x-shockwave-flash");
		youtube_video.setAttribute('src', 'https://www.youtube.com/v/' + id + '&autoplay=1');
		youtube_video.setAttribute('allowfullscreen',"true");
		youtube_video.setAttribute('class',"you-tube-video");

		return youtube_video;
	},
	bindLfmTextClicks: function(con) {
		con.on('click', 'a', function(e) {
			var node = $(this);
			var link = node.attr('href');
			if (node.is('.bbcode_artist')){
				e.preventDefault();

				var artist_name = decodeURIComponent(link.replace('http://www.last.fm/music/','').replace(/\+/g, ' '));
				su.showArtcardPage(artist_name);
				seesu.trackEvent('Artist navigation', 'bbcode_artist', artist_name);
			} else if (node.is('.bbcode_tag')){
				e.preventDefault();

				var tag_name = decodeURIComponent(link.replace('http://www.last.fm/tag/','').replace(/\+/g, ' '));
				su.show_tag(tag_name);
				seesu.trackEvent('Artist navigation', 'bbcode_tag', tag_name);
			} else {
				e.preventDefault();
				app_env.openURL(link);
				seesu.trackEvent('Links', 'just link');
			}
		});

	},
	loadImage: function(opts) {
		if (opts.url){
			var queue;
			if (opts.url.indexOf('last.fm') != -1){
				queue = this.lfm_imgq;
			} else if (opts.url.indexOf('discogs.com') != -1) {
				queue = this.dgs_imgq;
			} else if (opts.url.indexOf('http://s.pixogs.com') != -1) {
				queue = this.dgs_imgq_alt;
			}
			opts.timeout = opts.timeout || 40000;
			opts.queue = opts.queue || queue;
			return app_serv.loadImage(opts);
		}
	},
	createNiceButton: function(position){
		var c = $('<span class="button-hole"><a class="nicebutton"></a></span>');
		var b = c.children('a');

		if (position == 'left'){
			c.addClass('bposition-l');
		} else if (position == 'right'){
			c.addClass('bposition-r');
		}

		var bb = {
			c: c,
			b: b,
			_enabled: true,
			enable: function(){
				if (!this._enabled){
					this.b.addClass('nicebutton').removeClass('disabledbutton');
					this.b.data('disabled', false);
					this._enabled = true;
				}
				return this;

			},
			disable: function(){
				if (this._enabled){
					this.b.removeClass('nicebutton').addClass('disabledbutton');
					this.b.data('disabled', true);
					this._enabled = false;
				}
				return this;
			},
			toggle: function(state){
				if (typeof state != 'undefined'){
					if (state){
						this.enable();
					} else {
						this.disable();
					}
				}

			}
		};
		bb.disable();
		return bb;
	}
});

return AppView;
});
