var toggleClass = function(element, classNames, bool) {
  switch (typeof classNames) {
    case "string":
      classNames = classNames.split(" ");
      break;
  }
  bool = (bool === undefined) ? true : bool;
  var classList = element.classList;
  for (var n = 0, nl = classNames.length; n < nl; n++) {
    var nameItem = classNames[n];
    var found = false;
    for (var i = 0, l = classList.length; i < l; i++) {
      var classItem = classList[i];
      if (classItem !== nameItem) continue;
      found = true;
    }
    if (!found && bool) classList.add(nameItem);
    else if (found && !bool) classList.remove(nameItem);
  }
  if (element.classList.length === 0) {
    removeAttribute(element, "class");
  }
};

var removeAttribute = function(element, name) {
  if (element.removeAttribute) return element.removeAttribute(name);
  if (element.attributes.removeNamedItem && element.attributes.getNamedItem(name)) {
    return element.attributes.removeNamedItem(name);
  }
  element.setAttribute(name, "");
};

var removeElement = function(element) {
  if (element.remove) return element.remove();
  element.parentNode.removeChild(element);
};

var replaceWith = function(element, withElement) {
  if (element.replaceWith) return element.replaceWith(withElement);
  var parent = element.parentNode;
  for (var i = 0, l = parent.childNodes.length; i < l; i++) {
    if (parent.childNodes[i] !== element) continue;
    parent.insertBefore(withElement, element);
    removeElement(element);
    return;
  }
};

var prependElement = function(container, element) {
  if (!container.childNodes.length) {
    return container.appendChild(element);
  }
  container.insertBefore(element, container.childNodes[0]);
};

var createEvent = function(name, options) {
  options = defaults(options, {
    bubbles: false,
    cancelable: true
  });
  if (!createEvent._ie11) {
    try {
      var event = new Event(name, options);
      return event;
    } catch (e) {
      createEvent._ie11 = true;
    }
  }
  if (!createEvent._ie11) return;
  var event = document.createEvent('Event');
  event.initEvent(name, options.bubbles, options.cancelable);
  return event;
};
