const {UWProskomma} = require('./src');
const {readTsv} = require('./src/utils/tsv');
const {getDocuments} = require('./src/utils/download');
const {doAlignmentQuery} = require('./src/utils/query');
const {gl4Source} = require('./src/utils/search');
const {highlightedAsString} = require('./src/utils/render');

module.exports = {
    UWProskomma,
    readTsv,
    getDocuments,
    doAlignmentQuery,
    gl4Source,
    highlightedAsString
}