var resolve = function(value, context, args) {
    if (typeof value === "function") {
        var args = toArray(arguments, 2);
        return value.apply(context || window, args);
    }
    return value;
};
