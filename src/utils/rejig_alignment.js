const xre = require('xregexp');

const rejigAlignment =
    str =>
        xre.replace(
            str,
            / x-occurrence="(\d+)" x-occurrences="(\d+)" x-content="([^"]+)"/g,
            ' x-align="$3:$1:$2"',
        );

module.exports = { rejigAlignment };