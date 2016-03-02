
/*
#
# Copyright (C) 2013 by Vaughn Iverson
# Copyright (C) 2016 by GeoVision Environmental Informatics
#
# cdbmvtiles
#
# With this you can use a CouchDB as a "tilelive.js" source or sink for
# map tile / grid / tilejson data.
#
# See: https://github.com/mapbox/tilelive.js
#
# License:
#
# This project is free software released under the MIT/X11 license:
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
*/


(function() {
  var Tilecouch, fs, get_mime_type, grid_name, nano, path, protocol, tile_name, tilejson_name, tilelive, url; // tilelive-vector,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  path = require('path');
  fs = require('fs');
  url = require('url');
  tilelive = require('tilelive');
  nano = require('nano');
  
  protocol = 'cdbtiles';
  
  // added components to provide Mapbox Vector Tiles usage
  
  //protocol = 'cdbmvtiles';
  //tilelive-vector = require('tilelive-vector');

  tile_name = function(z, x, y) {
    if ((x != null) && (y != null) && (z != null)) {
      return {
        path: "tile_" + z + "_" + x + "_" + y,
        name: 'tile'
      };
    } else {
      return {
        path: 'tile_{z}_{x}_{y}',
        name: 'tile'
      };
    }
  };

  grid_name = function(z, x, y) {
    if ((x != null) && (y != null) && (z != null)) {
      return {
        path: "grid_" + z + "_" + x + "_" + y,
        name: 'grid'
      };
    } else {
      return {
        path: 'grid_{z}_{x}_{y}',
        name: 'grid'
      };
    }
  };

  tilejson_name = "tilejson";

  get_mime_type = function(bytes) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
      return 'image/png';
    } else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9) {
      return 'image/jpeg';
    } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && (bytes[4] === 0x39 || bytes[4] === 0x37) && bytes[5] === 0x61) {
      return 'image/gif';
    } else {
      console.warn("" + protocol + ": Image data with unknown MIME type in putTile call to get_mime_type.");
      return 'application/octet-stream';
    }
  };

  Tilecouch = (function() {
    Tilecouch.registerProtocols = function(tilelive) {
      return tilelive.protocols["" + protocol + ":"] = this;
    };

    Tilecouch.list = function(filepath, callback) {
      return callback(new Error(".list not implemented for " + protocol));
    };

    Tilecouch.findID = function(filepath, id, callback) {
      return callback(new Error(".findID not implemented for " + protocol));
    };

    function Tilecouch(uri, callback) {
      var tile_url, tilepath_match;
      this.starts = 0;
      tile_url = url.parse(uri);
      if (tile_url.protocol !== ("" + protocol + ":")) {
        return callback(new Error("Bad uri protocol '" + tile_url.protocol + "'.  Must be " + protocol + "."));
      }
      tilepath_match = tile_url.pathname.match(new RegExp("(/[^/]+/)(" + tilejson_name + ")?"));
      if (!tilepath_match) {
        return callback(new Error("Bad tile url path '" + tile_url.pathname + "' for " + protocol + "."));
      }
      tile_url.path = '';
      tile_url.pathname = '';
      tile_url.query = '';
      tile_url.search = '';
      tile_url.hash = '';
      tile_url.protocol = 'http:';
      this.server = url.format(tile_url);
      this.db = new nano(this.server);
      tile_url.path = tilepath_match[1].toLowerCase();
      tile_url.pathname = tile_url.path;
      this.db_name = tile_url.path.slice(1, -1);
      this.source = url.format(tile_url);
      this.couchdb = this.db.use(this.db_name);
      callback(null, this);
    }

    Tilecouch.prototype.close = function(callback) {
      return callback(null);
    };

    Tilecouch.prototype.getInfo = function(callback) {
      var _this = this;
      return this.couchdb.get(tilejson_name, {}, function(err, info) {
        if (err) {
          return callback(err);
        }
        delete info._id;
        delete info._rev;
        return callback(null, info);
      });
    };

    Tilecouch.prototype.getTile = function(z, x, y, callback, timeout) {
      var tn,
        _this = this;
      if (timeout == null) {
        timeout = 500;
      }
      tn = tile_name(z, x, y);
      return this.couchdb.attachment.get(tn.path, tn.name, {}, function(err, data) {
        if (err) {
          if (err.status_code === 404) {
            return callback(new Error('Tile does not exist'));
          } else if (timeout <= 32000) {
            return setTimeout(_this.getTile.bind(_this), timeout, z, x, y, callback, timeout * 2);
          } else {
            return callback(err);
          }
        } else {
          return callback(null, data);
        }
      });
    };

    Tilecouch.prototype.getGrid = function(z, x, y, callback, timeout) {
      var gn,
        _this = this;
      if (timeout == null) {
        timeout = 500;
      }
      gn = grid_name(z, x, y);
      return this.couchdb.attachment.get(gn.path, gn.name, {}, function(err, data) {
        if (err) {
          if (err.status_code === 404) {
            return callback(new Error('Grid does not exist'));
          } else if (timeout <= 32000) {
            return setTimeout(_this.getGrid.bind(_this), timeout, z, x, y, callback, timeout * 2);
          } else {
            return callback(err);
          }
        } else {
          return callback(null, data);
        }
      });
    };

    Tilecouch.prototype.startWriting = function(callback) {
      var _this = this;
      this.starts += 1;
      if (this.starts !== 1) {
        return callback(null);
      } else {
        return this.db.db.list(function(err, dbs) {
          var _ref;
          if (err) {
            return callback(err);
          }
          if (_ref = _this.db_name, __indexOf.call(dbs, _ref) < 0) {
            return _this.db.db.create(_this.db_name, function(err) {
              if (err) {
                return callback(err);
              }
              _this.couchdb = _this.db.use(_this.db_name);
              return callback(null);
            });
          } else {
            return _this.db.db.destroy(_this.db_name, function(err) {
              if (err) {
                return callback(err);
              }
              return _this.db.db.create(_this.db_name, function(err) {
                if (err) {
                  return callback(err);
                }
                _this.couchdb = _this.db.use(_this.db_name);
                return callback(null);
              });
            });
          }
        });
      }
    };

    Tilecouch.prototype.stopWriting = function(callback) {
      this.starts -= 1;
      return callback(null);
    };

    Tilecouch.prototype.putInfo = function(info, callback) {
      var gn, tn;
      if (!this.starts) {
        return callback(new Error("Error, writing not started."));
      }
      tn = tile_name();
      info.tiles = ["" + this.source + tn.path + "/" + tn.name];
      if (info.grids != null) {
        gn = grid_name();
        info.grids = ["" + this.source + gn.path + "/" + gn.name];
      }
      return this.couchdb.insert(info, tilejson_name, callback);
    };

    Tilecouch.prototype.putTile = function(z, x, y, tile, callback, timeout) {
      var tn, type,
        _this = this;
      if (timeout == null) {
        timeout = 500;
      }
      if (!this.starts) {
        return callback(new Error("Error, writing not started."));
      }
      tn = tile_name(z, x, y);
      type = get_mime_type(tile);
      return this.couchdb.attachment.insert(tn.path, tn.name, tile, type, {}, function(err) {
        if (err && timeout <= 32000) {
          return setTimeout(_this.putTile.bind(_this), timeout, z, x, y, tile, callback, timeout * 2);
        } else {
          return callback(err);
        }
      });
    };

    Tilecouch.prototype.putGrid = function(z, x, y, grid, callback, timeout) {
      var gn,
        _this = this;
      if (timeout == null) {
        timeout = 500;
      }
      if (!this.starts) {
        return callback(new Error("Error, writing not started."));
      }
      gn = grid_name(z, x, y);
      return this.couchdb.attachment.insert(gn.path, gn.name, grid, 'application/json', {}, function(err) {
        if (err && timeout <= 32000) {
          return setTimeout(_this.putGrid.bind(_this), timeout, z, x, y, grid, callback, timeout * 2);
        } else {
          return callback(err);
        }
      });
    };

    return Tilecouch;

  })();

  module.exports = Tilecouch;

}).call(this);
