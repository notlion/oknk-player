var OknkPlayer = OknkPlayer || (function(){

    "use strict"; "use restrict";

    function Vec2(x, y){
        this.set(x, y);
    }
    Vec2.prototype = {
        set: function(x, y){
            this.x = x;
            this.y = y;
            return this;
        },
        dup: function(){
            return new Vec2(this.x, this.y);
        },
        add: function(v){
            this.x += v.x;
            this.y += v.y;
            return this;
        },
        sub: function(v){
            this.x -= v.x;
            this.y -= v.y;
            return this;
        },
        rotate: function(theta){
            var st = Math.sin(theta);
            var ct = Math.cos(theta);
            return this.set(
                this.x * ct - this.y * st,
                this.x * st + this.y * ct
            );
        },
        distTo: function(v){
            var xo = v.x - this.x;
            var yo = v.y - this.y;
            return Math.sqrt(xo * xo + yo * yo);
        }
    };


    // DOM Helpers

    function elemOffset(elem){
        var off = new Vec2(elem.offsetLeft, elem.offsetTop);
        while(elem = elem.offsetParent){
            off.x += elem.offsetLeft;
            off.y += elem.offsetTop;
        }
        return off;
    }

    var requestAnimFrame = (function(){
        return window.requestAnimationFrame       ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame    ||
               window.oRequestAnimationFrame      ||
               window.msRequestAnimationFrame     ||
               function(callback, element){
                   return window.setTimeout(callback, 1000 / 60);
               };
    })();
    var cancelRequestAnimFrame = (function(){
        return window.cancelRequestAnimationFrame       ||
               window.webkitCancelRequestAnimationFrame ||
               window.mozCancelRequestAnimationFrame    ||
               window.oCancelRequestAnimationFrame      ||
               window.msCancelRequestAnimationFrame     ||
               clearTimeout
    })();


    // SVG Helpers

    var ns = {
        svg:   "http://www.w3.org/2000/svg",
        xlink: "http://www.w3.org/1999/xlink"
    };

    function Elem(tagname){
        if(arguments.length === 1){
            this.element = document.createElementNS(ns.svg, tagname);
            this.transforms = [];
        }
    }
    Elem.prototype = {
        attr: function(name, value){
            var idx = name.indexOf(":");
            if(idx >= 0)
                this.element.setAttributeNS(ns[name.slice(0, idx)], name, value);
            else
                this.element.setAttribute(name, value);
            return this;
        },
        translate: function(x, y){
            this.transforms.push("translate(" + x + "," + y + ")");
            return this.attr("transform", this.transforms.join(""));
        },
        addChild: function(elem){
                this.element.appendChild(elem.element);
                return this;
        },
        on: function(name, callback){
            this.element.addEventListener(name, callback);
            return this;
        },
        off: function(name, callback){
            this.element.removeEventListener(name, callback);
            return this;
        }
    };

    function Path(){
        Elem.call(this, "path");
        this.pos = new Vec2(0, 0);
    }
    Path.prototype = new Elem();
    Path.prototype.moveTo = function(x, y){
        this.d.push("M", x, y);
        this.pos.set(x, y);
        return this;
    };
    Path.prototype.lineTo = function(x, y){
        this.d.push("L", x, y);
        this.pos.set(x, y);
        return this;
    };
    Path.prototype.arc = function(cx, cy, theta){
        var center = new Vec2(cx, cy);
        var radius = this.pos.distTo(center);
        var end = this.pos.dup().sub(center).rotate(theta).add(center);
        this.d.push("A", radius, radius, 0, theta > Math.PI ? 1 : 0, theta < 0 ? 0 : 1, end.x, end.y);
        this.pos.set(end.x, end.y);
        return this;
    };
    Path.prototype.rect = function(x1, y1, x2, y2){
        this.d.push("M", x1, y1, "H", x2, "V", y2, "H", x1, "Z");
        return this;
    };
    Path.prototype.close = function(){
        this.d.push("Z");
        return this;
    };
    Path.prototype.begin = function(){
        this.d = [];
        this.pos.set(0, 0);
        return this;
    };
    Path.prototype.end = function(){
        return this.attr("d", this.d.join(" "));
    };


    // Tween Helpers

    function tween(obj, property){
    }


    // UI

    function Toggle(radius){
        Elem.call(this, "g");

        this.attr("class", "oknk-toggle");

        this.gfk_bg = new Elem("circle").attr("r", radius);
        this.icons = {
            play: new Path().begin().moveTo(4, 0)
                                    .lineTo(-3, 4)
                                    .lineTo(-3, -4).close().end()
                                    .attr("class", "oknk-icon-play"),
            pause: new Path().begin().rect(-4, -3, -1, 3)
                                     .rect(1, -3, 4, 3).end()
                                     .attr("class", "oknk-icon-pause")
        };

        this.addChild(this.gfk_bg)
        for(var i in this.icons){
            this.addChild(this.icons[i]);
        }

        this.icon("play");
    }
    Toggle.prototype = new Elem();
    Toggle.prototype.icon = function(name){
        for(var i in this.icons){
            this.icons[i].element.style.display = "none";
        }
        this.icons[name].element.style.display = "inline";
        return this;
    };

    function Progress(radius){
        Elem.call(this, "g");

        this.attr("class", "oknk-progress");

        function createArc(){
            var arc = new Path();
            arc.set = function(progress){
                this.begin().moveTo(0, 0).lineTo(0, -radius);

                if(progress > 0){
                    var theta = Math.PI * 2 * progress;
                    this.arc(0, 0, Math.min(Math.PI, theta));
                    if(theta > Math.PI)
                        this.arc(0, 0, theta - Math.PI);
                }

                this.close().end();
            }
            return arc;
        }

        this.load = createArc().attr("class", "load");
        this.addChild(this.load);
        this.play = createArc().attr("class", "play");
        this.addChild(this.play);
    }
    Progress.prototype = new Elem();

    function ArcLabel(radius){
        Elem.call(this, "g");

        this.attr("class", "oknk-label");

        var defs = new Elem("defs").addChild(
            new Path().begin().moveTo(0, -radius)
                              .arc(0, 0, -Math.PI)
                              .arc(0, 0, -Math.PI).end()
                              .attr("id", "path")
        );

        this.textpath = new Elem("textPath").attr("xlink:href", "#path")
                                            .attr("text-anchor", "middle")
                                            .attr("startOffset", "50%");
        this.text = new Elem("text").addChild(this.textpath);

        this.addChild(defs);
        this.addChild(this.text);
    }
    ArcLabel.prototype = new Elem();
    ArcLabel.prototype.setText = function(text){
        this.textpath.element.textContent = text;
        return this;
    };


    var default_options = {
        size: 100
    }

    var last_player_id = 0;

    function Player(options){
        this.options = {};
        for(var o in default_options)
            this.options[o] = options[o] !== undefined ? options[o] : default_options[o];


        var player = this;
        player.progress = 0;
        player.position = 0;
        player.playing = false;
        player.radius = this.options.size / 2;


        var element = this.element = document.createElement("div");
        element.id = "oknkplayer" + last_player_id++;

        var audio = this.audio = document.createElement("audio");
        audio.addEventListener("progress", onAudioLoadProgress);
        audio.addEventListener("error", onAudioError);
        element.appendChild(audio);


        var svg = this.svg = new Elem("svg").attr("xmlns", ns.svg)
                                            .attr("xmlns:xlink", ns.xlink)
                                            .attr("width", this.options.size)
                                            .attr("height", this.options.size);

        var grp = new Elem("g").translate(player.radius, player.radius);

        this.ui = {
            progress: new Progress(player.radius).on("mousedown", onScrubDown),
            toggle:   new Toggle(player.radius * 0.45).on("click", onToggleClick)
        };

        grp.addChild(this.ui.progress);
        grp.addChild(this.ui.toggle);

        element.appendChild(svg.addChild(grp).element);


        function onAudioLoadProgress(e){
            player.progress = audio.buffered.end(0) / audio.duration;
        }
        function onAudioError(e){
            console.error("OknkPlayer Error: ", e);
        }

        function onToggleClick(e){
            if(player.playing){
                player.pause();
            }
            else{
                player.play();
            }
        }

        var was_playing_before_scrub;

        function onScrubDown(e){
            document.addEventListener("mousemove", onScrubMove);
            document.addEventListener("mouseup", onScrubUp);
            was_playing_before_scrub = player.playing;
            onScrubMove(e);
        }
        function onScrubMove(e){
            var player_pos = elemOffset(player.element);
            var ox = e.clientX - (player_pos.x + player.radius);
            var oy = e.clientY - (player_pos.y + player.radius);
            player.skip((Math.atan2(-ox, oy) + Math.PI) / (Math.PI * 2));
        }
        function onScrubUp(e){
            document.removeEventListener("mousemove", onScrubMove);
            document.removeEventListener("mouseup", onScrubUp);
            if(was_playing_before_scrub)
                player.play();
        }

        function update(){
            player.position = player.audio.currentTime / player.audio.duration;

            player.ui.progress.load.set(player.progress);
            player.ui.progress.play.set(player.position);
        }
        function loop(){
            update();
            requestAnimFrame(loop, player.element);
        }
        loop();
    }

    Player.prototype = {
        load: function(src){
            this.audio.src = src;
            this.audio.load();
        },
        play: function(){
            this.audio.play();
            this.playing = true;
            this.ui.toggle.icon("pause");
        },
        pause: function(){
            this.audio.pause();
            this.playing = false;
            this.ui.toggle.icon("play");
        },
        skip: function(position){
            this.pause();
            this.audio.currentTime = position * this.audio.duration;
        }
    };

    return Player;

})();
