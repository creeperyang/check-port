const { getPortUsageInfo, getProcessName } = require('./index');

getPortUsageInfo('443', false, true)
    .then(list => {
        if (list.length > 0 && list[0].remotePort === '443') {
            process.stdout.write('getPortUsageInfo\t');
            process.stdout.write('\x1b[36m✓\x1b[0m\n');
        }
    })
    .catch(e => {
        process.stdout.write('getPortUsageInfo\t');
        process.stdout.write('\x1b[31m✖\x1b[0m\n');
        console.error(e);
        process.exit(1);
    });

getProcessName('0')
    .then(info => {
        if (info && info.name) {
            process.stdout.write('getProcessName\t');
            process.stdout.write('\x1b[36m✓\x1b[0m\n');
        }
    })
    .catch(e => {
        process.stdout.write('getProcessName\t');
        process.stdout.write('\x1b[31m✖\x1b[0m\n');
        console.error(e);
        process.exit(1);
    });
