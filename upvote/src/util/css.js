var parseUnit = function(value, unit, defaultUnit) {
  value = String(value || 0) + String(unit || "");
  var unitMatch = value.match(/[^0-9]+/g);
  var unit = defaultUnit === undefined ? "px" : defaultUnit;
  if (unitMatch) unit = unitMatch[0];
  return {
    value: parseFloat(value) || 0,
    unit: unit
  };
};
