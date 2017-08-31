'use strict';

/**
 * Creates a new empty Treemap. Content may be added using addData(), addJSON() or addTreemap().
 *
 * @class Treemap
 * @constructor
 * @param  {Number} x         x position
 * @param  {Number} y         y position
 * @param  {Number} w         width
 * @param  {Number} h         height
 * @param  {Object} [options] drawing and sorting options {sort:true or false, direction:"horizontal", "vertical" or "both"}
 * @return {Treemap}          the created empty Treemap 
 */

/**
 * @class Treemap
 * @ignore
 * @constructor (mainly for internal use)
 * @param  {Treemap} parent   the parent Treemap
 * @param  {String|Number|Object|Array} data  one data element to store. could be anything. 
 * @param  {Number} count     initial count
 * @return {Treemap}          the created Treemap that represents one item
 */

/**
 * @class Treemap
 * @ignore
 * @constructor (mainly for internal use)
 * @param  {Treemap} parent   the parent Treemap
 * @return {Treemap}          the created empty Treemap 
 */

function Treemap() {
  this.parent;
  this.data;
  this.count = 0;
  this.items = [];

  /**
  * x position of the rectangle.
  * @property x
  * @type {Number}
  */
  this.x = 0;
  /**
  * y position of the rectangle.
  * @property y
  * @type {Number}
  */
  this.y = 0;
  /**
  * width of the rectangle.
  * @property w
  * @type {Number}
  */
  this.w = 0;
  /**
  * height of the rectangle.
  * @property h
  * @type {Number}
  */
  this.h = 0;
  this.options;

  if (arguments.length >= 4) {
    this.x = arguments[0];
    this.y = arguments[1];
    this.w = arguments[2];
    this.h = arguments[3];
    this.options = arguments[4];
  } else {
    this.parent = arguments[0];
    this.data = arguments[1];
    this.count = arguments[2] || 0;
  }

  this.x = this.x || 0;
  this.y = this.y || 0;
  this.w = this.w || 0;
  this.h = this.h || 0;

  this.minCount = 0;  // not used internally, but could be nice for drawing
  this.maxCount = 0;  // not used internally, but could be nice for drawing

  if (this.parent) this.level = this.parent.level + 1;
  else this.level = 0;

  this.index = 0;

  this.root = this;
  this.isRoot = true;
  if (this.parent) {
    this.root = this.parent.root;
    this.isRoot = false;
  };
  this.options = this.options || this.root.options;

  this.ignored = false;

  /**
    * Adds one data element to the items array. 
    * If there is already an item which has this as data, just increase the counter of that item.
    * If not, create a new Treemap with that data and init the counter with 1
    *
    * @method addData
    * @param {String|Number|Object|Array} data   the data element (e.g. a String) 
    * @return {Boolean}                          returns true, if a new treemap was created
  */
  Treemap.prototype.addData = function(data) {
    var i = this.items.findIndex(function(el) {
      return el.data == data
    });
    if (i >= 0) {
      this.items[i].count++;
      return false;
    } else {
      this.items.push(new Treemap(this, data, 1));
    }
    return true;
  }

  /**
    * Add data giving a json object and the keys where to find the children, 
    * the size/count value and optionally what data to store.
    *
    * @method addJSON
    * @param {Object} json          a json object  
    * @param {String} childrenKey   the name of the key of the nested arrays  
    * @param {String} countKey      the name of the key of the value that defines the size of a rectangle  
    * @param {String} [dataKey]     the name of the key of the data to store. If omitted the complete json branch is stored. This might be the way to chose in most cases. That way you keep all the information accessible when drawing the treemap.
    * @return {Boolean}             returns true, if a new treemap was created
  */
  Treemap.prototype.addJSON = function(json, childrenKey, countKey, dataKey) {
    if (dataKey) this.data = json[dataKey];
    else this.data = json;

    this.count = json[countKey] || 0;

    var children = json[childrenKey];
    if (children instanceof Array) {
      children.forEach(function(child) {
        var t = new Treemap(this);
        this.items.push(t);
        t.addJSON(child, childrenKey, countKey, dataKey);
      }.bind(this));
      return true;
    }
    return false;
  }


  /**
    * Adds an empty treemap to this treemap. If data is given, this could be used 
    * to show and hide a complete sub-treemap from the diagram. There is no check,
    * if there is already another treemap with that data.
    *
    * @method addTreemap
    * @param {String|Number|Object|Array} data the data element (e.g. a String) 
    * @count {Number} [count]                  the initial counter 
    * @return {Treemap}                        returns the new Treemap
  */
  Treemap.prototype.addTreemap = function(data, count) {
    var t = new Treemap(this, data, count);
    this.items.push(t);
    return t;
  }

  // The size of a rectangle depends on the counter. So it's important to sum
  // up all the counters recursively. Only called internally.
  Treemap.prototype.sumUpCounters = function() {
    // Adjust parameter this.ignore: if ignore option is defined and this.data is listed in that ignored=true
    if (this.options.ignore instanceof Array) {
      if (this.options.ignore.indexOf(this.data) >= 0) {
        this.ignored = true;
      } else {
        this.ignored = false;
      }
    }

    // return count or 0 depending on this.ignored
    if (this.items.length == 0) {
      if (this.ignored) return 0;

    } else {
      this.minCount = Number.MAX_VALUE;
      this.maxCount = 0;
      this.count = 0;

      if (this.ignored) return 0;

      for (var i = 0; i < this.items.length; i++) {
        var sum = this.items[i].sumUpCounters();
        this.count += sum;
        this.minCount = min(this.minCount, sum);
        this.maxCount = max(this.maxCount, sum);
      }
    }
    return this.count;
  }

  /**
    * Calculates the rectangles of each item. While doing this, all counters 
    * and ignore flags are updated.
    *
    * @method calculate
  */
  Treemap.prototype.calculate = function() {
    // Stop immediately, if it's an empty array
    if (this.items.length == 0) return;

    // if it's the root node, sum up all counters recursively
    if (this == this.root) this.sumUpCounters();

    // If to ignore this element, adjust parameters and stop
    if (this.ignored) {
      this.x = -100000; // just a value far outside the screen, so it won't show up if it's drawn accidentally
      this.y = 0;
      this.w = 0;
      this.h = 0;
      return;
    }

    // sort or shuffle according to the given option
    if (this.options.sort == true || this.options.sort == undefined) {
      // sort items
      this.items.sort(function(a, b) {
        if (a.count < b.count) return 1;
        if (a.count > b.count) return -1;
        else return 0;
      });
    } else {
      // shuffle explicitly
      shuffleArray(this.items);
    }

    // give every child an index. could be handy for drawing
    for (var i = 0; i < this.items.length; i++) {
      this.items[i].index = i;
    }

    // Starting point is a rectangle and a number of counters to fit in.
    // So, as nothing has fit in the rect, restSum, restW, ... are the starting rect and the sum of all counters
    var restSum = this.count;
    var pad = this.options.padding || 0;
    var restX = this.x + pad;
    var restY = this.y + pad;
    var restW = this.w - pad * 2;
    var restH = this.h - pad * 2;

    // Fit in rows. One row consits of one or more rects that should be as square as possible in average.
    // actIndex always points on the first counter, that has not fitted in.
    var actIndex = 0;
    while (actIndex < this.items.length) {
      // A row is always along the shorter edge (a).
      var isHorizontal = true; // horizontal row
      var a = restW;
      var b = restH;
      if (this.options.direction != 'horizontal') {
        if (restW > restH || this.options.direction == 'vertical') {
          isHorizontal = false; // vertical row
          a = restH;
          b = restW;
        }
      }

      // How many items to fit into the row?
      var rowSum = 0;
      var rowCount = 0;
      var avRelPrev = Number.MAX_VALUE;
      for (var i = actIndex; i < this.items.length; i++) {
        rowSum += this.items[i].count;
        rowCount++;

        // a * bLen is the rect of the row
        var percentage = rowSum / restSum;
        var bLen = b * percentage;
        var avRel = (a / rowCount) / bLen;

        // Let's assume it's a horizontal row. The rects are as square as possible,
        // as soon as the average width (a / rowCount) gets smaller than the row height (bLen).
        if (avRel < 1 || i == this.items.length - 1) {
          // Which is better, the actual or the previous fitting?
          if (avRelPrev < 1 / avRel) {
            // previous fitting is better, so revert to that
            rowSum -= this.items[i].count;
            rowCount--;
            bLen = b * rowSum / restSum;
            i--;
          }

          // get the position and length of the row according to isHorizontal (horizontal or not).
          var aPos = restX;
          var bPos = restY;
          var aLen = restW;
          if (!isHorizontal) {
            aPos = restY;
            bPos = restX;
            aLen = restH;
          }

          // now we can transform the counters between index actIndex and i to rects (in fact to treemaps)
          for (var j = actIndex; j <= i; j++) {
            // map aLen according to the value of the counter
            var aPart = aLen * this.items[j].count / rowSum;
            if (isHorizontal) {
              this.items[j].x = aPos;
              this.items[j].y = bPos;
              this.items[j].w = aPart;
              this.items[j].h = bLen;
            } else {
              this.items[j].x = bPos;
              this.items[j].y = aPos;
              this.items[j].w = bLen;
              this.items[j].h = aPart;
            }

            // now that the position, width and height is set, it's possible to calculate the nested treemap.
            this.items[j].calculate();
            aPos += aPart;
          }

          // adjust dimensions for the next row
          if (isHorizontal) {
            restY += bLen;
            restH -= bLen;
          } else {
            restX += bLen;
            restW -= bLen;
          }
          restSum -= rowSum;

          break;
        }

        avRelPrev = avRel;
      }

      actIndex = i + 1;
    }
  };

  /**
    * A simple recursive drawing routine. Draws only the rectangles.
    *
    * @method draw
  */
  Treemap.prototype.draw = function() {
    if (!this.ignored) {
      rect(this.x, this.y, this.w, this.h);
      for (var i = 0; i < this.items.length; i++) {
        this.items[i].draw();
      }
    }
  };

}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 *
 * @ignore
 */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = floor(random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

module.exports = Treemap;