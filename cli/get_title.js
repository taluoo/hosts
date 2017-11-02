/**
 * 获取页面标题
 * 如果直接使用 request 等类库，需要自己处理各种页面编码，先从响应头或页面源码中获取编码方式，例如：
 * text/html;charset=GBK
 * <meta charset="gb2312">
 * <meta http-equiv="Content-Type" content="text/html; charset=gb2312" />
 *
 * 逻辑会比较复杂。所以直接使用浏览器。
 */
const puppeteer = require('puppeteer');

const Database = require('../lib/database');
const cli = require('../lib/simple_cli');
// const DB = require('../lib/db');
// const targetSchema = require('../database/schemas/target');


/**
 * 初始化浏览器
 * @return {Promise.<void>}
 */
async function initBrowser() {
    let browserOptions = {
        headless: false,
        ignoreHTTPSErrors: true
    };
    browser = await puppeteer.launch(browserOptions);
}

/**
 * 根据条件查找待处理的文档
 * @param conditions
 * @return {Promise.<void>}
 */
async function processing(conditions) {
    let cursor = HostModel.find(conditions).cursor();
    cursor.eachAsync(function (hostDoc) {
        return getAndSaveTitle(hostDoc);
    }, {parallel: 10}, async () => {
        console.log('处理结束，准备退出');
        await exit();
    });
}

async function getAndSaveTitle(hostDoc) {
    let page, title;
    try {
        page = await browser.newPage();
        await page.goto('http://' + hostDoc.host);
        title = await page.title();
    } catch (err) {
        console.log(`page goto ${hostDoc.host} throw err ${err}`);
    } finally {
        page.close();
        hostDoc.set({'title': title});
        hostDoc.save().then(function () {
            console.log(`${hostDoc.host} ${title} 保存成功`);
        })
    }
}

// 清理并退出
async function exit() {
    db.connection.close();
    await browser.close();
    process.exit(0);
}

let db, browser, HostModel;

(async () => {
    try {
        db = new Database();
        await db.init();
        HostModel = db.HostModel;
    } catch (err) {
        throw err;
    }

    let conditions = {
        all: {},
        blank: {'title': ''},
        filled: {'title': {'$ne': ''}}
    };
    let total = await HostModel.count({}).exec();
    let filled = await HostModel.count(conditions.filled);
    let blank = await HostModel.count(conditions.blank);

    console.log(`共有记录 ${total} 条，其中 title 不为空的记录有 ${filled} 条，title 为空的记录有 ${blank} 条`);

    cli.question(`请选择要更新的类型：${Object.keys(conditions).join('/')} \n\r> `, async (answer) => {
        answer = answer.trim();
        if (Object.keys(conditions).indexOf(answer) > -1) {
            await initBrowser();
            processing(conditions[answer]);
        } else {
            console.log('请输入正确的类型');
            db.connection.close();
            process.exit(1);
        }
    });
    cli.on('close', async () => {
        console.log('Have a great day!');
        await exit();
    });
})();
