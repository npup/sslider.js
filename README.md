sslider.js
=============

image sliding widget, uses CSS3 transitions or js fallback if possible

- under construction


Usage
-----

	var s = sslider.create(["foo.png", "bar.png", "baz.png"], {
		"duration": 500
		, "target": document.getElementById("bak")
	});

	s.showIdx(1).userNav(false).auto();
