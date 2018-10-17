var clamp = function(low, value, hi) {
  return (value < low) ? low : (value > hi) ? hi : value;
};

var isNumber = function(obj) {
  return Object.prototype.toString.call(obj) == '[object Number]';
};
