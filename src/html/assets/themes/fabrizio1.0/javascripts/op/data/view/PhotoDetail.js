(function($){
  
  var CommentView = Backbone.View.extend({
    template : _.template($('#photo-comment-tmpl').html()),
    render : function(){
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }
  });
  
  var CommentsView = Backbone.View.extend({
    template : _.template($('#photo-comments-tmpl').html()),
    render : function(){
      $(this.el).html(this.template(this.model.toJSON()));
      this.updateCommentList();
      return this;
    },
    updateCommentList : function(){
      // how do we know what comments
      $el = $(this.el).find('ul.comment-list');
      $el.empty().hide();
      // get the comments...
      var actions = this.model.get('actions');
      
      /**
       *
       * DEMO to be replaced with the real actions
       *
       */
      actions = [{
        type: 'comment',
        name: 'Mark',
        email: 'fabrizim@owlwatch.com',
        avatar: 'http://openphotofabrizio.s3.amazonaws.com/custom/201212/7d0cae-IMG_4413_100x100xCR.jpg',
        value: 'ZOMG! This is like wicked awesome!',
        date : 'January 11, 2013 12:07am EST'
      },{
        type: 'comment',
        name: 'Mark',
        email: 'fabrizim@owlwatch.com',
        avatar: 'http://openphotofabrizio.s3.amazonaws.com/custom/201212/7d0cae-IMG_4413_100x100xCR.jpg',
        value: 'Meh.',
        date : 'January 11, 2013 12:11am EST'
      }];
      
      $(this.el).find('.comment-count').html( actions.length );
      _.each(actions, function(action){
        var model = new Backbone.Model(action);
        $el.append(new CommentView({model: model}).render().el);
      });
      $el.show();
    }
  });
  
  var TitleView = op.data.view.Editable.extend({
    template : _.template($('#photo-detail-title-tmpl').html()),
    editable    : {
      '.title.edit' : {
        name: 'title',
        title: 'Edit Photo Title',
        placement: 'bottom'
      }
    }
  });
  
  var DescriptionView = op.data.view.Editable.extend({
    template : _.template($('#photo-detail-description-tmpl').html()),
    editable    : {
      '.text.edit' : {
        type: 'textarea',
        name: 'description',
        title: 'Edit Photo Description',
        emptytext: 'Add a description',
        placement: 'top'
      }
    }
  });
  
  op.ns('data.view').PhotoDetail = op.data.view.Editable.extend({
    initialize: function() {
      Backbone.history.start({pushState: true});
      this.router = new Backbone.Router();
      this.model.on('change', this.modelChanged, this);
      this.on('afterrender', this.onAfterRender, this);
      this.store = op.data.store.Photos;
      this.initialModel = this.model;
      this.thumbs = {};
      var self = this;
      op.Lightbox.getInstance().on('updatemodel', function(model){
        self.go(model.get('id'));
      });
    },
    model: this.model,
    className: 'photo-detail-meta',
    template    :_.template($('#photo-detail-meta').html()),
    modelChanged: function() {
      this.render();
    },
    
    /**
     * TODO - need to figure out how to get the user data for the owner of the image
     *
     */
    onAfterRender: function(){
      this.setupPagination();
      this.updateViews();
    },
    
    updateModel : function(model){
      this.model.off(null,null,this);
      this.model = model;
      this.model.on('change', this.updateViews, this);
      this.updateViews();
      // change the main image
      $(this.el).find('.photo img')
        .attr('src', this.model.get('path870x550'))
      $(this.el).find('.photo .photo-view-modal-click')
        .attr('data-id', this.model.get('id'))
    },
    
    updateViews : function(){
      this.updateUserBadge();
      this.updateComments();
      this.updateTitle();
      this.updateDescription();
    },
    
    updateTitle : function(){
      var el = $(this.el).find('.photo-title');
      new TitleView({el:el, model: this.model}).render();
    },
    
    updateDescription : function(){
      var el = $(this.el).find('.description');
      new DescriptionView({el:el, model: this.model}).render();
    },
    
    setupPagination : function(){
      var $scroller = $(this.el).find('.pagination .photos .scroller')
        , shimDiv
      
      $(this.el).find('.pagination .arrow-prev').click(_.bind(this.prev, this));  
      $(this.el).find('.pagination .arrow-next').click(_.bind(this.next, this));
      
      
      // create the shim...
      shimDiv = $('<div class="thumb thumb-shim"><div class="border"><div class="inner" /></div></div>')
        .appendTo($(this.el).find('.pagination .photos .scroller .thumbs'));
        
      $('<img />')
        .attr('src', this.model.get('path90x90xCR'))
        .appendTo(shimDiv.find('.inner'))
      
      this.addModel(this.model);
      this.addPreviousFromModel(this.model);
      this.addNextFromModel(this.model);
    },
    
    addPreviousFromModel : function(model){
      this._addMoreFromModel(model, 'next');
    },
    
    addNextFromModel : function(model){
      this._addMoreFromModel(model, 'previous');
    },
    
    _addMoreFromModel : function(model, dir){
      if( !dir ) dir = 'next';
      if( (ar = this.model.get(dir)) && ar.length ){
        for(var i=0; i<ar.length; i++ ){
          var m = new op.data.model.Photo(ar[i]);
          if( ar.length === 1 ){
            m[dir==='next'?'_last':'_first'] = true;
          }
          this.addModel(m, dir==='next');
        }
      }
      else {
        this.model[dir==='next'?'_last':'_first'] = true;
      }
    },
    
    addModel : function(model, pos){
      if( (m = this.store.get(model.get('id'))) ){
        this.addThumbNav(m);
        return m;
      }
      
      this.store[pos===false?'unshift':'push'](model);
      this.addThumbNav(model);
      
      /**
       * TODO - figure out why routing won't work...
       *
      var self = this
        , a = document.createElement('a');
        
      a.href = model.get('url');
      this.router.route( a.pathname, 'photo_'+model.get('id'), function(){
        self.go(model.get('id'));
      });
      this.router.on('route:photo_'+model.get('id'), function(){
        
      });
      */
      return model;
    },
    
    addThumbNav : function(model){
      var t
        , id = model.get('id')
        
      if( (t = this.thumbs[id]) ){
        return t;
      }
      
      // get the difference
      var init = _.indexOf( this.store.models, this.initialModel )
        , diff = _.indexOf( this.store.models, model ) - init
        , x = diff * 33.33333333 + 33.33333333 + .625;
        
      t = this.thumbs[id] = $('<div class="thumb" />')
        .appendTo( $(this.el).find('.pagination .photos .scroller .thumbs') )
        .css({left: x+'%'})
        .click(_.bind(this.thumbClick, this, model.get('id')))
        
      var b = $('<div class="border" />').appendTo(t);
      var b2 = $('<div class="inner" />').appendTo(b);
      
      var i = $('<img />')
        .attr('src', model.get('path90x90xCR'))
        .appendTo(b2);
        
      if( this.model == model )
        t.addClass('active');
        
      return t;
    },
    
    thumbClick : function(id){
      /**
       * TODO - this is where you would call the router kmethod
       * if it was working.
       */
      //this.router.navigate('/p/'+id, {trigger: true});
      this.go(id);
    },
    
    next : function(){
      var cur = _.indexOf( this.store.models, this.model );
      if( cur < this.store.models.length-1 ){
        this.go( this.store.at(cur + 1).get('id') );
      }
    },
    
    prev : function(){
      var cur = _.indexOf( this.store.models, this.model );
      if( cur > 0 ){
        this.go( this.store.at(cur - 1).get('id') );
      }
    },
    
    go : function(id){
      
      if( this.model === this.store.get(id)) return;
      
      // get the difference
      var init = _.indexOf( this.store.models, this.initialModel )
        , diff = _.indexOf( this.store.models, this.store.get(id) ) - init
      
      $(this.el).find('.pagination .photos .scroller .thumbs')
        .stop()
        .animate({'left': (33.33333333*-1*diff)+'%'}, 200)
      
      $(this.el).find('.pagination .photos .scroller .thumbs .thumb').removeClass('active');
      this.thumbs[id].addClass('active');
      
      // lets also get next/prev
      var x = _.indexOf( this.store.models, this.store.get(id) )
        , c = _.indexOf( this.store.models, this.model )
        
      this.loadMore( x > c );
      this.updateModel(this.store.get(id));
    },
    
    loadMore : function( dir ){
      var model
        , self = this
        , apiParams = {nextprevious:'1', returnSizes:'90x90xCR,870x550'}
        , endpoint
        , fn = 'next';
        
      if( dir ){
        // going to add more to the end...
        // first lets get the last model in the store
        // and check if its the last one
        var model = this.store.at( this.store.models.length-1 );
        if( model._last ) return;
      }
      else {
        fn = 'previous';
        var model = this.store.at(0);
        if( model._first ) return;
      }
      
      endpoint = TBX.init.pages.photo.filterOpts ?
        '/photo/'+model.get('id')+'/view.json' :
        '/photo/'+model.get('id')+'/'+TBX.init.pages.photo.filterOpts+'/view.json' ;
      
      OP.Util.makeRequest(endpoint, apiParams, function(response) {
        model.set('next', response.result.next);
        model.set('prev', response.result.prev);
        self._addMoreFromModel(model, fn);
      }, 'json', 'get');
    },
    
    updateUserBadge : function(){
      // update the user badge...
      var $el = $(this.el).find('.userbadge')
        , model = op.data.store.Profiles.get(this.model.get('owner'))
      
      if( model ){
        (new op.data.view.UserBadge({el: $el, model: model})).render();
      }
    },
    
    updateComments : function(){
      var $el = $(this.el).find('.comments');
      (new CommentsView({el: $el, model: this.model})).render();
    }
  });
})(jQuery);

