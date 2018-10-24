var ContentBodyView = View.extend({

  template: function() {
    var parts = upvote.router.hash.split("=");
    var name = parts[0];
    var id = parts[1];
    switch (name) {
      case "#login":
        return ``;
      case "#repos":
        return ``;
      case "#polls":
        return ``;
      case "#poll":
        return `
<div id="${this.id}" class="content-body">
  <div class="inner">
    <div class="title">
      <span>
        <a class="poll" href="#poll=${upvote.model.poll.number}">${upvote.model.poll.title}</a>
      </span>
      <a class="poll" href="${upvote.model.poll.htmlUrl}" target="_blank"><span class="issue-number">#${upvote.model.poll.number}</span></a>
    </div>
    <div class="markdown">
    ${markdown.makeHtml(upvote.model.poll.body)}
    </div>
  </div>
</div>
`;
    }
  }

});
