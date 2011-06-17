var OknkPlayer = OknkPlayer || (function(){

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

    function SvgPath(){
        this.element = document.createElementNS(svg_ns, "path");
        this.pos = new Vec2(0, 0);
    }
    SvgPath.prototype = {

        moveTo: function(x, y){
            this.d.push("M", x, y);
            this.pos.set(x, y);
        },

        lineTo: function(x, y){
            this.d.push("L", x, y);
            this.pos.set(x, y);
        },

        arc: function(cx, cy, theta){
            var center = new Vec2(cx, cy);
            var radius = this.pos.distTo(center);
            var end = this.pos.dup().sub(center).rotate(theta).add(center);
            this.d.push("A", radius, radius, 0, theta > Math.PI ? 1 : 0, 1, end.x, end.y);
            this.pos.set(end.x, end.y);
        },

        close: function(){
            this.d.push("Z");
        },

        begin: function(){
            this.d = [];
            this.pos.set(0, 0);
        },

        end: function(){
            this.element.setAttribute("d", this.d.join(" "));
        }

    };


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


        var element = this.element = document.createElement("div");
        element.id = "oknkplayer" + last_player_id++;

        var audio = this.audio = document.createElement("audio");
        audio.addEventListener("progress", onAudioLoadProgress);
        audio.addEventListener("error", onAudioError);
        element.appendChild(audio);


        var svg = this.svg = document.createElementNS(svg_ns, "svg");
        svg.setAttribute("width", this.options.size);
        svg.setAttribute("height", this.options.size);

        this.load_arc = makeArc();
        this.load_arc.element.setAttribute("class", "oknk-load-progress");
        svg.appendChild(this.load_arc.element);

        this.play_arc = makeArc();
        this.play_arc.element.setAttribute("class", "oknk-play-progress");
        svg.appendChild(this.play_arc.element);

        element.appendChild(svg);


        var player = this;
        player.progress = 0;
        player.position = 0;
        player.radius = this.options.size / 2;

        function makeArc(){
            var arc = new SvgPath();
            arc.setProgress = function(progress){
                var x = y = player.radius;

                this.begin();
                this.moveTo(x, y);
                this.lineTo(x, 0);

                var theta = Math.PI * 2 * progress;
                this.arc(x, y, Math.min(Math.PI, theta));
                if(theta > Math.PI)
                    this.arc(x, y, theta - Math.PI);

                this.close();
                this.end();
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

            window.requestAnimationFrame(update, player.element);
        }
        update();
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
