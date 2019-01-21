var IssueCollection = Collection.extend({

  constructor: function IssueCollection(data, options) {
    this.parentIssue = options && options.parentIssue;
    return Collection.call(this, data, {
      child: function(value) {
        if (value instanceof Array) return new IssueCollection(value, options);
        return new IssueModel(value, options);
      }
    });
  },

  update: function(callback) {
    var loaded = 0;
    if (!this.length) {
      callback && callback();
      return;
    }
    this.forEach(function(issue) {
      issue.fetchReferencingComments(function(comments) {
        issue.fetchReactions(function() {
          loaded++;
          if (loaded !== this.length) return;
          callback && callback();
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  order: function() {
    this.sort(function(a,b) {
      var aRef = a.referenceComment;
      var bRef = b.referenceComment;
      if (!aRef) return -1;
      if (!bRef) return 1;
      if (b.state !== a.state) {
        if (b.state === "closed") return -1;
        return 1;
      }
      var positiveDifference = (bRef.reactions['+1'] - bRef.reactions['1']) -
        (aRef.reactions['+1'] - aRef.reactions['1']);
      if (!positiveDifference) {
        var totalDifference = (bRef.reactions['+1'] + bRef.reactions['1']) -
          (aRef.reactions['+1'] + aRef.reactions['1']);
        return totalDifference;
      }
      return positiveDifference;
    });
    return this;
  }

});
