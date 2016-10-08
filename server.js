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
        var r_width = reqUrl.query.r_width;
        var r_height = reqUrl.query.r_height || Jimp.AUTO;
        var c_width = reqUrl.query.c_width;
        var c_height = reqUrl.query.c_height || c_width;
        var background = reqUrl.query.background;


        if (url && url.length > 0) {
            Jimp.read(url, function(err, image) {
                if (err) {
                    return respondWithError(res, 400, err.message);
                }

                if (r_width) {
                    image.resize(r_width, r_height);
                }
                if (c_width) {
                    image.contain(c_width, c_height);
                }
                if (background) {
                    image.background(background);
                }

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
