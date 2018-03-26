/**
 * @file
 * SCORM Datamodel.
 */

(function($) {
  'use strict';

  var cmi = window.cmi = {
        scorm_version: '',
        lms_init_url: '',
        lms_commit_url: '',
        lms_passed_url: '',
        lms_completed_auto_exit: false,
        lms_completed_url: '',
        lms_completed_url_delay: 5000,
        lms_exit_url: '',
        save_log: true,
        log: '',
        comm_check: false,
        commit_async: false,
        log_suspend: true,
        children: {},
        learner_name: '',
        learner_id: '',
        location: '',
        launch_data: '',
        suspend_data: '',
        // 'ab-initio', 'resume', ''.
        entry: 'ab-initio',
        // 'credit', 'no-credit'.
        credit: 'credit',
        // RO 'browse', 'normal', 'review'.
        mode: 'normal',
        max_time_allowed: 0,
        // 'exit,message', 'continue,message', 'exit,no message',
        // 'continue no message'.
        time_limit_action: 'continue,no message',
        // 'completed', 'incomplete', 'not attempted', 'unknown'.
        completion_status: 'incomplete',
        completion_threshold: 0.0,
        // 'passed', 'failed', 'unknown'.
        success_status: 'unknown',
        progress_measure: '',
        total_time: '',
        scaled_passing_score: '',
        score_min: '',
        score_max: '',
        score_scaled: '',
        score_raw: '',
        pref_audio: 0.0,
        pref_lang: '',
        pref_speed: 0.0,
        pref_caption: 0,
        // 'time-out', 'suspend', 'logout', 'normal', ''  - '_none_' is used
        // to detect change to ''.
        exit: '_none_',
        session_time: 0,
        objectives: [],
        interactions: [],
        comments: [],
        lms_comments: [],
        diagnostic: '',
        unloaded: false,
        page_id: '',
        page_title: '',
        // Custom activity_report storage.
        activity_report: []
      },
      cmi_interaction = {
        id: '',
        type: '',
        timestamp: 0,
        weighting: 0,
        learner_response: '',
        result: '',
        latency: 0,
        description: '',
        objectives: [],
        correct_responses: []
      },
      cmi_comment = {
        comment: '',
        location: '',
        timestamp: 0
      },
      cmi_objective = {
        id: '',
        // 'passed', 'failed', 'unknown'
        success_status: '',
        // 'completed', 'incomplete', 'not attempted', 'unknown'
        completion_status: '',
        progress_measure: 0,
        description: '',
        score_min: 0,
        score_max: 0,
        score_raw: 0,
        score_scaled: 0
      };

  // Issue a commit before unload.
  cmi.unloadHandler = function() {
    if (!cmi.unloaded) {
      cmi.commit();
      cmi.unloaded = true;
    }
  };

  /**
   * Initialize cmi data.
   *
   * @param scormVersion
   * @returns {boolean}
   */
  cmi.init = function(scormVersion) {
    var result = true;

    cmi.scorm_version = scormVersion;

    if (cmi.scorm_version === '1.2') {
      cmi.children = {
        'cmi_children': 'core,suspend_data,launch_data,comments,objectives,student_data,student_preference,interactions',
        'core_children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
        'score_children': 'raw,min,max',
        'objectives_children': 'id,score,status',
        'correct_responses_children': 'pattern',
        'student_data_children': 'mastery_score,max_time_allowed,time_limit_action',
        'student_preference_children': 'audio,language,speed,text',
        'interactions_children': 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency'
      };
    }
    else if (cmi.scorm_version === '2004') {
      cmi.children = {
        'cmi_children': '_version,comments_from_learner,comments_from_lms,completion_status,credit,entry,exit,interactions,launch_data,learner_id,learner_name,learner_preference,location,max_time_allowed,mode,objectives,progress_measure,scaled_passing_score,score,session_time,success_status,suspend_data,time_limit_action,total_time',
        'comments_children': 'comment,timestamp,location',
        'score_children': 'max,raw,scaled,min',
        'objectives_children': 'progress_measure,completion_status,success_status,description,score,id',
        'correct_responses_children': 'pattern',
        'learner_preference_children': 'audio_level,audio_captioning,delivery_speed,language',
        'interactions_children': 'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description'
      };
    }

    // Init data model from host.
    if (cmi.lms_init_url !== '') {
      // Setup ajax error handling.
      $.ajaxSetup({
        error: function(jqXHR, exception) {
          if (jqXHR.status === 0) {
            cmi.diagnostic = 'Not connected.\n Verify network connection.';
          }
          else if (jqXHR.status === 404) {
            cmi.diagnostic = 'Requested page not found. [404]';
          }
          else if (jqXHR.status === 500) {
            cmi.diagnostic = 'Internal Server Error [500].';
          }
          else if (exception === 'parsererror') {
            cmi.diagnostic = 'Requested JSON parse failed.';
          }
          else if (exception === 'timeout') {
            cmi.diagnostic = 'Time out error.';
          }
          else if (exception === 'abort') {
            cmi.diagnostic = 'Ajax request aborted.';
          }
          else {
            cmi.diagnostic = 'Uncaught Error.\n' + jqXHR.responseText;
          }
        }
      });

      var data = $.ajax({
        type: 'GET',
        url: cmi.lms_init_url,
        async: false,
        cache: false,
        complete: function(jqXHR, textStatus) {
          if (textStatus !== 'success') {
            result = false;
          }
        }
      }).responseText;

      if (!result) {
        return result;
      }

      try {
        // Check for json string - must be wrapped in braces.
        var exp = /^\s*{.*}/;

        if (!exp.test(data)) {
          cmi.diagnostic = data;
          result = false;
        }
        else {
          cmi.initData(data);

          if (!window.addEventListener) {
            window.attachEvent('onbeforeunload', cmi.unloadHandler);
            window.attachEvent('onunload', cmi.unloadHandler);
          }
          else {
            window.addEventListener('beforeunload', cmi.unloadHandler, false);
            window.addEventListener('unload', cmi.unloadHandler, false);
          }
        }
      }
      catch (err) {
        cmi.diagnostic = err.message;
        console.log(err);

        result = false;
      }
    }
    else {
      console.log('LMS Init URL is not defined.');
    }

    return result;
  };

  /**
   * Retrieve cmi value.
   *
   * @param property
   * @returns {string}
   */
  cmi.getValue = function(property) {
    var result = '',
        item = property.split('.'),
        n, n2, c, inter, obj;

    if (item[0] !== 'cmi') {
      return result;
    }

    switch (item[1]) {
      case '_children':
        result = cmi.children.cmi_children;
        break;

      case '_version':
        result = cmi._version;
        break;

      case 'learner_id':
        result = cmi.learner_id;
        break;

      case 'learner_name':
        result = cmi.learner_name;
        break;

      case 'location':
        result = cmi.location;
        break;

      case 'launch_data':
        result = cmi.launch_data;
        break;

      case 'suspend_data':
        result = cmi.suspend_data;
        break;

      case 'credit':
        result = cmi.credit;
        break;

      case 'entry':
        result = cmi.entry;
        break;

      case 'completion_status':
        result = cmi.completion_status;
        break;

      case 'completion_threshold':
        result = cmi.completion_threshold;
        break;

      case 'time_limit_action':
        result = cmi.time_limit_action;
        break;

      case 'success_status':
        result = cmi.success_status;
        break;

      case 'progress_measure':
        result = cmi.progress_measure;
        break;

      case 'total_time':
        result = cmi.total_time + cmi.session_time;
        break;

      case 'mode':
        result = cmi.mode;
        break;

      case 'max_time_allows':
        result = cmi.max_time_allowed;
        break;

      case 'scaled_passing_score':
        result = cmi.scaled_passing_score;
        break;

      case 'score' :
        switch (item[2]) {
          case '_children':
            result = cmi.children['score_children'];
            break;

          case 'min':
            result = cmi.score_min;
            break;

          case 'max':
            result = cmi.score_max;
            break;

          case 'scaled':
            result = cmi.score_scaled;
            break;

          case 'raw':
            result = cmi.score_raw;
            break;
        }
        break;

      case 'learner_preference':
        switch (item[2]) {
          case '_children':
            result = cmi.children['learner_preference_children'];
            break;

          case 'audio_level':
            result = cmi.audio;
            break;

          case 'language':
            result = cmi.lang;
            break;

          case 'delivery_speed':
            result = cmi.speed;
            break;

          case 'audio_captioning':
            result = cmi.caption;
            break;
        }
        break;

        // 1.2
      case 'student_preference':
        switch (item[2]) {
          case '_children':
            result = cmi.children['student_preference_children'];
            break;

          case 'audio':
            result = cmi.audio;
            break;

          case 'language':
            result = cmi.lang;
            break;

          case 'speed':
            result = cmi.speed;
            break;

          case 'text':
            result = cmi.caption;
            break;
        }
        break;

      // 1.2
      case 'student_data' :
        switch (item[2]) {
          case '_children':
            result = cmi.children['student_data_children'];
            break;

          case 'mastery_score':
            result = cmi.scaled_passing_score;
            break;

          case 'max_time_allowed':
            result = cmi.max_time_allowed;
            break;

          case 'time_limit_action':
            result = cmi.time_limit_action;
            break;
        }
        break;

      // 1.2
      case 'comments':
        if (cmi.comments[0]) {
          result = cmi.comments[0].comment;
        }
        break;

      case 'comments_from_learner':
        switch (item[2]) {
          case '_children':
            result = cmi.children['comments_children'];
            break;

          case '_count':
            result = cmi.comments.length;
            break;

          default:
            n = parseInt(item[2]);
            if (!isNaN(n) && cmi.comments.length > n) {
              c = cmi.comments[n];
              switch (item[3]) {
                case 'comment':
                  result = c.comment;
                  break;

                case 'location':
                  result = c.location;
                  break;

                case 'timestamp':
                  result = c.timestamp;
                  break;
              }
            }

        }
        break;

      case 'comments_from_lms':
        if (cmi.scorm_version === '1.2') {
          if (cmi.lms_comments[0]) {
            result = cmi.lms_comments[0].comment;
          }
        }
        else {
          switch (item[2]) {
            case '_children':
              result = cmi.children['comments_children'];
              break;

            case '_count':
              result = cmi.lms_comments.length;
              break;

            default:
              n = parseInt(item[2]);
              if (!isNaN(n) && cmi.lms_comments.length > n) {
                c = cmi.lms_comments[n];
                switch (item[3]) {
                  case 'comment':
                    result = c.comment;
                    break;

                  case 'location':
                    result = c.location;
                    break;

                  case 'timestamp':
                    result = c.timestamp;
                    break;
                }
              }

          }
        }
        break;

      case 'interactions':
        switch (item[2]) {
          case '_children':
            result = cmi.children['interactions_children'];
            break;

          case '_count':
            result = cmi.interactions.length;
            break;

          default:
            n = parseInt(item[2]);

            if (!isNaN(n) && cmi.interactions.length > n) {
              inter = cmi.interactions[n];

              switch (item[3]) {
                case 'id':
                  result = inter.id;
                  break;

                case 'type':
                  result = inter.type;
                  break;

                case 'timestamp':
                  result = inter.timestamp;
                  break;

                  // 1.2
                case 'time':
                  result = inter.timestamp;
                  break;

                case 'weighting':
                  result = inter.weighting;
                  break;

                case 'learner_response':
                  // 1.2
                case 'student_response':
                  result = inter.learner_response;
                  break;

                case 'result':
                  result = inter.result;
                  break;

                case 'latency':
                  result = inter.latency;
                  break;

                case 'description':
                  result = inter.description;
                  break;

                case 'correct_responses':
                  if (item[4] === '_count') {
                    result = inter.correct_responses.length;
                  }
                  else {
                    n2 = parseInt(item[4]);

                    if (inter.correct_responses[n2]) {
                      result = inter.correct_responses[n2];
                    }
                  }
                  break;

                case 'objectives':
                  if (item[4] === '_count') {
                    result = inter.objectives.length;
                  }
                  else {
                    n2 = parseInt(item[4]);

                    if (inter.objectives[n2]) {
                      result = inter.objectives[n2];
                    }
                  }
                  break;
              }
            }
        }
        break;

      case 'objectives':
        switch (item[2]) {
          case '_children':
            result = cmi.children['objectives_children'];
            break;

          case '_count':
            result = cmi.objectives.length;
            break;

          default:
            n = parseInt(item[2]);

            if (!isNaN(n) && cmi.objectives.length > n) {
              obj = cmi.objectives[n];
              switch (item[3]) {
                case 'id':
                  result = obj.id;
                  break;

                case 'success_status':
                  result = obj.success_status;
                  break;

                case 'completion_status':
                  // 1.2
                case 'status':
                  result = obj.completion_status;
                  break;

                case 'progress_measure':
                  result = obj.progress_measure;
                  break;

                case 'description':
                  result = obj.description;
                  break;

                case 'score':
                  switch (item[4]) {
                    case '_children':
                      result = cmi.children['score_children'];
                      break;

                    case 'min':
                      result = obj.score_min;
                      break;

                    case 'max':
                      result = obj.score_max;
                      break;

                    case 'scaled':
                      result = obj.score_scaled;
                      break;

                    case 'raw':
                      result = obj.score_raw;
                      break;
                  }
                  break;
              }
            }
        }
        break;

        // 1.2
      case 'core':
        switch (item[2]) {
          case '_children':
            result = cmi.children['core_children'];
            break;

          case 'student_id':
            result = cmi.learner_id;
            break;

          case 'student_name':
            result = cmi.learner_name;
            break;

          case 'lesson_location':
            result = cmi.location;
            break;

          case 'credit':
            result = cmi.credit;
            break;

          case 'entry':
            result = cmi.entry;
            break;

          case 'lesson_status':
            result = cmi.completion_status;
            break;

          case 'total_time':
            result = cmi.total_time + cmi.session_time;
            break;

          case 'lesson_mode':
            result = cmi.mode;
            break;

          case 'score' :
            switch (item[3]) {
              case '_children':
                result = cmi.children['score_children'];
                break;

              case 'min':
                result = cmi.score_min;
                break;

              case 'max':
                result = cmi.score_max;
                break;

              case 'raw':
                result = cmi.score_raw;
                break;
            }
            break;
        }
        break;
    }

    return result;
  };

  /**
   * Set cmi value.
   *
   * @param property
   * @param value
   * @returns {boolean}
   */
  cmi.setValue = function(property, value) {
    var result = true,
        force_commit = false,
        force_passed = false,
        completed = false,
        item = property.split('.'),
        n, n2, c, inter, url;

    if (item[0] === 'cmi') {
      switch (item[1]) {
        case 'suspend_data':
          cmi.suspend_data = value;

          if (cmi.comm_check) {
            // Try to detect invalid strings from Articulate.
            if (value.length > 0 && value.substr(0, 1) === '|') {
              console.log('ERROR - The presentation does not appear to be communicating with the website' +
                  ' properly.\n\nThe presentation cannot continue.');

              cmi.diagnostic = 'cmi.suspend_data value is invalid';
              result = false;

              setTimeout(function() {
                window.location = cmi.lms_exit_url;
              }, 1000);
            }
          }

          force_commit = true;
          break;

        case 'location':
          cmi.location = value;
          break;

        case 'session_time':
          value = cmi._timeIntervalToSeconds(value);
          cmi.session_time = value;
          break;

        case 'completion_status':
          if (value === 'completed' || value === 'passed') {
            completed = true;
          }
          // If attempt is marked complete, don't allow sco to mark as incomplete.
          if (cmi.completion_status === 'completed' || cmi.completion_status === 'passed') {
            if (value === 'incomplete' || value === 'failed') {
              break;
            }
          }

          cmi.completion_status = value;
          force_commit = true;
          break;

        case 'success_status':
          // If attempt is marked as passed, don't allow sco to mark as failed.
          if (cmi.success_status === 'passed' && value === 'failed') {
            break;
          }

          // Set force_passed value.
          if (value === 'passed') {
            force_passed = true;
          }

          cmi.success_status = value;
          force_commit = true;
          break;

        case 'exit':
          cmi.exit = value;
          force_commit = true;

          break;

        case 'progress_measure':
          value = parseFloat(value);

          if (!isNaN(value)) {
            cmi.progress_measure = value;
          }
          break;

        case 'score':
          value = parseFloat(value);

          switch (item[2]) {
            case 'min':
              if (!isNaN(value)) {
                cmi.score_min = value;
              }
              break;

            case 'max':
              if (!isNaN(value)) {
                cmi.score_max = value;
              }
              break;

            case 'scaled':
              if (!isNaN(value)) {
                cmi.score_scaled = value;
              }
              break;

            case 'raw':
              if (!isNaN(value)) {
                cmi.score_raw = value;
              }
              break;

            default:
              result = false;
          }
          break;

        case 'learner_preference':
          value = parseFloat(value);

          switch (item[2]) {
            case 'audio_level':
              if (!isNaN(value)) {
                cmi.audio = value;
              }
              break;

            case 'language':
              cmi.lang = value;
              break;

            case 'delivery_speed':
              if (!isNaN(value)) {
                cmi.speed = value;
              }
              break;

            case 'audio_captioning':
              if (!isNaN(value)) {
                cmi.caption = value;
              }
              break;

            default:
              result = false;
              break;
          }
          break;

          // 1.2
        case 'student_preference':
          value = parseFloat(value);

          switch (item[2]) {
            case 'audio':
              if (!isNaN(value)) {
                cmi.audio = value;
              }
              break;

            case 'language':
              cmi.lang = value;
              break;

            case 'speed':
              if (!isNaN(value)) {
                cmi.speed = value;
              }
              break;

            case 'text':
              if (!isNaN(value)) {
                cmi.caption = value;
              }
              break;

            default:
              result = false;
              break;
          }
          break;

          // 1.2
        case 'comments':
          c = Object.create(cmi_comment);
          c.comment = value;
          cmi.comments[0] = c;
          break;

        case 'comments_from_learner':
          n = parseInt(item[2]);

          if (!isNaN(n)) {
            if (cmi.comments.length > n) {
              c = cmi.comments[n];
            }
            else {
              c = Object.create(cmi_comment);
              cmi.comments[n] = c;
            }

            switch (item[3]) {
              case 'comment':
                c.comment = value;
                break;

              case 'location':
                c.location = value;
                break;

              case 'timestamp':
                value = Date.parse(value);

                if (value > 0) {
                  value = value / 1000;
                }
                break;

              default:
                result = false;
            }

            cmi.comments[n] = c;
          }
          else {
            result = false;
          }
          break;

        case 'interactions':
          n = parseInt(item[2]);

          if (!isNaN(n)) {
            if (cmi.interactions.length > n) {
              inter = cmi.interactions[n];
            }
            else {
              inter = Object.create(cmi_interaction);
              cmi.interactions[n] = inter;
            }

            switch (item[3]) {
              case 'id':
                inter.id = value;
                break;

              case 'type':
                inter.type = value;
                break;

              case 'time':
              case 'timestamp':
                inter.timestamp = value;
                break;

              case 'weighting':
                value = parseFloat(value);

                if (!isNaN(value)) {
                  inter.weighting = value;
                }
                break;

              case 'learner_response':
                // 1.2
              case 'student_response':
                inter.learner_response = value;
                break;

              case 'result':
                inter.result = value;
                break;

              case 'latency':
                inter.latency = value;
                break;

              case 'description':
                inter.description = value;
                break;

              case 'correct_responses':
                n2 = parseInt(item[4]);

                if (!isNaN(n2)) {
                  inter.correct_responses[n2] = value;
                }
                break;

              case 'objectives':
                n2 = parseInt(item[4]);

                if (!isNaN(n2)) {
                  inter.objectives[n2] = value;
                }
                break;

              default:
                result = false;
            }

            cmi.interactions[n] = inter;
          }
          else {
            result = false;
          }
          break;

        case 'objectives':
          n = parseInt(item[2]);

          if (!isNaN(n)) {
            var obj = null;

            if (cmi.objectives.length > n) {
              obj = cmi.objectives[n];
            }
            else {
              obj = Object.create(cmi_objective);
              cmi.objectives[n] = obj;
            }

            switch (item[3]) {
              case 'id':
                obj.id = value;
                break;

              case 'success_status':
                obj.success_status = value;
                break;

              case 'completion_status':
                // 1.2
              case 'status':
                obj.completion_status = value;
                break;

              case 'progress_measure':
                value = parseFloat(value);

                if (!isNaN(value)) {
                  obj.progress_measure = value;
                }
                break;

              case 'description':
                obj.description = value;
                break;

              case 'score':
                value = parseFloat(value);

                switch (item[4]) {
                  case 'min':
                    if (!isNaN(value)) {
                      obj.score_min = value;
                    }
                    break;

                  case 'max':
                    if (!isNaN(value)) {
                      obj.score_max = value;
                    }
                    break;

                  case 'scaled':
                    if (!isNaN(value)) {
                      obj.score_scaled = value;
                    }
                    break;

                  case 'raw':
                    if (!isNaN(value)) {
                      obj.score_raw = value;
                    }
                    break;

                  default:
                    result = false;
                }
                break;

              default:
                result = false;
            }

            cmi.objectives[n] = obj;
          }
          else {
            return false;
          }
          break;

          // 1.2
        case 'core':
          switch (item[2]) {
            case 'session_time':
              value = cmi._timeSpanToSeconds(value);
              cmi.session_time = value;

              cmi.activity_report.push({
                'property': 'cmi.session_time',
                'value': value
              });
              break;

            case 'lesson_location':
              cmi.location = value;

              cmi.activity_report.push({
                'property': 'cmi.location',
                'value': value
              });
              break;

            case 'lesson_status':
              if (value === 'completed' || value === 'passed') {
                completed = true;
              }

              if (value === 'completed' || value === 'incomplete' || value === 'browsed' || value === 'not attempted') {
                cmi.completion_status = value;

                cmi.activity_report.push({
                  'property': 'cmi.completion_status',
                  'value': value
                });
              }

              if (value === 'passed' || value === 'failed') {
                // Set force_passed value.
                if (value === 'passed') {
                  force_passed = true;
                }

                cmi.success_status = value;

                cmi.activity_report.push({
                  'property': 'cmi.success_status',
                  'value': value
                });
              }

              force_commit = true;
              break;

            case 'exit':
              cmi.exit = value;
              force_commit = true;

              cmi.activity_report.push({
                'property': 'cmi.exit',
                'value': value
              });

              break;

            case 'score' :
              value = parseFloat(value);

              if (isNaN(value)) {
                break;
              }

              switch (item[3]) {
                case 'min':
                  cmi.score_min = value;

                  cmi.activity_report.push({
                    'property': 'cmi.score_min',
                    'value': value
                  });
                  break;

                case 'max':
                  cmi.score_max = value;

                  cmi.activity_report.push({
                    'property': 'cmi.score_max',
                    'value': value
                  });
                  break;

                case 'raw':
                  cmi.score_raw = value;

                  cmi.activity_report.push({
                    'property': 'cmi.score_raw',
                    'value': value
                  });
                  break;

                default:
                  result = false;
              }
              break;

            default:
              result = false;
          }
          break;

        case 'page_id':
          cmi.page_id = value;
          break;

        case 'page_title':
          cmi.page_title = value;
          break;

        default:
          result = false;
      }
    }

    // Custom activity_report storage.
    cmi.activity_report.push({
      'property': property,
      'value': value
    });

    // Force a commit under certain conditions.
    if (force_commit) {
      cmi.commit();
    }

    // Force a passed.
    if (force_passed) {
      cmi.passed();
    }

    // Navigate on completion if set.
    if (completed && cmi.lms_completed_auto_exit) {
      url = cmi.lms_exit_url;

      if (cmi.lms_completed_url !== '') {
        url = cmi.lms_completed_url;
      }

      setTimeout(function() {
        window.location = url;
      }, cmi.lms_completed_url_delay);
    }

    return result;
  };

  /**
   * Commit cmi data to lms.
   *
   * @returns {boolean}
   */
  cmi.commit = function(exit) {
    var result = true,
        exp = /^store complete/,
        response;

    // Post cmi data to host.
    if (cmi.lms_commit_url !== '') {
      response = $.ajax({
        url: cmi.lms_commit_url,
        type: 'POST',
        data: cmi.formatData(),
        contentType: 'json',
        async: cmi.commit_async,
        cache: false,
        complete: function(jqXHR, textStatus) {
          if (textStatus !== 'success') {
            result = false;
          }
        }
      }).responseText;

      // LMS must respond with 'store complete...', otherwise an error occurred.
      if (response === '') {
        result = false;
      }
      else {
        if (!exp.test(response)) {
          cmi.diagnostic = response;
          result = false;
        }

        if (exit && cmi.exit !== 'suspend') {
          window.close();
        }

        // Reset values.
        cmi.log = '';
        cmi.activity_report = [];
      }
    }

    return result;
  };

  /**
   * Make passed request.
   */
  cmi.passed = function() {
    if (cmi.lms_passed_url !== '') {
      $.ajax({
        url: cmi.lms_passed_url,
        type: 'POST',
        async: cmi.commit_async,
        cache: false
      });
    }
  };

  /**
   * Format cmi data as JSON.
   *
   * @returns {string}
   */
  cmi.formatData = function() {
    var result = '',
        items = [],
        i, j;

    items.push("\"page_id\":" + cmi._jsonQuote(cmi.page_id));
    items.push("\"page_title\":" + cmi._jsonQuote(cmi.page_title));
    items.push("\"location\":" + cmi._jsonQuote(cmi.location));
    items.push("\"suspend_data\":" + cmi._jsonQuote(cmi.suspend_data));
    items.push("\"completion_status\":" + cmi._jsonQuote(cmi.completion_status));
    items.push("\"success_status\":" + cmi._jsonQuote(cmi.success_status));
    items.push("\"progress_measure\":" + cmi._jsonQuote(cmi.progress_measure));
    items.push("\"score_min\":" + cmi._jsonQuote(cmi.score_min));
    items.push("\"score_max\":" + cmi._jsonQuote(cmi.score_max));
    items.push("\"score_scaled\":" + cmi._jsonQuote(cmi.score_scaled));
    items.push("\"score_raw\":" + cmi._jsonQuote(cmi.score_raw));
    items.push("\"pref_audio\":" + cmi._jsonQuote(cmi.pref_audio));
    items.push("\"pref_lang\":" + cmi._jsonQuote(cmi.pref_lang));
    items.push("\"pref_speed\":" + cmi._jsonQuote(cmi.pref_speed));

    // Push values if updated.
    if (cmi.exit !== "_none_") {
      items.push("\"exit\":" + cmi._jsonQuote(cmi.exit));
    }

    if (cmi.session_time > 0) {
      items.push("\"session_time\":" + cmi._jsonQuote(cmi.session_time));
    }

    if (cmi.activity_report.length > 0) {
      var activity_report_items = [];

      for (i = 0; i < cmi.activity_report.length; i++) {
        var h = cmi.activity_report[i],
            activity_report_item = [];

        activity_report_item.push("\"property\":" + cmi._jsonQuote(h.property));
        activity_report_item.push("\"value\":" + cmi._jsonQuote(h.value));

        if (activity_report_item.length > 0) {
          activity_report_items.push("{" + activity_report_item.join() + "}");
        }
      }

      if (activity_report_items.length > 0) {
        items.push("\"activity_report\":[" + activity_report_items.join() + "]");
      }
    }

    if (cmi.interactions.length > 0) {
      var inter_items = [];

      for (i = 0; i < cmi.interactions.length; i++) {
        var inter = cmi.interactions[i],
            inter_item = [];

        inter_item.push("\"id\":" + cmi._jsonQuote(inter.id));
        inter_item.push("\"type\":" + cmi._jsonQuote(inter.type));
        inter_item.push("\"timestamp\":" + cmi._jsonQuote(inter.timestamp));
        inter_item.push("\"weighting\":" + cmi._jsonQuote(inter.weighting));
        inter_item.push("\"learner_response\":" + cmi._jsonQuote(inter.learner_response));
        inter_item.push("\"result\":" + cmi._jsonQuote(inter.result));
        inter_item.push("\"latency\":" + cmi._jsonQuote(inter.latency));
        inter_item.push("\"description\":" + cmi._jsonQuote(inter.description));

        if (inter.objectives.length > 0) {
          var objs = [];

          for (j = 0; j < inter.objectives.length; j++) {
            objs.push(cmi._jsonQuote(inter.objectives[j]));
          }

          inter_item.push("\"objectives\":[" + objs.join() + "]");
        }

        if (inter.correct_responses.length > 0) {
          var resps = [];

          for (j = 0; j < inter.correct_responses.length; j++) {
            resps.push(cmi._jsonQuote(inter.correct_responses[j]));
          }

          inter_item.push("\"correct_responses\":[" + resps.join() + "]");
        }

        if (inter_item.length > 0) {
          inter_items.push("{" + inter_item.join() + "}");
        }
      }

      if (inter_items.length > 0) {
        items.push("\"interactions\":[" + inter_items.join() + "]");
      }
    }

    if (cmi.comments.length > 0) {
      var comment_items = [];

      for (i = 0; i < cmi.comments.length; i++) {
        var c = cmi.comments[i],
            comment_item = [];

        comment_item.push("\"comment\":" + cmi._jsonQuote(c.comment));
        comment_item.push("\"location\":" + cmi._jsonQuote(c.location));
        comment_item.push("\"timestamp\":" + cmi._jsonQuote(c.timestamp));

        if (comment_item.length > 0) {
          comment_items.push("{" + comment_item.join() + "}");
        }
      }

      if (comment_items.length > 0) {
        items.push("\"comments\":[" + comment_items.join() + "]");
      }
    }

    if (cmi.objectives.length > 0) {
      var obj_items = [];

      for (i = 0; i < cmi.objectives.length; i++) {
        var obj = cmi.objectives[i],
            obj_item = [];

        obj_item.push("\"id\":" + cmi._jsonQuote(obj.id));
        obj_item.push("\"success_status\":" + cmi._jsonQuote(obj.success_status));
        obj_item.push("\"completion_status\":" + cmi._jsonQuote(obj.completion_status));
        obj_item.push("\"progress_measure\":" + obj.progress_measure);
        obj_item.push("\"description\":" + cmi._jsonQuote(obj.description));
        obj_item.push("\"score_min\":" + cmi._jsonQuote(obj.score_min));
        obj_item.push("\"score_max\":" + cmi._jsonQuote(obj.score_max));
        obj_item.push("\"score_raw\":" + cmi._jsonQuote(obj.score_raw));
        obj_item.push("\"score_scaled\":" + cmi._jsonQuote(obj.score_scaled));

        if (obj_item.length > 0) {
          obj_items.push("{" + obj_item.join() + "}");
        }
      }

      if (obj_items.length > 0) {
        items.push("\"objectives\":[" + obj_items.join() + "]");
      }
    }

    if (items.length > 0) {
      result = "{" + items.join() + "}";
    }

    return result;
  };

  /**
   * Initialize data model from lms - lmsdata is expected to be in JSON format.
   *
   * @param lmsdata
   */
  cmi.initData = function(lmsdata) {
    var lms = JSON.parse(lmsdata),
        lmscomment, comment, index, i, j, lmsobj, obj, lmsinter, inter;

    if (lms) {
      if (lms.hasOwnProperty('learner_id')) {
        cmi.learner_id = lms.learner_id;
      }
      if (lms.hasOwnProperty('learner_name')) {
        cmi.learner_name = lms.learner_name;
      }
      if (lms.hasOwnProperty('location')) {
        cmi.location = lms.location;
      }
      if (lms.hasOwnProperty('launch_data')) {
        cmi.launch_data = lms.launch_data;
      }
      if (lms.hasOwnProperty('suspend_data')) {
        cmi.suspend_data = lms.suspend_data;
      }
      if (lms.hasOwnProperty('entry')) {
        cmi.entry = lms.entry;
      }
      if (lms.hasOwnProperty('credit')) {
        cmi.credit = lms.credit;
      }
      if (lms.hasOwnProperty('mode')) {
        cmi.mode = lms.mode;
      }
      if (lms.hasOwnProperty('max_time_allowed')) {
        cmi.max_time_allowed = lms.max_time_allowed;
      }
      if (lms.hasOwnProperty('time_limit_action')) {
        cmi.time_limit_action = lms.time_limit_action;
      }
      if (lms.hasOwnProperty('completion_status')) {
        cmi.completion_status = lms.completion_status;
      }
      if (lms.hasOwnProperty('success_status')) {
        cmi.success_status = lms.success_status;
      }
      if (lms.hasOwnProperty('progress_measure')) {
        cmi.progress_measure = lms.progress_measure;
      }
      if (lms.hasOwnProperty('total_time')) {
        cmi.total_time = lms.total_time;
      }
      if (lms.hasOwnProperty('scaled_passing_score')) {
        cmi.scaled_passing_score = lms.scaled_passing_score;
      }
      if (lms.hasOwnProperty('score_min')) {
        cmi.score_min = lms.score_min;
      }
      if (lms.hasOwnProperty('score_max')) {
        cmi.score_max = lms.score_max;
      }
      if (lms.hasOwnProperty('score_scaled')) {
        cmi.score_scaled = lms.score_scaled;
      }
      if (lms.hasOwnProperty('score_raw')) {
        cmi.score_raw = lms.score_raw;
      }
      if (lms.hasOwnProperty('pref_audio')) {
        cmi.pref_audio = lms.pref_audio;
      }
      if (lms.hasOwnProperty('pref_lang')) {
        cmi.pref_lang = lms.pref_lang;
      }
      if (lms.hasOwnProperty('pref_speed')) {
        cmi.pref_speed = lms.pref_speed;
      }
      if (lms.hasOwnProperty('pref_caption')) {
        cmi.pref_caption = lms.pref_caption;
      }
      if (lms.hasOwnProperty('interactions') && lms.interactions) {
        if (lms.interactions.length > 0) {
          for (i = 0; i < lms.interactions.length; i++) {
            lmsinter = lms.interactions[i];
            inter = Object.create(cmi_interaction);
            index = cmi.interactions.length;
            cmi.interactions[index] = inter;

            if (lmsinter.hasOwnProperty('id')) {
              inter.id = lmsinter.id;
            }
            if (lmsinter.hasOwnProperty('type')) {
              inter.type = lmsinter.type;
            }
            if (lmsinter.hasOwnProperty('timestamp')) {
              inter.timestamp = lmsinter.timestamp;
            }
            if (lmsinter.hasOwnProperty('weighting')) {
              inter.weighting = lmsinter.weighting;
            }
            if (lmsinter.hasOwnProperty('learner_response')) {
              inter.learner_response = lmsinter.learner_response;
            }
            if (lmsinter.hasOwnProperty('result')) {
              inter.result = lmsinter.result;
            }
            if (lmsinter.hasOwnProperty('latency')) {
              if (cmi.scorm_version === '2004') {
                inter.latency = cmi._timeIntervalToSeconds(lmsinter.latency);
              }
              else if (cmi.scorm_version === '1.2') {
                inter.latency = cmi._timeSpanToSeconds(lmsinter.latency);
              }
            }
            if (lmsinter.hasOwnProperty('description')) {
              inter.description = lmsinter.description;
            }
            if (lmsinter.hasOwnProperty('objectives')) {
              if (lmsinter.objectives.length > 0) {
                for (j = 0; j < lmsinter.objectives.length; j++) {
                  inter.objectives[j] = lmsinter.objectives[j];
                }
              }
            }
            if (lmsinter.hasOwnProperty('correct_responses')) {
              if (lmsinter.correct_responses.length > 0) {
                for (j = 0; j < lmsinter.correct_responses.length; j++) {
                  inter.correct_responses[j] = lmsinter.correct_responses[j];
                }
              }
            }
            cmi.interactions[index] = inter;
          }
        }
      }

      if (lms.hasOwnProperty('comments') && lms.comments) {
        if (lms.comments.length > 0) {
          for (i = 0; i < lms.comments.length; i++) {
            lmscomment = lms.comments[i];
            comment = Object.create(cmi_comment);
            index = cmi.comments.length;
            cmi.comments[index] = comment;

            if (lmscomment.hasOwnProperty('comment')) {
              comment.comment = lmscomment.comment;
            }

            if (lmscomment.hasOwnProperty('location')) {
              comment.location = lmscomment.location;
            }

            if (lmscomment.hasOwnProperty('timestamp')) {
              comment.timestamp = lmscomment.timestamp;
            }

            cmi.comments[index] = comment;
          }
        }
      }

      if (lms.hasOwnProperty('lms_comments') && lms.lms_comments) {
        if (lms.lms_comments.length > 0) {
          for (i = 0; i < lms.lms_comments.length; i++) {
            lmscomment = lms.lms_comments[i];
            comment = Object.create(cmi_comment);
            index = cmi.lms_comments.length;
            cmi.lms_comments[index] = comment;

            if (lmscomment.hasOwnProperty('comment')) {
              comment.comment = lmscomment.comment;
            }

            if (lmscomment.hasOwnProperty('location')) {
              comment.location = lmscomment.location;
            }

            if (lmscomment.hasOwnProperty('timestamp')) {
              comment.timestamp = lmscomment.timestamp;
            }

            cmi.lms_comments[index] = comment;
          }
        }
      }

      if (lms.hasOwnProperty('objectives') && lms.objectives) {
        if (lms.objectives.length > 0) {
          for (i = 0; i < lms.objectives.length; i++) {
            lmsobj = lms.objectives[i];
            obj = Object.create(cmi_objective);
            index = cmi.objectives.length;
            cmi.objectives[index] = obj;

            if (lmsobj.hasOwnProperty('id')) {
              obj.id = lmsobj.id;
            }
            if (lmsobj.hasOwnProperty('success_status')) {
              obj.success_status = lmsobj.success_status;
            }
            if (lmsobj.hasOwnProperty('completion_status')) {
              obj.completion_status = lmsobj.completion_status;
            }
            if (lmsobj.hasOwnProperty('progress_measure')) {
              obj.progress_measure = lmsobj.progress_measure;
            }
            if (lmsobj.hasOwnProperty('description')) {
              obj.description = lmsobj.description;
            }
            if (lmsobj.hasOwnProperty('score_min')) {
              obj.score_min = lmsobj.score_min;
            }
            if (lmsobj.hasOwnProperty('score_max')) {
              obj.score_max = lmsobj.score_max;
            }
            if (lmsobj.hasOwnProperty('score_raw')) {
              obj.score_raw = lmsobj.score_raw;
            }
            if (lmsobj.hasOwnProperty('score_scaled')) {
              obj.score_scaled = lmsobj.score_scaled;
            }

            cmi.objectives[index] = obj;
          }
        }
      }
    }
  };

  /**
   * Prepare json string.
   *
   * @param string
   * @private
   */
  cmi._jsonQuote = function(string) {
    return JSON.stringify(string);
  };

  /**
   * Return the number of seconds from a session time value:
   *   - P[yY][mM][dD][T[hH][nM][s[.s]S]]
   *
   * @param time
   * @returns {number}
   * @private
   */
  cmi._timeIntervalToSeconds = function(time) {
    var seconds = 0,
        dd = 24 * 60 * 60,
        mm = ((365 * 4) + 1) / 48,
        hours = 0,
        mins = 0,
        days = 0,
        months = 0,
        years = 0,
        matchExpr = /^P((\d+)Y)?((\d+)M)?((\d+)D)?(T((\d+)H)?((\d+)M)?((\d+(\.\d{1,2})?)S)?)?$/,
        arr = time.toString().match(matchExpr);

    if (arr === null) {
      return seconds;
    }

    if (parseFloat(arr[13]) > 0) {
      seconds = Math.round(parseFloat(arr[13]));
    }

    if (parseInt(arr[11]) > 0) {
      mins = parseInt(arr[11]);
    }
    seconds += mins * 60;

    if (parseInt(arr[9]) > 0) {
      hours = parseInt(arr[9]);
    }
    seconds += hours * 3600;

    if (parseInt(arr[6]) > 0) {
      days = parseInt(arr[6]);
    }
    seconds += days * dd;

    if (parseInt(arr[4]) > 0) {
      months = parseInt(arr[4]);
    }
    seconds += months * mm * dd;

    if (parseInt(arr[2]) > 0) {
      years = parseInt(arr[2]);
    }
    seconds += years * 365 * dd;

    return seconds;
  };

  /**
   Return the number of seconds from a session time value:
   *   - [hH]:[mM]:[sS]
   *
   * @param time
   * @returns {number}
   * @private
   */
  cmi._timeSpanToSeconds = function(time) {
    var arr = time.toString().split(':'),
        seconds = 0,
        mm = 0,
        hh = 0;

    if (parseFloat(arr[2]) > 0) {
      seconds = Math.round(parseFloat(arr[2]));
    }

    if (parseInt(arr[1]) > 0) {
      mm = parseInt(arr[1]);
    }
    seconds += mm * 60;

    if (parseInt(arr[0]) > 0) {
      hh = parseInt(arr[0]);
    }
    seconds += hh * 60 * 60;

    return seconds;
  };

})(H5P.jQuery);
