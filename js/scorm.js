/**
 * @namespace H5P
 */
var H5P = H5P || {};

/**
 * Constructor.
 *
 * @param {Object} params Options for this library.
 * @param {Number} id Content identifier
 * @returns {undefined}
 */
(function($) {
  H5P.Scorm = function(params, id) {
    H5P.EventDispatcher.call(this);

    this.scorm = params.scorm || {};
    this.aspect = params.aspect || 0.75;
  };

  H5P.Scorm.prototype = Object.create(H5P.EventDispatcher.prototype);
  H5P.Scorm.prototype.constructor = H5P.Scorm;

  /**
   * Attach navigation buttons.
   *
   * @param {Object} $wrapper Object
   */
  H5P.Scorm.prototype.attachNavigation = function($wrapper) {
    var html = '<div id="sco-nav-wrapper">' +
        '<div id="sco-nav">' +
        '<button id="sco-nav-first"><i class="fa fa-angle-double-left" aria-hidden="true"></i></button>' +
        '<button id="sco-nav-prev"><i class="fa fa-angle-left" aria-hidden="true"></i></button>' +
        '<button id="sco-nav-next"><i class="fa fa-angle-right" aria-hidden="true"></i></button>' +
        '<button id="sco-nav-last"><i class="fa fa-angle-double-right" aria-hidden="true"></i></button>' +
        '</div>' +
        '</div>',
        id = this.scorm.params.itemId,
        itemId = 0;

    $wrapper.append(html);

    this.$navWrapper = $('#sco-nav-wrapper');
    this.navDisable();

    if (typeof this.scorm.pages[0] === 'object') {
      if (id) {
        $.each(this.scorm.pages, function(key, value) {
          if (id == value.id) {
            itemId = key;
            return;
          }
        });
      }

      this.navTo(this.scorm.pages[itemId]);
    }

    var self = this;

    $('#sco-nav-first', this.$navWrapper).click(function() {
      self.navMoveFirst();
    });

    $('#sco-nav-prev', this.$navWrapper).click(function() {
      self.navMovePrev();
    });

    $('#sco-nav-next', this.$navWrapper).click(function() {
      self.navMoveNext();
    });

    $('#sco-nav-last', this.$navWrapper).click(function() {
      self.navMoveLast();
    });
  };

  // Disable navigation buttons.
  H5P.Scorm.prototype.navDisable = function() {
    $('#sco-nav-first', this.$navWrapper).attr('disabled', 'disabled');
    $('#sco-nav-prev', this.$navWrapper).attr('disabled', 'disabled');
    $('#sco-nav-next', this.$navWrapper).attr('disabled', 'disabled');
    $('#sco-nav-last', this.$navWrapper).attr('disabled', 'disabled');
  };

  // Navigate to specific node.
  H5P.Scorm.prototype.navTo = function(item) {
    var $frame = $('#sco-iframe', this.$wrapper),
        id = item.id,
        url = decodeURIComponent(item.url),
        cmi = window.cmi || {};

    if (cmi) {
      cmi.location = '';
    }

    cmi.setValue('cmi.page_id', item.id);
    cmi.setValue('cmi.page_title', item.title);

    this.navSetActive(id);
    $frame.attr('src', url);
    $frame.attr('allowFullScreen', '');
    $frame.attr('webkitAllowFullScreen', '');
    $frame.attr('mozallowfullscreen', '');
  };

  // Set active item in nav list.
  H5P.Scorm.prototype.navSetActive = function(id) {
    var length = this.scorm.pages.length;

    if (length === 0) {
      return;
    }

    // Find index of item with matching id.
    var index = 0,
        found = false,
        item;

    this.navSetInactive();

    while (index < length) {
      item = this.scorm.pages[index];

      if (item.id === id) {
        item.active = true;
        found = true;
        break;
      }

      index++;
    }

    if (found) {
      if (cmi && cmi.hasOwnProperty('launch_data')) {
        cmi.launch_data = item.lmsdata;
      }

      this.navEnable(index);
    }
    else {
      this.navDisable();
    }
  };

  // Set all items inactive.
  H5P.Scorm.prototype.navSetInactive = function() {
    for (var i = 0; i < this.scorm.pages.length; i++) {
      this.scorm.pages[i].active = false;
    }
  };

  // Set button states based on index.
  H5P.Scorm.prototype.navEnable = function(index) {
    this.navDisable();

    if (index > 0) {
      $('#sco-nav-first', this.$navWrapper).removeAttr('disabled');
      $('#sco-nav-prev', this.$navWrapper).removeAttr('disabled');
    }

    if (index < this.scorm.pages.length - 1) {
      $('#sco-nav-last', this.$navWrapper).removeAttr('disabled');
      $('#sco-nav-next', this.$navWrapper).removeAttr('disabled');
    }
  };

  // Move to first nav item.
  H5P.Scorm.prototype.navMoveFirst = function() {
    if (this.scorm.pages.length > 0) {
      var item = this.scorm.pages[0];

      this.navTo(item);
    }
  };

  // Move to last nav item.
  H5P.Scorm.prototype.navMoveLast = function() {
    if (this.scorm.pages.length > 0) {
      var i = this.scorm.pages.length - 1,
          item = this.scorm.pages[i];

      this.navTo(item);
    }
  };

  // Move to next nav item.
  H5P.Scorm.prototype.navMoveNext = function() {
    if (this.scorm.pages.length > 0) {
      var i = this.navGetActiveIndex();

      if (i > -1 && i < this.scorm.pages.length - 1) {
        var item = this.scorm.pages[i + 1];

        this.navTo(item);
      }
    }
  };

  // Move to previous nav item.
  H5P.Scorm.prototype.navMovePrev = function() {
    if (this.scorm.pages.length > 0) {
      var i = this.navGetActiveIndex();

      if (i > 0) {
        var item = this.scorm.pages[i - 1];

        this.navTo(item);
      }
    }
  };

  // Return the index of the active item in the nav list.
  H5P.Scorm.prototype.navGetActiveIndex = function() {
    var index = -1;

    for (var i = 0; i < this.scorm.pages.length; i++) {
      if (this.scorm.pages[i].active) {
        index = i;
        break;
      }
    }

    return index;
  };

  /**
   * Wipe out the content of the wrapper and put our HTML in it.
   *
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  H5P.Scorm.prototype.attach = function($wrapper) {
    var self = this,
        height,
        url,
        cmi = window.cmi || {};

    if (self.$scorm !== undefined || !this.scorm) {
      return;
    }

    height = Math.ceil($wrapper.outerWidth() * this.aspect);

    self.$scorm = $('<iframe>', {
      width: '100%',
      height: height + 'px',
      id: 'sco-iframe',
      load: function() {
        self.trigger('loaded');
        self.trigger('resize');
      }
    });

    if (cmi && self.scorm.attempt_id) {
      cmi.lms_init_url = H5PIntegration.baseUrl + '/ajax/scorm/api/fetch/' + self.scorm.attempt_id;
      cmi.lms_commit_url = H5PIntegration.baseUrl + '/ajax/scorm/api/commit/' + self.scorm.attempt_id;
      cmi.lms_passed_url = H5PIntegration.baseUrl + '/ajax/scorm/api/passed/' + self.scorm.attempt_id;
      cmi.commit_async = false;
    }

    // TinCan.
    if (this.scorm.type === 'tincan' && this.scorm.params) {
      url = this.scorm.url +
          "?endpoint=" + encodeURIComponent(this.scorm.params.endpoint) +
          "&auth=" + encodeURIComponent(this.scorm.params.auth) +
          "&actor=" + encodeURIComponent(this.scorm.params.actor);

      if (this.scorm.params.registration) {
        url += "&registration=" + encodeURIComponent(this.scorm.params.registration);
      }

      if (this.scorm.params.activity_id) {
        url += "&activity_id=" + encodeURIComponent(this.scorm.params.activity_id);
      }

      self.$scorm.attr('src', url);
    }
    // SCORM 1.2 or 2004.
    else {
      setTimeout(function() {
        if (self.scorm.pages.length > 1) {
          self.$wrapper = $wrapper;
          self.attachNavigation($wrapper);
        }
        else if (typeof self.scorm.pages[0] === 'object') {
          self.navTo(self.scorm.pages[0]);
        }
      }, 500);
    }

    $wrapper.addClass('h5p-scorm').css('min-height', height + 'px').html(self.$scorm);
  };

  return H5P.Scorm;
}(H5P.jQuery));
