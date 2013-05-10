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
    if (supportsTransitions && "number" == typeof options.duration) {
      list.style.transitionDuration = options.duration/1000+"s"; // TODO: vendor prefixes?
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
    var legend = doc.createElement("ol");
    legend.className = "sslider-legend";
    innerContainer.appendChild(legend);
    var items = list.getElementsByTagName("li");
    sslider.legend = [];
    for (idx=0, len=items.length; idx<len; ++idx) {
      item = doc.createElement("li");
      var button = doc.createElement("button");
      button.innerHTML = idx+1;
      button.value = idx;
      item.appendChild(button);
      legend.appendChild(item);
      sslider.legend.push(item);
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
      for (var idx2=0, len=sslider.legend.length; idx2<len; ++idx2) {
        sslider.legend[idx2].className = idx2==idx ? "selected" : "";
      }
      return sslider;
    }
    , "auto": function (auto) {
      auto = arguments.length==0 || !!auto;
      var sslider = this;
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
      // XYZ: cheap way try to prevent jittering when js-anim/auto and ruthless user navigation
      if (sslider._state.userNavActive) {return;}
      setTimeout(function () {sslider._state.userNavActive = false;}, sslider.options.duration);
      sslider._state.userNavActive = true;
      sslider && dir && sslider[dir]();
    }, false);
    doc.addEventListener("click", function (e) {
      var target = e.target, legendList;
      if (!(target.nodeName.toLowerCase()=="button" && (legendList=getParentLegendListElem(target)))) {return;}
      var sslider = registry.get(getParentWidgetElem(legendList))
        , idx = parseInt(target.value, 10);
      sslider && sslider.showIdx(idx);
    }, false);
  })();

  return {
    "create": function (images, options) {
      var sslider = new Sslider(images, options);
      !!sslider.options.userNav && registry.put(sslider);
      return sslider;
    }
  };
})();
