#!/bin/bash
LIB = lib/ip.js
SRC = ${LIB} src/sslider.js

FILE = sslider.js
FILE_MIN = sslider.min.js

DIST_DIR = ./build
DIST_FILE = ${DIST_DIR}/${FILE}
DIST_FILE_MIN = ${DIST_DIR}/${FILE_MIN}

#target: all - clean, build and minify
all: clean min

#target: dist - build
dist: ${SRC}
	@cat ${SRC} > ${DIST_FILE}
	@echo 'target:' $@', building from:' ${SRC}

#target: min - minify built file
min: dist
	@uglifyjs ${DIST_FILE} > ${DIST_FILE_MIN}
	@echo 'target:' $@', using uglifyjs'

#target: lint - run jshint tests
lint: dist
	@jshint --config .jshint-conf ${DIST_FILE}
	@echo 'target:' $@', using jshint'

#target: clean - remove built files
clean:
		@rm -f ${DIST_DIR}/*.js
		@echo 'target:' $@

#target: help - show available targets
help:
	@echo 'Available targets:'
	@egrep "^#target:" [Mm]akefile
