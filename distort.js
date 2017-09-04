function magic() {
	var opts = {
			r: 180
		  , dr: 60
		  , angle: Math.PI/1.4
		}
	  , i
	  , r
	  , angle
	  , dx
	  , dy
	  , dr
	  
	  , dst = {
		  x: 0
		, y: 0
		, canvas: document.createElement('canvas')
		, ctx: null
		, imageData: null
		}

	  , src = {
		  x: 0
		, y: 0
		, canvas: document.createElement('canvas')
		, ctx: null
		, imageData: null
		}

	  , bounds
	  , offset
	  , k = { x: 1, y: 1 }
	;

	src.canvas.width = this.width;
	src.canvas.height = this.height;
	src.ctx = src.canvas.getContext('2d');
	src.ctx.drawImage( this, 0, 0);
	src.imageData = src.ctx.getImageData( 0, 0, src.canvas.width, src.canvas.height);

	DOMURL.revokeObjectURL(url); // TODO don't ref globals.
	
	// arc boundaries
	bounds = getArcBoundaries( opts.r, opts.dr, opts.angle);
	
	dst.canvas.width = bounds.right - bounds.left;
	dst.canvas.height = bounds.top - bounds.bottom;

	// mapping coefficients
	k.x = src.canvas.width / opts.angle;
	k.y = src.canvas.height / (2 * opts.dr);


	// destination imageData
	dst.ctx = dst.canvas.getContext('2d');
	dst.imageData = dst.ctx.getImageData( 0, 0, dst.canvas.width, dst.canvas.height);


	// for every destination pixel find corresponding source pixel
	for( i = 0; i < dst.imageData.data.length; i += 4) {

		// coords relative to the pole
		dst.x = (i / 4) % dst.canvas.width + bounds.left;
		dst.y = Math.floor( i / 4 / dst.canvas.width) + bounds.bottom;
		
		angle = Math.atan2( dst.x, dst.y);


		// skip  or  render
		interpolate = false;

		if( 2 * Math.abs(angle) > opts.angle) {
			// TODO decide when to interpolate on the angle border
			//dst.imageData.data.set(new Uint8ClampedArray([200,64,0,200]),i);
			continue;
		}


		// radius limit
		r = Math.sqrt( dst.x * dst.x + dst.y * dst.y);
		dr = Math.abs(opts.r - r) - opts.dr;

		if( dr > 1) {
			//dst.imageData.data.set(new Uint8ClampedArray([0,64,128,100]),i);
			continue;
		} else if( Math.abs(dr) < 1) {
			interpolate = true;
// 			dst.imageData.data.set(new Uint8ClampedArray([255,64,128,100]),i);
// 			continue;
		}


		// Map angle and dr to source coordinates
		src.x = src.canvas.width / 2 + k.x * angle;
		src.y = src.canvas.height / 2 - k.y * (opts.r - r);
		if( src.x < 0 || src.x >= src.canvas.width
			|| 
			src.y < 0 || src.y >= src.canvas.height
		) {
			//dst.imageData.data.set(new Uint8ClampedArray([0,0,255,200]),i);
			continue;
		}


		rgba = subsample( src.imageData.data, src.x, src.y, src.canvas.width);
		
		if( interpolate) {
			
		}
		
		dst.imageData.data.set( rgba, i);
	}
	
// 	src.ctx.putImageData( src.imageData, 0, 0);
// 	document.body.appendChild( src.canvas);

	dst.ctx.putImageData( dst.imageData, 0, 0);
	document.body.appendChild( dst.canvas);
}


/**
 * Given floating coordinates
 * calculate average of 4 pixels
 * in a proportion.
 *
 * Ref: en.wikipedia.org/wiki/Bilinear_interpolation
 */
function subsample( data, x, y, width) {
	var x1 = Math.floor(x) + 0.5
	  , y1 = Math.floor(y) + 0.5
	  , x2 = x1 + Math.sign((x % 1) - 0.5)
	  , y2 = y1 + Math.sign((y % 1) - 0.5)
	  , k11 = Math.abs((x2 - x) * (y2 - y))
	  , k21 = Math.abs((x - x1) * (y2 - y))
	  , k12 = Math.abs((x2 - x) * (y - y1))
	  , k22 = Math.abs((x - x1) * (y - y1))
	  , x1i = Math.floor(x1)
	  , x2i = Math.floor(x2)
	  , y1i = Math.floor(y1)
	  , y2i = Math.floor(y2)
	  , q11 = getPixel( data, x1i, y1i, width)
	  , q12 = getPixel( data, x1i, y2i, width)
	  , q21 = getPixel( data, x2i, y1i, width)
	  , q22 = getPixel( data, x2i, y2i, width)
	  , i
	  , rgba = new Uint8ClampedArray(4);
	;

	for( i=0; i<4; i++) {
		rgba[i] = Math.round(
			k11 * q11[i] + 
			k12 * q12[i] + 
			k21 * q21[i] + 
			k22 * q22[i]
		);
	}

	return rgba;
}


/**
 * Abstract bilinear interpolation
 *
 * Ref: en.wikipedia.org/wiki/Bilinear_interpolation
 */
function bilinear( x, y, x1, y1, x2, y2, v11, v21, v12, v22) {
	var k = (x2 - x1) * (y2 - y1)
	  , dx1 = x - x1
	  , dy1 = y - y1
	  , dx2 = x2 - x
	  , dy2 = y2 - y
	  , k11 = dx2 * dy2
	  , k21 = dx1 * dy2
	  , k12 = dx2 * dy1
	  , k22 = dx1 * dy1
	;

	return (v11 * k11 + v21 * k21 + v12 * k12 + v22 * k22) / k;
}



function getPixel( data, x, y, width) {
	var offset = 4 * (x + width * y);
	return data.subarray( offset, offset + 4);
}


/**
 * Given arc parameters
 * get rectangle containing the arc,
 * relative to arc's pole
 */
function getArcBoundaries( r, dr, angle) {
	var top, bottom, left, right;
	
	bottom = (r - dr) * Math.cos( angle / 2);
	top = r + dr;
	right = (r + dr) * Math.sin( angle / 2);
	left = -right;
	
	return { left: left, right: right, top: top, bottom: bottom };
}



var data = document.getElementById('svg-tmpl').innerHTML;
var svg = new Blob([data], {type: 'image/svg+xml'});

var DOMURL = window.URL || window.webkitURL || window;
var url = DOMURL.createObjectURL(svg);

var img = new Image();
img.onload = magic;
img.src = url;

//document.body.appendChild(img); // show original image




