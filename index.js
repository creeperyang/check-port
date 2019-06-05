const { exec } = require('child_process');

function getPort(address) {
    if (!address) return '';
    const port = /:(\d+)$/.exec(address);
    return port ? port[1] : '';
}

function filterWithPort(info, port, local, exact) {
    if (!info || !info.localAddress) return false;
    const portToCompare = local ? info.localPort : info.remotePort;
    return exact ? portToCompare === port
        : portToCompare.includes(port);
}

/**
 * Parse cli message to prot info.
 * @param {string} line the input string to parse
 * @returns {Object} the parsed port info
 */
function parseCliMessage(line) {
    if (!line) return;
    const parts = line.trim().split(/\s+/);
    if (parts.length === 4) {
        // Miss state
        parts.splice(3, 0, '');
    }
    return {
        protocal: parts[0] || '',
        localAddress: parts[1] || '',
        localPort: getPort(parts[1]),
        remoteAddress: parts[2] || '',
        remotePort: getPort(parts[2]),
        state: parts[3] || '',
        pid: parts[4] || '',
    };
}

/**
 * Get matched list (pid/localAddress/port) of port
 * @param {string} port port
 * @param {boolean} local local address
 * @param {boolean} exact match port exactly
 * @returns {Promise<Array>} matched list
 */
function getPortUsageInfo(port = '80', local = true, exact = false) {
    return new Promise((resolve, reject) => {
        exec(`netstat -ano | findstr "${port}"`, (err, stdout, stderr) => {
            if (err) {
                return stderr ? reject(err) : resolve([]);
            }
            resolve(
                String(stdout)
                    .split(/\r?\n/)
                    .filter(v => !!v)
                    .map(parseCliMessage)
                    .filter(v => filterWithPort(v, port, local, exact))
            );
        });
    });
}

/**
 * Get process name with pid
 * @param {string} pid pid
 * @returns {Promise<Object>} the process info (pid, name)
 */
function getProcessName(pid) {
    return new Promise((resolve, reject) => {
        exec(`tasklist -fi "PID eq ${pid}"`, (err, stdout, stderr) => {
                if (err) return reject(err);
                const result = String(stdout).trim()
                    .split(/\r?\n/).slice(2)[0].split(/\s/);
                resolve({
                    pid,
                    name: result[0] || '---',
                    // memory: result.slice(-2).join('')
                });
            }
        );
    });
}

/**
 * Kill process correspond to pid
 * @param {string} pid pid
 * @returns {Promise} the result
 */
function killProcess(pid) {
    return new Promise((resolve, reject) => {
        exec(`taskkill -F -PID "${pid}"`, (err, stdout) => {
            err ? reject(err) : resolve(stdout);
        });
    });
}

module.exports = {
    getPortUsageInfo,
    getProcessName,
    killProcess
};
