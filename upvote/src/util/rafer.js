var Rafer = Class.extend({

  defered: null,
  deferedWorking: null,
  requests: null,
  requestsWorking: null,
  isWaiting: false,
  mode: "ram",
  ramLimit: 50,
  currentDeferedLength: 0,
  currentRequestsLength: 0,

  constructor: function Rafer() {
    bindAll(this, "frame");
    this.defineProperties({
      defered$write: new Array(100),
      deferedWorking$write: new Array(100),
      requests$write: new Array(100),
      requestsWorking$write: new Array(100),
      currentDeferedLength$write: 0,
      currentRequestsLength$write: 0,
      isWaiting$write: false
    });
  },

  resizeDefered$value: function() {
    var currentSize = this.defered.length;
    var newSize = currentSize * 2;
    this.defered.length = newSize;
    this.deferedWorking.length = newSize;
  },

  resizeRequests$value: function() {
    var currentSize = this.requests.length;
    var newSize = currentSize * 2;
    this.requests.length = newSize;
    this.requestsWorking.length = newSize;
  },

  set: function(subject, name, value) {
    if (!this.isWaiting) {
      this.request(this.dummy);
    }
    if (this.currentDeferedLength === this.defered.length - 1) {
      this.resizeDefered();
    }
    var item = {
      subject: subject,
      name: name,
      value: value,
      type: "set"
    };
    this.defered[this.currentDeferedLength] = item;
    this.currentDeferedLength++;
  },

  get: function(subject, name) {
    for (var i = 0, l = this.currentDeferedLength; i < l; i++) {
      var item = this.defered[i];
      if (item.subject !== subject) continue;
      if (item.name !== name) continue;
      return item.value;
    }
    return subject[name];
  },

  call: function(subject, name, args) {
    if (!this.isWaiting) {
      this.request(this.dummy);
    }
    if (this.currentDeferedLength === this.defered.length - 1) {
      this.resizeDefered();
    }
    var item = {
      subject: subject,
      name: name,
      value: toArray(arguments, 2),
      type: "call"
    }
    this.defered[this.currentDeferedLength] = item;
    this.currentDeferedLength++;
  },

  dummy$value: function() {
    // call me to force a raf call
  },

  flush$value: function() {
    var rams = 0;
    do {
      var oldLength = this.currentDeferedLength;
      for (var i = 0, l = oldLength; i < l; i++) {
        this.deferedWorking[i] = this.defered[i];
        this.defered[i] = null;
      }
      this.currentDeferedLength = 0;
      for (var i = 0, l = oldLength; i < l; i++) {
        var wait = this.deferedWorking[i];
        try {
          switch (wait.type) {
            case "set":
              wait.subject[wait.name] = wait.value;
              break;
            case "call":
              if (!wait.name && typeof wait.subject === "function") {
                wait.subject.apply(wait.name, wait.value);
              } else if (!wait.subject && typeof wait.name === "function") {
                wait.name.apply(wait.subject, wait.value);
              } else {
                wait.subject[wait.name].apply(wait.subject, wait.value);
              }
              break;
          }
        } catch (error) {
          debugger;
        }
        this.deferedWorking[i] = null;
      }
      if (this.currentDeferedLength) rams++;
    } while (this.mode === "ram" && this.currentDeferedLength !== 0 && rams < this.ramLimit)
    if (rams === this.ramLimit) {
      this.mode = "wait";
      console.log("Defered queue modified by queue, switching to wait mode.");
    }
  },

  request: function(callback, allowMultipleCalls) {
    if (callback && (!callback._raferQueuePosition || allowMultipleCalls)) {
      if (this.currentRequestsLength === this.requests.length) {
        this.resizeRequests();
      }
      this.requests[this.currentRequestsLength] = callback;
      callback._raferQueuePosition = this.currentRequestsLength+1;
      this.currentRequestsLength++;
    }
    if (!this.currentRequestsLength) return;
    if (this.isWaiting) return;
    this.isWaiting = true;
    window.requestAnimationFrame(this.frame);
  },

  frame$value: function() {
    var oldLength = this.currentRequestsLength;
    for (var i = 0, l = oldLength; i < l; i++) {
      this.requestsWorking[i] = this.requests[i];
      this.requests[i] = null;
    }
    this.currentRequestsLength = 0;
    for (var i = 0, l = oldLength; i < l; i++) {
      this.requestsWorking[i]._raferQueuePosition = null;
      this.requestsWorking[i]();
      this.requestsWorking[i] = null;
    }
    this.isWaiting = false;
    this.flush();
    this.request();
  }

});

var rafer = new Rafer();
