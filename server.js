var http = require('http'),
    Jimp = require("jimp"),
    urllib = require('url'),
    cluster = require('cluster');

var settings = {
    PORT: process.env.PORT || 3000
};

if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    console.info('Spawning %d workers', cpuCount);

    for (var i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    function getWorkerCount(){
        var count = 0;
        for (const id in cluster.workers) {
            count++;
        }
        return count;
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {
        // Replace the dead worker, we're not sentimental
        console.info('Worker %d died :(, Creating a new one to replace it.', worker.id);
        if (getWorkerCount() < cpuCount) {
            cluster.fork();
        }

    });

} else {
    http.createServer(function(req, res) {
        var reqUrl = urllib.parse(req.url, true);

        if (reqUrl.pathname === '/convert' && req.method.toLowerCase() === 'get') {
            var url = reqUrl.query.url;
            var export_type = reqUrl.query.export_type || Jimp.MIME_JPEG;
            var r_width = reqUrl.query.r_width;
            var r_height = reqUrl.query.r_height || Jimp.AUTO;
            var c_width = reqUrl.query.c_width;
            var c_height = reqUrl.query.c_height || c_width;
            var background = reqUrl.query.background;

            var ip = req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;

            console.log('Processing image for %s on worker %d', ip, cluster.worker.id);

            if (url && url.length > 0) {
                Jimp.read(url, function(err, image) {
                    if (err) {
                        return respondWithError(res, 400, err.message);
                    }

                    if (r_width) {
                        image.resize(parseInt(r_width), parseInt(r_height));
                    }

                    if (c_width) {
                        image.contain(parseInt(c_width), parseInt(c_height));
                    }

                    if (background) {
                        if (background.startsWith('#')) {
                            background = background.replace('#', '0x');
                        }

                        if (!background.startsWith('0x')) {
                            background = '0x' + background;
                        }

                        while (background.length < 10) {
                            background = background + 'F';
                        }

                        image.background(parseInt(background));
                    }

                    // Check export MIME type
                    if (export_type != Jimp.MIME_JPEG && export_type != Jimp.MIME_PNG && export_type != Jimp.MIME_BMP) {
                        export_type = export_type.toString().toLowerCase().trim();
                        switch (export_type) {
                            case 'png':
                            case 'image/png':
                                export_type = Jimp.MIME_PNG;
                                break;
                            case 'jpg':
                            case 'jpeg':
                            case 'image/jpg':
                            case 'image/jpeg':
                                export_type = Jimp.MIME_JPEG;
                                break;
                            case 'bmp':
                            case 'image/bmp':
                                export_type = Jimp.MIME_BMP;
                                break;
                            default:
                                return respondWithError(res, 400, 'Mime type ' + export_type + ' not supported.');
                        }
                    }

                    image.getBuffer(export_type, function(err, result) {
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
        console.log('Node Imager server is running on port %d with worker id: %d', settings.PORT, cluster.worker.id);
    });

    function respondWithError(res, status, message) {
        res.writeHead(status, { 'content-type': 'text/plain' });
        res.end(message + '\n');
    }

    function respondWithResult(res, result, mime_type) {
        res.writeHead(200, { 'content-type': mime_type });
        res.end(result);
    }
}
