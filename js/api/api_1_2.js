/**
 * @file
 * SCORM 1.2 API Implementation.
 */

(function($) {
  'use strict';

  var cmi = window.cmi || {},
      errorCode = '0',
      initialized = false;

  window.API = {
    /**
     * Initialize.
     *
     * @param param
     * @returns {boolean}
     * @constructor
     */
    LMSInitialize: function(param) {
      var result = false;

      errorCode = '0';

      if (param !== '') {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (!initialized) {
        $.when(cmi.init('1.2')).done(function(result) {
          initialized = result;
        });

        if (initialized) {
          result = true;
        }
        else {
          // Init error.
          errorCode = '101';
        }
      }
      else {
        // Already initialized.
        errorCode = '101';
      }

      return result;
    },

    /**
     * Finish.
     *
     * @param param
     * @returns {string}
     * @constructor
     */
    LMSFinish: function(param) {
      var result = 'false';

      errorCode = '0';

      if (param !== '') {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (initialized) {
        initialized = false;

        // Store data and exit (close window).
        cmi.commit(true);
        result = 'true';
      }
      else {
        // Not initialized.
        errorCode = '301';
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
    LMSGetValue: function(element) {
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
        // Not initialized.
        errorCode = '301';
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
    LMSSetValue: function(element, value) {
      var result = 'false';

      errorCode = '0';

      if (!initialized) {
        // Not initialized.
        errorCode = '301';

        return result;
      }

      if (element !== '') {
        // store element value
        if (!cmi.setValue(element, value)) {
          // General error.
          errorCode = '101';
        }
        else {
          result = 'true';
        }
      }
      else {
        // Argument error.
        errorCode = '201';
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
    LMSCommit: function(param) {
      var result = 'false';

      errorCode = '0';

      if (param !== '') {
        // Argument error.
        errorCode = '201';

        return result;
      }

      if (initialized) {
        // Store data here.
        if (cmi.commit()) {
          result = 'true';
        }
        else {
          // Commit error.
          errorCode = '101';
        }
      }
      else {
        // Not initialized.
        errorCode = '301';
      }

      return result;
    },

    /**
     * LMS Get last error.
     *
     * @returns {string}
     * @constructor
     */
    LMSGetLastError: function() {
      return errorCode;
    },

    /**
     * Get error string.
     *
     * @param param
     * @returns {*}
     * @constructor
     */
    LMSGetErrorString: function(param) {
      if (!param) {
        return '';
      }

      var errorString = {
        '0': 'No error',
        '101': 'General exception',
        '201': 'Invalid argument error',
        '202': 'Element cannot have children',
        '203': 'Element not an array - cannot have count',
        '301': 'Not initialized',
        '401': 'Not implemented error',
        '402': 'Invalid set value, element is a keyword',
        '403': 'Element is read only',
        '404': 'Element is write only',
        '405': 'Incorrect data type'
      };

      return errorString[param];
    },

    /**
     * Get diagnostic.
     *
     * @returns {string}
     * @constructor
     */
    LMSGetDiagnostic: function() {
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
