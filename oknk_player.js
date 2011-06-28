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


    // SVG Helpers

    var svg_ns = "http://www.w3.org/2000/svg";

    function Elem(tagname){
        if(arguments.length === 1){
            this.element = document.createElementNS(svg_ns, tagname);
            this.transforms = [];
        }
    }
    Elem.prototype.attr = function(name, value){
        this.element.setAttribute(name, value);
        return this;
    };
    Elem.prototype.class = function(name){
        return this.attr("class", name);
    };
    Elem.prototype.translate = function(x, y){
        this.transforms.push("translate(" + x + "," + y + ")");
        return this.attr("transform", this.transforms.join(""));
    };
    Elem.prototype.addChild = function(elem){
        this.element.appendChild(elem.element);
        return this;
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
        this.d.push("A", radius, radius, 0, theta > Math.PI ? 1 : 0, 1, end.x, end.y);
        this.pos.set(end.x, end.y);
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

    function PlayToggle(radius){
        Elem.call(this, "g");

        this.class("oknk-play-toggle");

        this.gfk_bg = new Elem("circle").attr("r", radius);
        this.gfk_play = new Path().begin().moveTo(4, 0)
                                          .lineTo(-3, 4)
                                          .lineTo(-3, -4).close().end()
                                          .class("oknk-icon-play");

        this.addChild(this.gfk_bg).addChild(this.gfk_play);
    }
    PlayToggle.prototype = new Elem();


    if(!window.requestAnimationFrame){
        window.requestAnimationFrame = (function(){
            return window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame    ||
                   window.oRequestAnimationFrame      ||
                   window.msRequestAnimationFrame     ||
                   function(callback, element){
                       return window.setTimeout(callback, 1000 / 60);
                   };
        })();
    }
    if(!window.cancelRequestAnimationFrame){
        window.cancelRequestAnimationFrame = (function(){
            return window.webkitCancelRequestAnimationFrame ||
                   window.mozCancelRequestAnimationFrame    ||
                   window.oCancelRequestAnimationFrame      ||
                   window.msCancelRequestAnimationFrame     ||
                   clearTimeout
        })();
    }


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
        player.radius = this.options.size / 2;


        var element = this.element = document.createElement("div");
        element.id = "oknkplayer" + last_player_id++;

        var audio = this.audio = document.createElement("audio");
        audio.addEventListener("progress", onAudioLoadProgress);
        audio.addEventListener("error", onAudioError);
        element.appendChild(audio);


        var svg = this.svg = new Elem("svg").attr("width", this.options.size)
                                            .attr("height", this.options.size);

        var grp = new Elem("g").translate(player.radius, player.radius);

        this.load_arc = createArc().class("oknk-progress-load");
        grp.addChild(this.load_arc);

        this.play_arc = createArc().class("oknk-progress-play");
        grp.addChild(this.play_arc);

        this.play_tog = new PlayToggle(player.radius * 0.45);
        grp.addChild(this.play_tog);

        element.appendChild(svg.addChild(grp).element);


        function createArc(){
            var arc = new Path();
            arc.setProgress = function(progress){
                this.begin().moveTo(0, 0).lineTo(0, -player.radius);

                var theta = Math.PI * 2 * progress;
                this.arc(0, 0, Math.min(Math.PI, theta));
                if(theta > Math.PI)
                    this.arc(0, 0, theta - Math.PI);

                this.close().end();
            }
            return arc;
        }

        function onAudioLoadProgress(e){
            player.progress = audio.buffered.end(0) / audio.duration;
        }
        function onAudioError(e){
            console.error("OknkPlayer Error: ", e);
        }

        function update(){
            player.position = player.audio.currentTime / player.audio.duration;

            player.load_arc.setProgress(player.progress);
            player.play_arc.setProgress(player.position);
        }
        function loop(){
            update();
            window.requestAnimationFrame(loop, player.element);
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
        },

        pause: function(){
            this.audio.pause();
        }

    };

    return Player;

})();
