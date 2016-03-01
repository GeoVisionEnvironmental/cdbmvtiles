cdbmvtiles
==============================

This is a fork of the original cdbtiles, with added ability to import Mapbox Vector Tiles to CouchDB database.

cdbmvtiles is a [tilelive.js](https://github.com/mapbox/tilelive.js) backend (source/sink) plug-in for [CouchDB](https://couchdb.apache.org/)

Q: What does that mean?

A: With this installed, you can use CouchDB to read/write map image tiles from other tilelive.js sources/sinks (mbtiles [raster & Mapbox Vector Tile spec], Mapnik, TileJSON, S3, etc.).  AKA - You can use CouchDB to serve maps over HTTP.

Q: Why would one want to do that?

A: Our primary purpose is to support PouchDB storage of vector tiles for off-line back-country access to map data inside a Cordova app.  Vector tiles are stored in a CouchDB database, which PouchDB then syncs with.

Q: Where do the map tiles come from?

A: Places to start:

+ [OpenStreetMap](http://www.openstreetmap.org)
+ [Mapbox Studio](https://www.mapbox.com/mapbox-studio/)

#### Installation

NOTE:  Currently does not work!  Do not install yet.

You need [node.js](http://nodejs.org/).  Then:

    cd /usr/local/src
    git clone https://github.com/GeoVisionEnvironmental/cdbmvtiles.git
    cd cdbmvtiles
    npm install -g 

#### Usage

This works with (and depends upon) tilelive.js and CouchDB.

Example: You have map tiles rendered with Mapbox Studio sitting in a .mbtiles SQLite DB file, and using something like [TileStream](https://github.com/mapbox/tilestream) to serve tiles alongside an application server isn't doing it for you. And you also happen to have a CouchDB server running locally.

You should be able to easily copy all of your data from the .mbtiles file to your local CouchDB (and then replicate it on from there) by setting up these other things:

     npm install tilelive
     npm install mbtiles

And then:

     ./node_modules/tilelive/bin/tilelive-copy -s pyramid --minzoom=10 --maxzoom=18  "mbtiles:///Users/user/maps/Columbus.mbtiles" "cdbmvtiles://127.0.0.1:5984/columbus_tiles/"

The `copy` command above is a sample application provided by tilelive.js, and it has a bunch more options that you should check out. Tilelive is actually an API that any other app can use, so cdbtiles should enable CouchDB to play nicely with apps and other data sources/sinks that also support tilelive. The source and sink URIs have custom protocols (mbtiles: and cdbtiles:) that tilelive knows what to do with via the backend plugins you've now installed.

Important limitation: Currently cdbmvtiles automatically clears (as in destroys and rebuilds) the destination database. So you can't use this to copy multiple different tilesets into the same DB, or update just part of a tileset. It is not recommended to keep any other JSON documents in the same DB as your map tiles! You have been warned.

Now, if you point a [Openlayers](http://openlayers.org, [Mapbox GL](http://mapbox.com) or [Leaflet](http://leafletjs.com/) enabled app/web page to `http://127.0.0.1:5984/columbus_tiles/tile_{z}_{x}_{y}/tile` you'll be serving up map tiles from CouchDB.  Put that webpage in your CouchDB, and you now have a self-contained map/application server running on CouchDB.

This also lets you serve up the [TileJSON](https://github.com/mapbox/tilejson-spec) information for your maps, just use: `http://127.0.0.1:5984/columbus_tiles/tilejson`


