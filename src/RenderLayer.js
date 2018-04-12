'use strict';

L.RenderLayer = (L.Layer ? L.Layer : L.Class).extend({

  // options: {
  //     minOpacity: 0.05,
  //     maxZoom: 18,
  //     radius: 25,
  //     blur: 15,
  //     max: 1.0
  // },
  initialize: function (latlngs, options) {
    this._latlngs = latlngs.sort(function(p,p2) { return p2[0] - p[0] });
    L.setOptions(this, options);
  },

  setLatLngs: function (latlngs) {
    this._latlngs = latlngs;
    return this.redraw();
  },

  addLatLng: function (latlng) {
    this._latlngs.push(latlng);
    return this.redraw();
  },

  setOptions: function (options) {
    L.setOptions(this, options);
    if (this._heat) {
      this._updateOptions();
    }
    return this.redraw();
  },

  redraw: function () {
    if (this._heat && !this._frame && this._map && !this._map._animating) {
      this._frame = L.Util.requestAnimFrame(this._redraw, this);
    }
    return this;
  },

  onAdd: function (map) {
    this._map = map;

    if (!this._canvas) {
      this._initCanvas();
    }

    if (this.options.pane) {
      this.getPane().appendChild(this._canvas);
    } else {
      map._panes.overlayPane.appendChild(this._canvas);
    }

    map.on('moveend', this._reset, this);

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on('zoomanim', this._animateZoom, this);
    }

    this._reset();
  },

  onRemove: function (map) {
    if (this.options.pane) {
      this.getPane().removeChild(this._canvas);
    } else {
      map.getPanes().overlayPane.removeChild(this._canvas);
    }

    map.off('moveend', this._reset, this);

    if (map.options.zoomAnimation) {
      map.off('zoomanim', this._animateZoom, this);
    }
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  _initCanvas: function () {
    var canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');

    var originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
    canvas.style[originProp] = '50% 50%';

    var size = this._map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    var animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));

    this._updateOptions();
  },

  _updateOptions: function () {
  },

  _reset: function () {
    var topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    var size = this._map.getSize();

    this._canvas.width = size.x;
    this._canvas.height = size.y;

    this._redraw();
  },

  _redraw: function () {
    if (!this._map) {
      return;
    }

    var data = [],
      r = 10,
      size = this._map.getSize(),
      zoom = this._map.getZoom(),
      bounds = new L.Bounds(
        L.point([-r, -r]),
        size.add([r, r])
      ),
      i, len, p, cell, x, y, j, len2, k;

    // console.time('process');
    for (i = 0, len = this._latlngs.length; i < len; i++) {
      p = this._map.latLngToContainerPoint(this._latlngs[i]);
      if (bounds.contains(p)) {
        data.push(p)
      }
    }

    // draw circle
    var ctx = this._canvas.getContext("2d");

    // draw with point
    var draw = this.options.draw;
    data.forEach(function (p) {
      draw(ctx, p, {zoom:zoom});
    });
  },

  _animateZoom: function (e) {
    var scale = this._map.getZoomScale(e.zoom),
      offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

    if (L.DomUtil.setTransform) {
      L.DomUtil.setTransform(this._canvas, offset, scale);

    } else {
      this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
    }
  }
});

L.renderLayer = function (latlngs, options) {
  return new L.RenderLayer(latlngs, options);
};