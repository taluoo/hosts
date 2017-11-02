/**
 * 使用示例：node cli/get_crossdomainxml.js
 * 根据提示选择更新类型
 */

const parseString = require('xml2js').parseString;

const Database = require('../lib/database');
const cli = require('../lib/simple_cli');
const simpleGet = require('../lib/simple_get');

/**
 * 根据条件查找待处理的文档
 * @param conditions
 * @return {Promise.<void>}
 */
async function processing(conditions) {
    let cursor = HostModel.find(conditions).cursor();
    cursor.eachAsync(function (hostDoc) {
        getCrossdomainXML(hostDoc);
    });
}

/**
 * 获取并保存 crossdomain.xml
 * @param hostDoc
 * @return {Promise.<void>}
 */
async function getCrossdomainXML(hostDoc) {
    let url = 'http://' + hostDoc.host + '/crossdomain.xml';
    let res;
    try {
        res = await simpleGet(url);
    } catch (err) {
        console.log(`获取 ${url} 出错，${err}`);
        return
    }
    let statusCode = res.statusCode;
    console.log(`${url} ${statusCode}`);

    if (statusCode >= 200 && statusCode <= 299) {
        if (res.headers['content-type'].indexOf('xml') > -1) {
            let xml = res.body;
            parseString(xml, function (err, result) {
                if (err) {
                    console.log(`解析 XML ${url} 出错，${err}`);
                    return
                }
                result = transform(result);
                // console.log(JSON.stringify(result, null, 2));
                hostDoc.set({crossDomainXML: xml, crossDomainPolicy: result});
                hostDoc.save()
            });
        }
    }
}

// {
//     "cross-domain-policy": {
//     "site-control": [
//         {
//             "$": {
//                 "permitted-cross-domain-policies": "all"
//             }
//         }
//     ],
//         "allow-access-from": [
//         {
//             "$": {
//                 "domain": "*.qq.com"
//             }
//         }
//     ],
//         "allow-http-request-headers-from": [
//         {
//             "$": {
//                 "domain": "*",
//                 "headers": "*"
//             }
//         }
//     ]
// }
// }
// 把形如上面的对象，转换成所需的，去掉不必要的的嵌套
function transform(xmlObj) {
    let result = {
        'permitted-cross-domain-policies': 'master-only',
        'allow-access-from': [],
        'allow-http-request-headers-from': []
    };
    xmlObj = xmlObj['cross-domain-policy'];
    let siteControl = xmlObj['site-control'];
    let allowAccessFrom = xmlObj['allow-access-from'];
    let allowHeaders = xmlObj['allow-http-request-headers-from'];
    if (Array.isArray(siteControl)) {
        result['permitted-cross-domain-policies'] = siteControl[siteControl.length - 1]['$']['permitted-cross-domain-policies'];
    }
    if (Array.isArray(allowAccessFrom)) {
        result['allow-access-from'] = allowAccessFrom.map(function (item) {
            return item['$']
        })
    }
    if (Array.isArray(allowHeaders)) {
        result['allow-http-request-headers-from'] = allowHeaders.map(function (item) {
            return item['$']
        })
    }
    return result;
}

let db;
let HostModel;

(async () => {
    try {
        db = new Database();
        await db.init();
        HostModel = db.HostModel;
    } catch (err) {
        throw err;
    }

    // 几种情况：所有、有的、没有的
    let conditions = {
        all: {},
        blank: {'crossDomainXML': {'$exists': false}},
        filled: {'crossDomainXML': {'$exists': true}}
    };
    let total = await HostModel.count({}).exec();
    let filled = await HostModel.count(conditions.filled);
    let blank = await HostModel.count(conditions.blank);

    console.log(`共有记录 ${total} 条，包含 crossdomain.xml 的记录有 ${filled} 条，不含 crossdomain.xml 的记录有 ${blank} 条`);

    cli.question(`请选择要更新的类型：${Object.keys(conditions).join('/')} \n\r> `, async (answer) => {
        answer = answer.trim();
        if (Object.keys(conditions).indexOf(answer) > -1) {
            processing(conditions[answer]);
        } else {
            console.log('请输入正确的类型');
            process.exit(1);
        }
    });
    cli.on('close', () => {
        console.log('Have a great day!');
        db.connection.close();
        process.exit(0);
    });
})();


