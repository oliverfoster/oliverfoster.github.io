var RepoCollection = Collection.extend({

  constructor: function RepoCollection(data, options) {
    return Collection.call(this, data, {
      child: function(value) {
        if (value instanceof Array) return new RepoCollection(value, options);
        return new RepoModel(value, options);
      }
    });
  }

});
