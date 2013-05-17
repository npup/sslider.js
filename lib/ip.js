/**
*
* Name: ip.js
* Version: 0.9.1
* Description: value interpolation utility
* Author: P. Envall (petter.envall@gmail.com, @npup)
* Date: 2013-05-09
*
*
* API:
*   ip.create(from, to[, options]);
*     from      - (integer) start value
*     to        - (integer) end value
*     options   - (object) options hash:
*                   duration  - (int, default 1000) duration of interpolation in ms
*                   repeats   - (boolean, default false | integer) repeat interpolation (true: forever, integer: nr of extra loops)
*                   roundtrip - (boolean, default false) if interpolation includes returning to initial value
*                   easing    - (function) interpolation easing strategy
*                   each      - (function) callback that receives the current interpolation value after each calculation
*                   update    - (function) callback that receives the current interpolation value after each calculation that results in a new value
*                   end       - (function) callback for when the interpolation ends
*
* Instance API:
*   i.start()
*   i.stop()
*   i.pause()
*   i.resume()
*
* Basic usage:
*
*   var s = ip.create(0, 100, {
*     "duration": 500
*     , "update": function (value) {
*       console.log(value);
*     }
*   });
*   s.start();
*
*/
var ip;
("undefined"==typeof ip) && (ip = (function () {
  var defaultOptions = {
    "duration": 1000
    ,"repeat": false
    , "roundtrip": false
    , "easing": function (pos) {
      return (-Math.cos(pos*Math.PI)/2) + 0.5;
    }
    , "each": null // function (/* value */) {}
    , "update": null // function (/* value */) {}
    , "end": null // function (/* ts of first start */) {}
  };

  var getTs = (function () {
    if ("function" == typeof Date.now) {
      return Date.now;
    }
    return function () {return +new Date;}
  })();

  function switchPhase(instance) {
    var tmp = instance.to;
    instance.to = instance.from;
    instance.from = tmp;
    instance.phase = (instance.phase !==2) ? 2 : 1;
  }

  function roundtrip(instance) {
    switchPhase(instance);
    instance.start();
  }

  function checkPaused(instance) {
    if (instance.paused) {
      clearInterval(instance.interval);
      return true;
    }
    return false;
  }

  function checkUpdate(instance, value) {
    if (instance.curr != value) {
      instance.curr = value;
      instance.options.update(value);
    }
  }

  function checkEnd(instance) {
    instance.options.end && instance.options.end(instance._firstStart);
  }

  function checkTripFinished(instance, now) {
    if (now>instance.end) { // trip finished
      clearInterval(instance.interval);
      instance.running = false;
      if (instance.options.roundtrip && instance.phase!==2) { // start journey back
        roundtrip(instance);
      }
      else if (instance.wantedTrips==-1 || ++instance.tripNr < instance.wantedTrips) { // another trip
        instance.options.roundtrip && switchPhase(instance); // might need to switch back from "phase 2"
        instance.start();
      }
      else { // call it a day
        checkEnd(instance);
      }
    }
  }

  function work(instance) {
    if (checkPaused(instance)) {return;}
    var now = getTs()
      , pos = now > instance.end ? 1 : (now-instance._start)/instance.options.duration
      , value = Math.floor(instance.from + (instance.to-instance.from) * instance.options.easing(pos));
    // run any callbacks?
    instance.options.each && instance.options.each(value);
    instance.options.update && checkUpdate(instance, value);
    // check for roundtrips, being finished etc
    checkTripFinished(instance, now);
  }

  function Ip(from, to, options) {
    var instance = this;
    ("object" == typeof options) || (options = {});
    for (var prop in defaultOptions) {
      (prop in options) || (options[prop]=defaultOptions[prop]);
    }
    instance.options = options;
    instance.from = from;
    instance.to = to;
    reset(instance);
  }

  function reset(instance) {
    instance._start = null;
    instance.end = null;
    instance.curr = null;
    instance.interval = null;
    instance.paused = false;
    instance.running = false;

    delete instance._firstStart;

    // set up nr of trips from repeat option
    instance.tripNr = 0;
    instance.wantedTrips = 1;
    var repeatOption = instance.options.repeat
      , repeatOptionType = typeof repeatOption;
    if ("boolean" == repeatOptionType ) { // true/false => -1 / 1 trips
      instance.wantedTrips = repeatOption ? -1 : 1;
    }
    else if ("number" == repeatOptionType && repeatOption > 0) { // > 0 => 1 + nr of repeats
      instance.wantedTrips = repeatOption+1;
    }
  }

  function doStart(instance) {
    instance.interval = setInterval(function () {
      work(instance);
    }, 16);
    instance.running = true;
    return instance;
  }

  Ip.prototype = {
    "constructor": Ip
    , "start": function () {
      var instance = this;
      if (instance.running) {return instance;}
      var ts = getTs();
      "number" == typeof instance._firstStart || (instance._firstStart = ts);
      instance._start = ts;
      instance.end = instance._start + instance.options.duration;
      return doStart(instance);
    }
    , "pause": function () {
      var instance = this;
      if (instance.paused) {return instance;}
      instance.paused = true;
      instance.running = false;
      instance._ts = getTs() - instance._start;
      return instance;
    }
    , "resume": function () {
      var instance = this;
      if (!instance.paused) {return instance;}
      instance.paused = false;
      instance.running = true;
      instance._start = getTs() - instance._ts;
      instance.end = instance._start + instance.options.duration;
      delete instance._ts;
      return doStart(instance);
    }
    , "stop": function () {
      var instance = this;
      if (!instance.running) {return;}
      checkEnd(instance);
      clearInterval(instance.interval);
      reset(instance);
    }
  };

  return {
    "create": function (from, to, options) {
      return new Ip(from, to, options);
    }
  };

})());

(function () {
  var toExport = {"ip": ip};
  (function() {
    var undefinedType = "undefined";
    if (undefinedType!=typeof module && undefinedType != typeof module.exports && "function" == typeof require) {
      for (var name in this) {exports[name] = this[name];}
    }
  }).call(toExport);
})();
