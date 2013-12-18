/*globals require, process, console*/
// Note: Useful only for debug purposes when using desktop browsers.
// Chrome doesn't like making geopositioning available when accessing files via file:///
// so a small web server allows accessing browser features

"use strict";

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    port = process.argv[2] || 8888,
    webserver;

webserver = http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname,
      filename = path.join(process.cwd(), uri);
  
  path.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

	if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
});


webserver.on('error', function(error){
  if(error.toString().indexOf("EADDRINUSE") !== -1) {
    console.log("ERROR: Web Server not started -- address and port are already in use.");
  } else {
    throw error;
  }
});

try {
  webserver.listen(parseInt(port, 10));
} catch(errr) {
  console.log("what");
}

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");