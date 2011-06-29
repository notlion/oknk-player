JS_FILES = \
	src/OknkPlayer.js \
	lib/soundmanager2-nodebug.js

JS_COMPILER = \
	java -jar util/compiler-20110615/compiler.jar \
	--charset UTF-8

all: oknk-player.js oknk-player.min.js

%.min.js: %.js
	$(JS_COMPILER) < $^ > $@

oknk-player.js: $(JS_FILES) Makefile
	rm -f $@
	cat $(JS_FILES_WEBGL) $(JS_FILES) >> $@
	chmod a-w $@

oknk-player.min.js: oknk-player.js
	rm -f $@
	$(JS_COMPILER) < oknk-player.js >> $@

clean:
	rm -rf oknk-player.js oknk-player.min.js