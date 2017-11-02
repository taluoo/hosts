const request = require('request');
const iconv = require('iconv-lite');

// request 默认选项
let defaultOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:54.0) Gecko/20100101 Firefox/54.0'
    }
};


/**
 * 请求 URL，获取响应
 * @param targetUrl
 * @param options
 * @param pageEncoding
 * @return {Promise}
 */
function simpleGet(targetUrl, options, pageEncoding = 'utf8') {
    options = options ? Object.assign(defaultOptions, options) : defaultOptions;
    return new Promise(function (resolve, reject) {
        request.get(targetUrl, options)
            .on('response', function (response) {
                // console.log('on response: ', response.statusCode, response.statusMessage);
                // todo 响应 非 200 的情况
                let bufArray = [];
                let bytesLen = 0;
                response.on('data', (chunk) => {
                    bufArray.push(chunk);
                    bytesLen += chunk.length;
                });

                response.on('end', () => {
                    let buffers = Buffer.concat(bufArray, bytesLen);
                    // console.log('页面编码：', pageEncoding);
                    let pageText = pageEncoding === 'utf8' ? buffers.toString() : iconv.decode(buffers, pageEncoding);
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        headers: response.headers, // 注意：此处并非 rawheader https://nodejs.org/api/http.html#http_message_headers
                        body: pageText
                    });
                });
            })
            .on('error', function (err) {
                console.log('simpleGet ' + targetUrl + ' on error');
                reject(err)
            });
    })
}

module.exports = simpleGet;