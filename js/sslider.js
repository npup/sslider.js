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
/**
*
* Name: sslider.js
* Version: 0.1
* Description: simple image sliding utility
* Author: P. Envall (petter.envall@gmail.com, @npup)
* Date: 2013-05-09
*
* Dependencies:
*   ip.js >= v0.9 (only for fallback from CSS transition to JavaScript animation)
*
*
* API:
*   sslider.create(images[, options]);
*     images    - (DOM element) container in which to create the sslider widget
*     options   - (object) options hash:
*                   target    - (DOM element, default document.body) container in which to create the sslider widget
*                   width     - (int, default 300) width of a single image frame
*                   height    - (int, default 250) height of a single image frame
*                   userNav   - (boolean, default true) if widget should react to arrow keys and legend list clicks
*                   auto      - (boolean, default false) if widget should start auto cycling
*                   interval  - (int, default 3000) period for auto cycling steps
*                   duration  - (int, default 300) duration of interpolation in ms - Note: you probably want this to be <= the "interval" option
*                   legend    - (boolean, default true) if a clickable list of numbers representing the images should be shown at the bottom
*                   legendActive - (boolean, default true) if the items in the legend list are to be clickable (for navigation)
*
* Instance API:
*   i.prev()                  - move to previous frame (if any), returns instance
*   i.next()                  - move to next frame (if any), returns instance
*   i.showIdx(3)              - show frame at index 3, returns instance
*   i.auto([true|false])      - start/stop auto cycling frames (back and forth), returns instance
*   i.userNav([true|false])   - enable/disable user navigation via arrow keys and legend list, returns instance
*
* Basic usage:
*
*   var s = sslider.create(["foo.png", "bar.png", "baz.png"], {
*     "duration": 500
*     , "target": document.getElementById("bak")
*   });
*
*   s.showIdx(1).userNav(false).auto();
*
*/
var sslider = (function () {
  var win = this, doc = win.document
    , registry = (function () {
      var objects = {}; // id of container => slider widget
      function getIdForSslider(sslider) {
        return sslider.container && sslider.container.id;
      }
      function generateId() {
        return ["sslider"].concat(((+new Date).toString(16)+(Math.floor(Math.random()*0xffff)).toString(16)).match(/.{1,4}/g)).join("-");
      }
      return {
        "get": function (elem) {
          var id = ("string" == typeof elem) ? elem : elem.id;
          return objects[id];
        }
        , "put": function (sslider) {
          getIdForSslider(sslider) || (sslider.container.id = generateId());
          objects[getIdForSslider(sslider)] = sslider;
        }
        , "remove": function (sslider) {
          var id = getIdForSslider(sslider);
          (id == void 0) || (delete objects[id]);
        }
      };
    })();

  var supportsTransitions = (function () {
    return "string" == typeof doc.createElement("div").style.transition;
  })()
  , useJsInterpolation = (function () { // no CSS support, but interpolation library loaded?
    return !supportsTransitions && "object" == typeof win.ip;
  })();
  // console.log("attempt using %s", useJsInterpolation?"JS":"CSS");

  var defaultOptions = (function () {
    var def = {
      "target": doc.body
      , "width": 300
      , "height": 250
      , "userNav": true
      , "auto": false
      , "interval": 3000
      , "duration": 300
      , "legend": true
      , "legendActive": true
    };
    return {
      "merge": function (options) {
        for (var k in def) {k in options || (options[k] = def[k]);}
        return options;
      }
      , "put": function (key, val) {def[k] = val;}
    };
  })();

  function Sslider(images, options) {
    var sslider = this;
    options = defaultOptions.merge(options || {});
    sslider.options = options;
    sslider.maxIdx = images.length-1;
    sslider._state = {
      "currentIdx": 0
      , "left": 0
      , "timer": null
      , "autoDir": 1
      , "userNavActive": false
    };
    var container = doc.createElement("div");
    container.className = "sslider";
    container.style.width = options.width+"px";
    container.style.height = options.height+"px";
    container.setAttribute("tabIndex", "0");
    var innerContainer = doc.createElement("div");
    innerContainer.className = "container-inner";
    container.appendChild(innerContainer);
    var list = doc.createElement("ol");
    list.className = "sslider-images";
    list.style.width = images.length*options.width+"px";
    list.style.left = String(sslider._state.left);
    var dur = options.duration/1000+"s";
    if (supportsTransitions && "number" == typeof options.duration) {
      for (var vendorPrefix in {
        "Webkit": true
        , "Moz": true
        , "O": true
        , "": true
      }) {
        list.style[vendorPrefix+"transitionDuration"] = dur;
      }
    }
    for (var idx=0, len=images.length; idx<len; ++idx) {
      var item = doc.createElement("li")
        , img = doc.createElement("img");
      item.style.width = options.width+"px";
      item.style.height = options.height+"px";
      img.height = options.height;
      img.src = images[idx];
      item.appendChild(img);
      list.appendChild(item);
    }
    innerContainer.appendChild(list);
    if (options.legend) {
      var legend = doc.createElement("ol");
      legend.className = "sslider-legend";
      innerContainer.appendChild(legend);
      var items = list.getElementsByTagName("li");
      sslider.legend = [];
      for (idx=0, len=items.length; idx<len; ++idx) {
        item = doc.createElement("li");
        var button = doc.createElement("button");
        button.className = "legend-item";
        button.innerHTML = idx+1;
        button.value = idx;
        options.legendActive || (button.tabIndex = -1);
        item.appendChild(button);
        legend.appendChild(item);
        sslider.legend.push(item);
      }
    }
    options.target.appendChild(container);
    container.focus();
    sslider.container = container;
    sslider.list = list;
    sslider.showIdx(0);
    options.auto && sslider.auto();
  }

  Sslider.prototype = {
    "constructor": Sslider
    , "prev": function (steps) {
      var sslider = this;
      return sslider.showIdx(sslider._state.currentIdx-1);
    }
    , "next": function (steps) {
      var sslider = this;
      return sslider.showIdx(sslider._state.currentIdx+1);
    }
    , "showIdx": function (idx) {
      var sslider = this;
      if (idx<0 || idx>sslider.maxIdx) {return;}
      var offset = -1 * idx * sslider.options.width;
      animate(sslider, offset);
      sslider._state.currentIdx = idx;
      if (sslider.options.legend) {
        for (var idx2=0, len=sslider.legend.length; idx2<len; ++idx2) {
          sslider.legend[idx2].className = idx2==idx ? "selected" : "";
        }
      }
      return sslider;
    }
    , "auto": function (auto) {
      auto = arguments.length==0 || !!auto;
      var sslider = this;
      sslider.options.auto = auto;
      auto ? autoMove(sslider) : clearTimeout(sslider._state.timer);
      return sslider;
    }
    , "userNav": function (enable) {
      enable = arguments.length==0 || !!enable;
      var sslider = this;
      registry[enable?"put":"remove"](this);
      return sslider;
    }
  };

  var animate = (function () {
    if (useJsInterpolation) {
      return function (sslider, offset) {
        ip.create(sslider._state.left, offset, {
          "duration": sslider.options.duration
          , "update": function (val) {setLeftPos(sslider, val);}
        }).start();
      };
    }
    else {return setLeftPos;}
  })();

  function setLeftPos(sslider, val) {
    sslider._state.left = val;
    sslider.list.style.left = val+"px";
  }

  function autoMove(sslider) {
    var nextIdx = sslider._state.currentIdx + sslider._state.autoDir;
    if (nextIdx>sslider.maxIdx || nextIdx<0) {
      sslider._state.autoDir *= -1;
      nextIdx = sslider._state.currentIdx + sslider._state.autoDir;
    }
    sslider._state.timer = setTimeout(function () {
      sslider.showIdx(nextIdx);
      autoMove(sslider);
    }, sslider.options.interval);
  }

  // set up user navigation via arrow keys/legend click
  (function () {
    var keys = {"37": "prev", "39": "next"};
    function getParentWidgetElem (elem) {return getParentElemWithClassName("sslider", elem);}
    function getParentLegendListElem(elem) {return getParentElemWithClassName("sslider-legend", elem);}
    function getParentElemWithClassName(className, elem) {
      do {
        if (elem && elem.className==className) {return elem;}
        elem = elem.parentNode;
      } while (elem);
    }
    doc.addEventListener("keyup", function (e) {
      var focused = doc.activeElement
        , keyCode = e.keyCode;
      if (!(focused=getParentWidgetElem(focused))) {return;}
      var sslider = registry.get(focused)
        , dir = keys[keyCode];
      if (!dir) {return;} // only let the predefined key nav through
      if (sslider) {
        if (preventRuthlessNavigation(sslider)) {return;}
        pauseAutoMoving(sslider);
        sslider && dir && sslider[dir]();
      }
    }, false);
    doc.addEventListener("click", function (e) {
      var target = e.target, legendList;
      if (!(target.nodeName.toLowerCase()=="button" && (legendList=getParentLegendListElem(target)))) {return;}
      var sslider = registry.get(getParentWidgetElem(legendList))
        , idx = parseInt(target.value, 10);
      if (sslider) {
        if (!sslider.options.legendActive) {return;}
        if (preventRuthlessNavigation(sslider)) {return;}
        pauseAutoMoving(sslider);
        sslider.showIdx(idx);
      }
    }, false);
  })();

  function preventRuthlessNavigation(sslider) {
    if (sslider._state.userNavActive) {return true;} // already on it, bail
    setTimeout(function () {
      sslider._state.userNavActive = false;}, sslider.options.duration);
    sslider._state.userNavActive = true;
  }
  function pauseAutoMoving(sslider) {
    if (sslider.options.auto) {
      sslider.options.auto = false;
      clearTimeout(sslider._state.timer);
      setTimeout(function () {
        sslider.auto();
      }, sslider.options.duration*2);
    }
  }

  return {
    "create": function (images, options) {
      var sslider = new Sslider(images, options);
      !!sslider.options.userNav && registry.put(sslider);
      return sslider;
    }
  };
})();
