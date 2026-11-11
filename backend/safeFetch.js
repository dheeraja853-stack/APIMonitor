
const dns = require('node:dns');
const ipaddr = require('ipaddr.js');
const { Agent, fetch } = require('undici');

function isPublicIP(address) {
    try {
        return ipaddr.parse(address).range() === 'unicast';
    } catch {
        return false;
    }
}

async function isPublicUrl(url) {
    try {
        const parsedUrl = new URL(url);

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }

        if (parsedUrl.username || parsedUrl.password) {
            return false;
        }

        const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');

        let addresses;

        if (ipaddr.isValid(hostname)) {
            addresses = [{ address: hostname }];
        } else {
            addresses = await dns.promises.lookup(hostname, {
                all: true,
                verbatim: true
            });
        }

        return addresses.length > 0 &&
            addresses.every(({ address }) => isPublicIP(address));

    } catch {
        return false;
    }
}

async function fetchPublicUrl(url, options = {}) {
    const parsedUrl = new URL(url);

    if (
        !['http:', 'https:'].includes(parsedUrl.protocol) ||
        parsedUrl.username ||
        parsedUrl.password
    ) {
        throw new Error('URL is not allowed');
    }

    const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');

    if (ipaddr.isValid(hostname) && !isPublicIP(hostname)) {
        throw new Error('Private or internal IP addresses are not allowed');
    }

    const dispatcher = new Agent({
        connect: {
            lookup(host, lookupOptions, callback) {
                dns.lookup(host, {
                    all: true,
                    verbatim: true
                }, (error, addresses) => {
                    if (error) {
                        return callback(error);
                    }

                    if (
                        !addresses.length ||
                        !addresses.every(({ address }) => isPublicIP(address))
                    ) {
                        return callback(
                            new Error('Private or internal IP addresses are not allowed')
                        );
                    }

                    let allowedAddresses = addresses;

                    if (lookupOptions.family) {
                        allowedAddresses = addresses.filter(
                            item => item.family === lookupOptions.family
                        );
                    }

                    if (!allowedAddresses.length) {
                        return callback(new Error('No allowed IP address found'));
                    }

                    if (lookupOptions.all) {
                        callback(null, allowedAddresses);
                    } else {
                        callback(
                            null,
                            allowedAddresses[0].address,
                            allowedAddresses[0].family
                        );
                    }
                });
            }
        }
    });

    try {
        const response = await fetch(parsedUrl.toString(), {
    ...options,
    dispatcher,
    redirect: 'manual'
});

return {
    response,
    close: () => dispatcher.close()
};
    } catch (error) {
        await dispatcher.close();
        throw error;
    }
}

module.exports = {
    isPublicUrl,
    fetchPublicUrl
};
