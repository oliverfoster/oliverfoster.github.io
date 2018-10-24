var CommentCollection = Collection.extend({

  constructor: function CommentCollection(data, options) {
    this.issueNumber = options.issueNumber || data.issueNumber;
    return Collection.call(this, data, {
      child: function(value) {
        if (value instanceof Array) return new Collection(value, options);
        return new CommentModel(value, options);
      }
    });
  }

});
