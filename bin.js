#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const { getPortUsageInfo, getProcessName, killProcess } = require('./index');
const pkg = require('./package.json');

const MSGS = isCNLanguage() ? {
        warnNoPort: '请指定端口',
        warnNoMatch: '指定端口无进程监听',
        missArgs: '缺少参数：',
        result: '端口匹配结果如下：',
        killProcess: '结束以下进程：',
        itemKill: '是否自动杀死对应进程',
        itemFuzzy: '是否模糊匹配端口',
    } : {
        warnNoPort: 'specify the port please',
        warnNoMatch: 'No process bound to the specified port(s)',
        missArgs: 'Miss arguments:',
        result: 'The search result is:',
        killProcess: 'Now will kill the corresponding process(es):',
        itemKill: 'whether to kill process',
        itemFuzzy: 'match the port fuzzily',
    };

const LOG_PREFIX = '\r\n\t';
const LOG_PREFIX2 = '\t';

function isCNLanguage() {
    const env = process.env;
    const lang = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
    if (lang) {
        return 'zh_CN.UTF-8' === lang;
    }
    if (typeof Intl === 'object' && Intl.Collator) {
        return Intl.Collator.supportedLocalesOf(['zh-CN']).length === 1;
    }
    return false;
}

program
    .version(pkg.version)
    .option('-k, --kill', MSGS.itemKill)
    .option('-f, --fuzzy', MSGS.itemFuzzy);

program.parse(process.argv);

const ports = program.args;

if (!ports.length) {
    console.log(
        LOG_PREFIX +
            chalk.grey(MSGS.missArgs) +
            ' ' +
            chalk.bold.bgRed(MSGS.warnNoPort)
    );
    return;
}

checkPort({ ports: ports, autoKill: program.kill, exact: !program.fuzzy });

function checkPort({ ports, local = true, exact = true, autoKill = false }) {
    return Promise.all(ports.map(port => getPortUsageInfo(port, local, exact)))
        .then(lists => {
            return lists.reduce((acc, cur) => acc.concat(cur), []).filter(v => {
                // Filter: 0  TIME_WAIT 127.0.0.1:3023 System
                return v.pid !== '0';
            });
        })
        .then(list => {
            if (!list || !list.length) {
                throw 'no-match';
            }
            return Promise.all(
                list.map(v => {
                    return v.pid
                        ? getProcessName(v.pid).then(({ name }) => {
                              v.name = name || '';
                              return v;
                          })
                        : v;
                })
            );
        })
        .then(list => {
            console.log(LOG_PREFIX + chalk.bgGreen.bold(MSGS.result));
            // PID: 10, State: 11+3, Address: 15+5+5, Name: 20
            const header =
                LOG_PREFIX2 +
                'PID'.padEnd(10) +
                'State'.padEnd(14) +
                'Address'.padEnd(25) +
                'Name'.padEnd(16);
            console.log(chalk.grey.bold.underline(header));

            const pids = {};
            list.forEach(v => {
                const str =
                    LOG_PREFIX2 +
                    v.pid.padEnd(10) +
                    v.state.padEnd(14) +
                    (local ? v.localAddress : v.remoteAddress).padEnd(25) +
                    v.name;
                pids[v.pid] = v.name;
                console.log(chalk.white(str));
            });

            return autoKill ? pids : {};
        })
        .then(list => {
            const pids = Object.keys(list);
            if (!pids.length) return;

            console.log(LOG_PREFIX + chalk.bgGreen.bold(MSGS.killProcess));
            pids.forEach(pid => {
                killProcess(pid).then(() => {
                    console.log(
                        LOG_PREFIX2 +
                            chalk.bold.white(pid.padEnd(10)) +
                            '\t' +
                            chalk.bold.green('√')
                    );
                });
            });
        })
        .catch(reason => {
            if (reason.toString() === 'no-match') {
                console.log(LOG_PREFIX + chalk.bold.green(MSGS.warnNoMatch));
            } else {
                console.log(formatErrorMsg(reason));
            }
        });
}

function formatErrorMsg(err) {
    if (err instanceof Error) {
        return (
            LOG_PREFIX2 +
            chalk.bold.bgRed(err.message) +
            LOG_PREFIX +
            chalk.red(err.stack)
        );
    }
    return LOG_PREFIX2 + chalk.bold.red(err.toString());
}
