/**
 * @file
 * SCORM 2004 API Implementation.
 */

(function($) {
  'use strict';

  var cmi = window.cmi || {},
      errorCode = '0',
      initialized = false,
      terminated = false;

  window.API_1484_11 = {
    /**
     * Initialize.
     *
     * @param param
     * @returns {string}
     * @constructor
     */
    Initialize: function(param) {
      var result = 'false';

      errorCode = '0';

      if (param) {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (!initialized) {
        $.when(cmi.init('2004')).done(function(result) {
          initialized = result;
        });

        if (!initialized) {
          // Init error.
          errorCode = '102';
        }
        else {
          terminated = false;
          result = 'true';
        }
      }
      else {
        // Already initialized.
        errorCode = '103';
      }

      return result;
    },

    /**
     * Terminate.
     *
     * @param param
     * @returns {string}
     * @constructor
     */
    Terminate: function(param) {
      var result = 'false';

      errorCode = '0';

      if (param !== '') {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (initialized) {
        initialized = false;
        terminated = true;
        result = 'true';

        // Store data.
        cmi.commit();
      }
      else {
        if (terminated) {
          // Term after term.
          errorCode = '113';
        }
        else {
          // Term before init.
          errorCode = '112';
        }
      }

      return result;
    },

    /**
     * Get value.
     *
     * @param element
     * @returns {string}
     * @constructor
     */
    GetValue: function(element) {
      var result = '';

      errorCode = '0';

      if (initialized) {
        if (element !== '') {
          // Get element value.
          result = cmi.getValue(element);
        }
        else {
          // Argument error.
          errorCode = '201';
        }
      }
      else {
        if (terminated) {
          // Get value after term.
          errorCode = '123';
        }
        else {
          // Get value before init.
          errorCode = '122';
        }
      }

      return result;
    },

    /**
     * Set value.
     *
     * @param element
     * @param value
     * @returns {string}
     * @constructor
     */
    SetValue: function(element, value) {
      var result = 'false';

      errorCode = '0';

      if (initialized) {
        if (element === '') {
          // Argument error.
          errorCode = '201';

          return result;
        }

        // Store element value.
        if (!cmi.setValue(element, value)) {
          // Set error.
          errorCode = '351';
        }
        else {
          result = 'true';
        }
      }
      else {
        if (terminated) {
          // Store data after term.
          errorCode = '133';
        }
        else {
          // Store data before init.
          errorCode = '132';
        }
      }

      return result;
    },

    /**
     * Commit.
     *
     * @param param
     * @returns {string}
     * @constructor
     */
    Commit: function(param) {
      var result = 'false';

      errorCode = '0';

      if (param !== '') {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (initialized) {
        // Store data.
        if (cmi.commit()) {
          result = 'true';
        }
        else {
          // Commit error.
          errorCode = '391';
        }
      }
      else {
        if (terminated) {
          // Commit after term.
          errorCode = '143';
        }
        else {
          // Commit before init.
          errorCode = '142';
        }
      }

      return result;
    },

    /**
     * Get last error.
     *
     * @returns {string}
     * @constructor
     */
    GetLastError: function() {
      return errorCode;
    },

    /**
     * Get error string.
     *
     * @param param
     * @returns {*}
     * @constructor
     */
    GetErrorString: function(param) {
      if (!param) {
        return '';
      }

      var errorString = {
        '0': 'No error',
        '101': 'General exception',
        '102': 'General initialization failure',
        '103': 'Already initialized',
        '104': 'Content instance terminated',
        '111': 'General termination failure',
        '112': 'Termination before initialization',
        '113': 'Termination after termination',
        '122': 'Retrieve data before initialization',
        '123': 'Retrieve data after termination',
        '132': 'Store data before initialization',
        '133': 'Store data after termination',
        '142': 'Commit before initialization',
        '143': 'Commit data after termination',
        '201': 'General argument error',
        '301': 'General get failure',
        '351': 'General set failure',
        '391': 'General commit failure',
        '401': 'Undefined data model element',
        '402': 'Unimplemented data model element',
        '403': 'Data model element not initialized',
        '404': 'Data model element is read only',
        '405': 'Data model element is write only',
        '406': 'Data model element type mismatch',
        '407': 'Data model element value out of range',
        '408': 'Data model dependency not established'
      };

      return errorString[param];
    },

    /**
     * Get diagnostic.
     *
     * @returns {string}
     * @constructor
     */
    GetDiagnostic: function() {
      var result = '';

      if (cmi.diagnostic) {
        result = cmi.diagnostic;
        cmi.diagnostic = '';
      }
      else if (errorCode) {
        result = errorCode;
      }

      return result;
    }
  };

})(H5P.jQuery);
