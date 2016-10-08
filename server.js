var http = require('http'),
    Jimp = require("jimp"),
    urllib = require('url');

var settings = {
    PORT: process.env.PORT || 3000
};

http.createServer(function(req, res) {
    var reqUrl = urllib.parse(req.url, true);

    if (reqUrl.pathname === '/png2jpg' && req.method.toLowerCase() === 'get') {
        var url = reqUrl.query.url;
        var export_type = reqUrl.query.export_type;


        if (url && url.length > 0) {
            Jimp.read(url, function(err, image) {
                if (err) {
                    return respondWithError(res, 400, err.message);
                }

                image.resize(300, Jimp.AUTO);
                image.contain(300, 300);

                //image.background( 0xFFFFFFFF );

                image.getBuffer(Jimp.MIME_JPEG, function(err, result) {
                    if (err) {
                        return respondWithError(res, 400, err.message);
                    }

                    return respondWithResult(res, result);
                });
            });
        } else {
            return respondWithError(res, 400, 'url is required');
        }
    } else {
        return respondWithError(res, 404, 'Nothing to do here');
    }
}).listen(settings.PORT, function() {
    console.log('LESS server is running on port', settings.PORT);
});

function respondWithError(res, status, message) {
    res.writeHead(status, { 'content-type': 'text/plain' });
    res.end(message + '\n');
}

function respondWithResult(res, result, mime_type) {
    res.writeHead(200, { 'content-type': mime_type });
    res.end(result);
}
