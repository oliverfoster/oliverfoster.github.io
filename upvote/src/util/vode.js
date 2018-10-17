(function () {

  /**
   * Faster implementation of underscore intersection.
   * @param  {Array} a First array of strings
   * @param  {Array} b Second array of strings
   * @return {Array}   Intersecting Array of strings
   */
  function intersect(a, b) {
    return a.filter(function(value) {
      return -1 !== b.indexOf(value);
    });
  }

  function extend(subject, fromItemsArgs) {
    for (var i = 1, l = arguments.length; i < l; i++) {
      var arg = arguments[i];
      for (var k in arg) {
        try {
          subject[k] = arg[k];
        } catch(err) {}
      }
    }
    return subject;
  }

  /**
   * Static value for identifying Element types
   * @type {Number}
   */
  var TYPE_ELEMENT = 1;

  /**
   * Static value for identifying Text types
   * @type {Number}
   */
  var TYPE_TEXT = 3;

  /**
   * DOM Element virtual node representation
   * @param {Element} target DOM node
   * @param {VElement} parent Optional parent VElement
   * @param {Number} index  Optional index in parent
   */
  function VElement(target, parent, index, options) {

    this.target = target;
    this.type = TYPE_ELEMENT;
    this.name = target.nodeName;
    this.ignoreSubTree = false;

    // Collect attribute names and values in three usable ways
    this.attributes = {};
    this.attributeNames = [];//new Array(target.attributes.length);
    this.attrUniquenessHash = "";
    for (var i = 0, l = target.attributes.length; i < l; i++) {
      var attr = target.attributes[i];
      var name = attr.name;
      var value = attr.value;
      if (options.ignoreAttributes && options.ignoreAttributes[name]) {
        continue;
      }
      if (parent && options.ignoreSubTreesWithAttributes && options.ignoreSubTreesWithAttributes[name]) {
        this.ignoreSubTree = true;
      }
      switch (name) {
        case "id":
          this.id = value;
          break;
        case "class":
          this.classes = value.split(' ');
          break;
      }
      this.attributes[name] = value;
      this.attributeNames.push(name);
      this.attrUniquenessHash+=name+':'+value+';';
    }
    this.classes = this.classes || [];
    this.id = this.id || null;
    if (this.id && parent) {
      parent.ids[this.id] = parent.ids[this.id] || 0;
      parent.ids[this.id]++;
      if (parent[this.id] > 1) {
        parent.cleanIds = false;
      }
    }

    // Record relative relationships
    if (!parent) {
      // Root node
      this.level = 0;
      this.index = 0;
      this.parent = null;
      this.ancestors = [];
    } else {
      // Add as a child and desendent of ancestor VElements
      this.level = parent.level+1;
      this.index = index;
      this.parent = parent;
      parent.children.push(this);
      this.ancestors = [parent];
      this.ancestors.push.apply(this.ancestors, parent.ancestors);
      for (var i = 0, l = this.ancestors.length; i < l; i++) {
        var ancestor = this.ancestors[i];
        ancestor.descendents.push(this);
      }
    }
    this.descendents = [];
    this.children = [];
    this.ids = {};
    this.cleanIds = true;

    // Traversal, comparison and modification defaults
    this.isMatched = false;
    this.isRemoved = false;
    this.isAdded = false;
    this.shouldSort = false;
    this.match = null;

  }

  /**
   * DOM Text virtual node representation
   * @param {Element} target DOM node
   * @param {VElement} parent Optional parent VElement
   * @param {Number} index  Optional index in parent
   */
  function VText(target, parent, index, options) {

    this.target = target;
    this.type = TYPE_TEXT;
    this.value = target.nodeValue;

    // Record relative relationships
    this.level = parent.level+1;
    this.index = index;
    this.parent = parent;

    // Add as a child and desendent of ancestor VElements
    parent.children.push(this);
    this.ancestors = [parent];
    this.ancestors.push.apply(this.ancestors, parent.ancestors);
    for (var i = 0, l = this.ancestors.length; i < l; i++) {
      var ancestor = this.ancestors[i];
      ancestor.descendents.push(this);
    }

    // Traversal, comparison and modification defaults
    this.isMatched = false;
    this.isRemoved = false;
    this.isAdded = false;
    this.match = null;

  }

  /**
   * Virtual node container for representing DOM hierarchies
   * @param {Element} target Target DOM element to be represented
   */
  function Vode(target, options) {
    // Create a starting array of 1000 items to speed up memory allocation
    this.length = 1000;
    // Keep separate length variable for array data length
    this.actualLength = 1;
    // Add root element
    this[0] = new VElement(target, null, null, options);
    var index = 0;
    for (var index = 0; index < this.actualLength; index++) {
      var node = this[index].target;
      var parentVElement = this[index];
      var childNodes = node.childNodes;
      if (!childNodes) continue;
      if (parentVElement.ignoreSubTree) continue;
      // Iterate through child nodes creating virtual representations and
      // relationships as necessary
      for (var i = 0, l = childNodes.length; i < l; i++) {
        var childNode = childNodes[i];
        var childItem = null;
        switch (childNode.nodeType) {
          case TYPE_TEXT:
            childItem = new VText(childNode, parentVElement, i, options);
            break;
          case TYPE_ELEMENT:
            childItem = new VElement(childNode, parentVElement, i, options);
            break;
          default:
            // Ignore all nodes which aren't either text or element
            continue;
        }
        if (this.actualLength === this.length) {
          // Extend the vode cache size if necessary
          this.length+=1000;
        }
        // Add VElement to Vode
        this[this.actualLength] = childItem;
        this.actualLength++;
      }
    }
  }
  Vode.prototype = new Array();
  extend(Vode, {

    /**
     * Create a Vode from a DOM Element
     * @param  {Element} target DOM Element to create a virtual node representation from
     * @return {Vode}        Virtual node representation
     */
    fromNode: function(target, options) {
      return new Vode(target, options);
    },

    /**
     * Create a Vode from an html string
     * @param  {String} string    HTML from which to create Vode
     * @param  {Boolean} isInner Is string innerHTML or outerHTML
     * @return {Vode}           Virtual node representation
     */
    fromString: function(string, isInner, options) {
      tempDiv.innerHTML = string;
      if (!isInner) {
        if (tempDiv.children.length !== 1) throw "Must have one root node";
        return this.fromNode(tempDiv.children[0], options);
      }
      return this.fromNode(tempDiv, options);
    }

  });
  extend(Vode.prototype, {

    /**
     * Update this Vode from specific source Vode.
     * @param  {Vode} source  Source Vode from which to update
     * @param  {Object} options Control options for traverse, compare and modify
     */
    update: function(sourceVode, options) {
      var traverser = new Traverse(options);
      var comparer = new Compare(options);
      var modifier = new Modify(options);
      traverser.traverse(this, sourceVode, comparer, modifier);
    }

  });

  /**
   * Traversal behaviour for virtual node comparisons
   * @param {Object} options Set of options for traversal control
   */
  function Traverse(options) {
    this._options = options;
  }
  extend(Traverse.prototype, {
    /**
     * Walk through all virtual nodes from the destination and source, comparing,
     * modifying, removing, adding and sorting them as appropriate until the
     * destination matches the source.
     * @param  {Vode} destination Representation of DOM hierachry in the document
     * @param  {Vode} source      Representation of DOM hierachry from template
     * @param  {Compare} comparer    Compare instance for virtual node comparisons
     * @param  {Modify} modifier     Modify instance for virtual node modifications
     */
    traverse: function(destination, source, comparer, modifier) {
      // Force match root nodes
      var destRoot = destination[0]
      var srcRoot = source[0];
      destRoot.match = srcRoot;
      destRoot.isMatched = true;
      srcRoot.match = destRoot;
      srcRoot.isMatched = true;
      // Update root node
      modifier.update(destRoot, srcRoot);
      // Iterate through each destination descendent
      for (var d = 0, dl = destination.actualLength; d < dl; d++) {
        var dest = destination[d];
        // Skip text elements as they have no children and are compared in the
        // children interation loops below
        if (dest.type === TYPE_TEXT) continue;
        // Skip removed nodes marked as removed by previous iterations
        if (dest.isRemoved) continue;

        var src = dest.match;
        // Iterate through destination VElement's children (VText and VElements)
        for (var dc = 0, dcl = dest.children.length; dc < dcl; dc++) {
          var destChild = dest.children[dc];
          // Iterate through matched source VElement's children (VText and VElements)
          // to attempt to match them to the destination children
          var bestSrcValue = null, bestSrcItem = null;
          for (var mc = 0, mcl = src.children.length; mc < mcl; mc++) {
            var srcChild = src.children[mc];
            // Do not match already matched children
            if (srcChild.isMatched) continue;
            // Do no match children of different types
            var isSameType = (source.type === destination.type);
            if (!isSameType) continue;
            // Get comparison ratio value
            var value = comparer.compare(destChild, srcChild);
            if (value === undefined || value === 0) continue;
            // Find the highest value match
            if (bestSrcValue >= value) continue;
            bestSrcValue = value;
            bestSrcItem = srcChild;
            // Stop comparing as soon as identically structured match found
            if (bestSrcValue === 1) break;
          }
          if (!bestSrcItem) {
            // Remove unmatched destination nodes and mark all of their children
            // as removed
            modifier.remove(destChild);
            continue;
          }
          // Create a relationship between matched virtual nodes
          bestSrcItem.isMatched = true;
          bestSrcItem.match = destChild;
          destChild.match = bestSrcItem;
          destChild.isMatched = true;
          // Text nodes will never need updating because they are either equal or
          // removed
          if (source.type === TYPE_TEXT) continue;
          // Update matched destination from matched source
          modifier.update(destChild, bestSrcItem);
        }
      }
      // Add unmatched source nodes (VElement and VText) to their parents in the
      // best possible position
      for (var s = 0, sl = source.actualLength; s < sl; s++) {
        var src = source[s];
        // Ignore already added sub children
        if (src.isAdded) continue;
        // Ignore anything already matched and updated
        if (src.isMatched) continue;
        modifier.add(src);
      }
      // Check child order in parents with added or removed children and reorder
      // where necessary.
      for (var s = 0, sl = source.actualLength; s < sl; s++) {
        var src = source[s];
        if (!src.shouldSort) continue;
        //rafer.call(modifier, "order", src);
        modifier.order(src);
      }
    }
  });

  /**
   * Comparison behaviour for virtual nodes
   * @param {Object} options Set of options for comparison control
   */
  function Compare(options) {
    this._options = options;
  }
  extend(Compare.prototype, {

    /**
     * Compare two virtual nodes and return a ratio of similarity or undefined
     * @param  {VText|VElement} destination First of two nodes to compare
     * @param  {VText|VElement} source      Second of two nodes to compare
     * @return {Number}             Returns a value between 0 and 1
     */
    compare: function(destination, source) {
      if (source.type === TYPE_TEXT) {
        return this.compareVText(destination, source);
      }
      return this.compareVElement(destination, source);
    },

    /**
     * Check the VText values match. This will cause a Text node to be removed
     * and/or replaced if the source and destination values aren't identical.
     * @param  {VText} destination First of two nodes to compare
     * @param  {VText} source      Second of two nodes to compare
     * @return {Number}             Returns a value of 0 or 1
     */
    compareVText: function(destination, source) {
      return destination.value === source.value ? 1 : 0;
    },

    /**
     * Returns a similarity ratio for two VElement instances. Will return undefined
     * if the node name doesn't match.
     * @param  {VElement} destination First of two nodes to compare
     * @param  {VElement} source      Second of two nodes to compare
     * @return {Number}             Returns a value between 0 and 1
     */
    compareVElement: function(destination, source) {
      // Return if node names do not match
      if (destination.name !== source.name) return;

      if (destination.parent.cleanIds && source.parent.cleanIds && destination.id === source.id) {
        return 1;
      }

      // Represents changes in classes and attributes
      var classesSameRatio = 1;
      var attributesSameRatio = 1;

      // Check if there is some change in the hash
      var changedAttributes = (destination.attrUniquenessHash !== source.attrUniquenessHash);
      if (changedAttributes) {
        // Ratio between the total number of classes and the number of identcal
        // classes
        var destClassesCount = destination.classes.length;
        var srcClassesCount = source.classes.length;
        var sameClassesCount = intersect(destination.classes, source.classes).length
        var totalClassesCount = (destClassesCount + srcClassesCount) / 2;
        classesSameRatio = totalClassesCount ? (sameClassesCount / totalClassesCount) : 0;

        // Ratio betwen the total number of attributes and the number of identical
        // attribtues
        var destAttributesCount = destination.attributeNames.length;
        var srcAttributesCount = source.attributeNames.length;
        var sameAttributesCount = this.getSameAttributesCount(destination, source);
        var totalAttributesCount = (destAttributesCount + srcAttributesCount);
        attributesSameRatio = totalAttributesCount ? (sameAttributesCount / totalAttributesCount) : 0;
      }

      // Represent changes in children and descendents counts

      // Ratio between the total number of children and the total number
      // of children minus the difference between the number of children.
      var destChildrenCount = destination.children.length;
      var srcChildrenCount = source.children.length;
      var totalChildrenCount = (destChildrenCount + srcChildrenCount);
      var diffChildrenCount = totalChildrenCount - Math.abs(destChildrenCount - srcChildrenCount);
      var childrenSameRatio = totalChildrenCount ? (diffChildrenCount / totalChildrenCount) : 0;

      // Ratio between the total number of descendents and the total number
      // of descentents minus the difference between the number of descendants.
      var destDescendentsCount = destination.descendents.length;
      var srcDescendentsCount = source.descendents.length;
      var totalDescendentsCount = (destDescendentsCount + srcDescendentsCount);
      var diffDescendentsCount = totalDescendentsCount - Math.abs(destDescendentsCount - srcDescendentsCount);
      var descendentsSameRatio = totalChildrenCount ? (diffDescendentsCount / totalDescendentsCount) : 0;

      // Binary for same ids
      var idSameRatio = destination.id === source.id ? 1 : 0;

      // Return average similarity value from the element's id, class names,
      // attribute names and values, children count and descendant count.
      var diff = [
        idSameRatio,
        classesSameRatio,
        attributesSameRatio,
        childrenSameRatio,
        descendentsSameRatio
      ];
      var sum = 0;
      for (var i = 0, l = diff.length; i < l; i++) sum+=diff[i];
      var ratio =  sum / diff.length
      return ratio;

    },

    /**
     * Return the number of attributes with matching names and values
     * @param  {VElement} destination First of two nodes to compare
     * @param  {VElement} source      Second of two nodes to compare
     * @return {Number}             Returns the number of matches
     */
    getSameAttributesCount: function(destination, source) {
      var destNames = destination.attributeNames;
      var srcNames = source.attributeNames;
      // Fast lookup of matching names, using arrays
      var sameNames = intersect(destNames, srcNames);
      var count = 0;
      // Slow lookup of values for matching names, using object refs
      for (var i = 0, l = sameNames.length; i < l; i++) {
        var name = sameNames[i];
        if (destination.attributes[name] !== source.attributes[name]) continue;
        count++;
      }
      return count;
    }
  });

  /**
   * Modification behaviour for virtual nodes
   * @param {Object} options Set of options for modification control
   */
  function Modify(options) {
    this._options = options;
  }
  extend(Modify.prototype, {

    /**
     * Update the destination VElement from the source.
     * @param  {VElement} destination Destination VElement from the document
     * @param  {VElement} source      Source VElement from the template
     */
    update: function(destination, source) {

      // Skip if root element and should be ignored
      if (source.level === 0 && this._options.ignoreRoot) return;

      if (source.index !== destination.index) {
        // If child has moved mark parent for sorting
        source.parent.shouldSort = true;
      }

      // Quick check if attributes have changed at all
      var updateAttributes = (destination.attrUniquenessHash !== source.attrUniquenessHash);
      if (!updateAttributes) return;

      // Remove attributes which exist on the destination but not on the source
      for (var i = 0, l = destination.attributeNames.length; i < l; i++) {
        var name = destination.attributeNames[i];
        if (source.attributes[name] !== undefined) continue;
        // if (source.level === 0 && name === "id" && this._options.keepRootId) continue;
        //rafer.call(destination.target, "removeAttribute", name);
        destination.target.removeAttribute(name);
      }

      // Update attributes from source which have changed from destination
      for (var i = 0, l = source.attributeNames.length; i < l; i++) {
        var name = source.attributeNames[i];
        if (destination.attributes[name] === source.attributes[name]) continue;
        //rafer.call(destination.target, "setAttribute", name, source.attributes[name]);
        destination.target.setAttribute(name, source.attributes[name]);
      }

    },

    /**
     * Remove destination node
     * @param  {VText|VElement} destination Node to remove
     */
    remove: function(destination) {

      var target = destination.target;

      // Switch between modern browsers and IE11
      if (target.remove) {
        //rafer.call(target, "remove");
        target.remove();
      } else {
        //rafer.call(target.parentNode, "removeChild", target);
        target.parentNode.removeChild(target);
      }

      // Mark parent as needing sorting
      destination.parent.match.shouldSort = true;

      // Mark node as having been removed
      destination.isRemoved = true;

      // Mark all VElement descendents as removed so that they aren't compared
      // or matched in subsequent traversal loops
      if (destination.type !== TYPE_ELEMENT) return;
      var descendents = destination.descendents;
      for (var d = 0, dl = descendents.length; d < dl; d++) {
        var descendent = descendents[d];
        descendent.isRemoved = true;
      }
    },

    /**
     * Add a source node to the matched destination parent
     * @param {VText|VElement} source Source VText or VElement to add
     */
    add: function(source) {

      var parent = source.parent;
      var parentElement = parent.match.target;
      var childElement = source.target;

      // Choose the correct method for adding to the DOM
      var isBeyondLast = source.index > parentElement.childNodes.length-1;
      if (isBeyondLast) {
        parentElement.appendChild(childElement);
      } else {
        var nextElement = parentElement.childNodes[source.index];
        parentElement.insertBefore(childElement, nextElement);
      }

      // Mark parent for sorting
      parent.shouldSort = true;

      // Create relationship between source and itself for sorting function
      source.match = source;
      source.isAdded = true;

      // Mark all VElement descendents as added so that they aren't added again
      if (source.type !== TYPE_ELEMENT) return;
      var descendents = source.descendents;
      for (var d = 0, dl = descendents.length; d < dl; d++) {
        var descendent = descendents[d];
        descendent.isAdded = true;
      }

    },

    /**
     * Reorder children inside parent
     * @param  {VElement} parent Parent node whose children need sorting.
     */
    order: function(parent) {

      // If parent has no children return
      if (!parent.children.length) return;

      var parentElement = parent.match.target;

      // If the current first node and needed first node are the same, then skip
      var subjectFirstElement =  parent.children[0].match.target;
      var currentFirstElement = parentElement.childNodes[0];
      if (!currentFirstElement.isSameNode(subjectFirstElement)) {
        parentElement.insertBefore(subjectFirstElement, currentFirstElement);
      }

      var lastIndex = parent.children.length -1;
      for (var i = 1, l = parent.children.length; i < l; i++) {
        var subjectChildElement = parent.children[i].match.target;

        var isLast = (i >= lastIndex);
        if (isLast) {
          // If the current last element and the needed last are the same, then skip
          var currentLastElement = parentElement.childNodes[parent.children.length-1];
          if (!currentLastElement.isSameNode(subjectChildElement)) {
            parentElement.appendChild(subjectChildElement);
          }
          continue;
        }

        // If the current location element and the needed one are the same, then skip
        var currentNextElement = parentElement.childNodes[i];
        if (!currentNextElement.isSameNode(subjectChildElement)) {
          parentElement.insertBefore(subjectChildElement, currentNextElement);
        }

      }
    }

  });

  function processOptions(options) {
    options = options || {};
    var hash;
    if (options.ignoreSubTreesWithAttributes && options.ignoreSubTreesWithAttributes.length) {
      hash = {};
      for (var i = 0, l = options.ignoreSubTreesWithAttributes.length; i < l; i++) {
        hash [options.ignoreSubTreesWithAttributes[i]] = true;
      }
      options.ignoreSubTreesWithAttributes = hash;
    }
    if (options.ignoreAttributes && options.ignoreAttributes.length) {
      hash = {};
      for (var i = 0, l = options.ignoreAttributes.length; i < l; i++) {
        hash [options.ignoreAttributes[i]] = true;
      }
      options.ignoreAttributes = hash;
    }
    return options;
  }

  window.vode = {

    /**
     * Update the target's innerHTML from the source HTML
     * @param  {Element} target      DOM Element to update
     * @param  {String} innerHTML    Update inner from this html
     */
    updateInnerHTML: function(target, innerHTML, options) {
      // Convert innerHTML and target into Vode instances
      options = extend({}, options, {
        ignoreRoot: true
      });
      options = processOptions(options);
      var source = Vode.fromString(innerHTML, true, options);
      var destination = Vode.fromNode(target, options);
      // Update target from source
      destination.update(source, options);
    },

    /**
     * Update the target's outerHTML from the source HTML
     * @param  {Element} target      DOM Element to update
     * @param  {String} innerHTML    Update inner from this html
     */
    updateOuterHTML: function(target, outerHTML, options) {
      options = extend({}, options, {
        ignoreRoot: false,
        keepRootId: true
      });
      options = processOptions(options);
      var source = Vode.fromString(outerHTML, false, options);
      var destination = Vode.fromNode(target, options);
      // Update target from source
      destination.update(source, options);
    }

  };


  var tempDiv = document.createElement('div');

})();
