var fsg = require("fs-glob");
var fs = require("fs");
var path = require("path");
var uglify = require("uglify-js");

fsg.stats({
    globs: [
        "*.css",
        "**/*.css"
    ],
    location: "./src"
}).then((stats)=>{

    var cssJS = 'if ($) $("<style>",{text:"';
    return stats.each((stat, next, resolve)=>{

        if (!stat) return resolve();

        var css = fs.readFileSync(stat.location).toString();
        css = css.replace(/\"/g, "'");
        css = css.replace(/  /g, "");
        css = css.replace(/\r\n/g, "");
        css = css.replace(/\n/g, "");
        css = css.replace(/ [\{]/g, "{");
        css = css.replace(/ *: */g, ":");
        cssJS+=css;

        next();

    }).then(()=>{
        cssJS += '"}).appendTo("head");';
        return {
            "jquery.video.css": cssJS
        };
    });


}).then((files)=>{

    files['store.js'] = fs.readFileSync("./src/utils/store.js").toString();
    files['constants.js'] = fs.readFileSync("./src/utils/constants.js").toString();
    files['arrays.js'] = fs.readFileSync("./src/utils/arrays.js").toString();
    files['objects.js'] = fs.readFileSync("./src/utils/objects.js").toString();
    files['strings.js'] = fs.readFileSync("./src/utils/arrays.js").toString();
    files['units.js'] = fs.readFileSync("./src/utils/units.js").toString();
    files['regex.js'] = fs.readFileSync("./src/utils/regex.js").toString();
    files['timing.js'] = fs.readFileSync("./src/utils/timing.js").toString();
    files['device.js'] = fs.readFileSync("./src/utils/device.js").toString();
    files['events.js'] = fs.readFileSync("./src/utils/events.js").toString();
    files['properties.js'] = fs.readFileSync("./src/utils/properties.js").toString();
    files['class.js'] = fs.readFileSync("./src/utils/class.js").toString();
    files['core.js'] = fs.readFileSync("./src/core/core.js").toString();
    files['stream.js'] = fs.readFileSync("./src/utils/stream.js").toString();

    return fsg.stats({
        globs: [
            "*.js",
            "**/*.js",
            "!utils/store.js",
            "!utils/constants.js",
            "!utils/arrays.js",
            "!utils/objects.js",
            "!utils/strings.js",
            "!utils/units.js",
            "!utils/timing.js",
            "!utils/utils.js",
            "!utils/device.js",
            "!utils/events.js",
            "!utils/class.js",
            "!core/core.js",
            "!utils/stream.js"
        ],
        location: "./src"
    }).then((stats)=>{

        return stats.each((stat, next, resolve)=>{

            if (!stat) return resolve(files);

            files[fsg.rel(stat.location, "./src")] = fs.readFileSync(stat.location).toString();

            next();

        });

    });

}).then((files)=>{

    var result = uglify.minify(files, {
        toplevel: true,
        compress: {
            passes: 2
        },
        mangle: {
            properties: {
                regex: /_.*/,
                builtins : true
            }
        },
        output: {
            beautify: false
        }
    });
    if (result.error) {
        console.log(files['jquery.video.css']);
        console.log(result.error);
        return;
    }

    var values = [];
    for (var k in files) values.push(files[k]);

    fsg.mkdir("./build");
    fs.writeFileSync("./build/jquery.video.js", "(function(window, $){"+values.join("\n")+"})(this,this.jQuery);");
    fs.writeFileSync("./build/jquery.video.min.js", "(function(window, $){"+result.code+"})(this,this.jQuery);");

});
