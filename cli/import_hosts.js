/**
 * 使用示例：node util/import_hosts.js target/hosts.txt
 * 一行一行的读取 hosts.txt 并保存到数据库
 */

const readline = require('readline');
const fs = require('fs');

const DB = require('@taluoo/mongoose-helper');
const hostSchema = require('../database/schemas/host');

function importHosts(filePath) {
    let inputStream = fs.createReadStream(filePath);
    inputStream.on('error', function (error) {
        console.log(`打开 ${filePath} 文件出错`);
        console.log(error);
        process.exit(1);
    });
    const rl = readline.createInterface({
        input: inputStream
    });
    let lineCount = 0;
    rl.on('line', (host) => {
        host = host.trim();
        console.log(host);
        lineCount++;
        if (host.length > 0) {
            saveHost(host);
        }
    }).on('close', () => {
        console.log(`读取结束，共读取 ${lineCount} 行，准备结束...`);
        // process.exit(0); 这里不能退出，saveDomain 还没执行
    });
}

// 存到数据库
function saveHost(host) {
    HostModel.update({'host': host}, {'host': host}, {
        upsert: true,
        setDefaultsOnInsert: true
    }, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.upserted) {
                console.log('新建', host);
            } else {
                console.log('更新', host);
            }
        }
    })
}

let HostModel;


// 主函数
async function main() {
    let filePath = process.argv[2];
    if (!filePath) {
        // todo 给定目录，导入目录
        console.log('请指定要导入的文件路径，例如：node import_hosts.js hosts.txt');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.log(`${filePath} 文件不存在`);
        process.exit(1);
    }
    console.log(`开始导入 ${filePath}`);
    let dbUri = 'mongodb://localhost:27018/hosts';
    let connection = await DB.initConnection(dbUri);
    HostModel = connection.model('host', hostSchema);

    importHosts(filePath);
}

main();