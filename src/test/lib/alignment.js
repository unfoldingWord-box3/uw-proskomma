const path = require('path');

const {
    readTsv,
    doAlignmentQuery,
    gl4Source
} = require('../../../index')

const tsvAlignment = async (pk, tsvFilename, book, glt) => {
    const tokenLookup = await doAlignmentQuery(pk);
    const tsvPath = path.resolve(`${__dirname}/../test_data/translation_notes/extracts/${tsvFilename}.tsv`);
    let tsvRecord = readTsv(tsvPath)[0];
    const cv = `${tsvRecord.chapter}:${tsvRecord.verse}`;
    const sourceTokens = (tokenLookup.uhb || tokenLookup.ugnt)[book][cv];
    const glTokens = tokenLookup[glt][book][cv];
    return gl4Source(
        book,
        cv,
        sourceTokens,
        glTokens,
        tsvRecord.origQuote,
        true
    );
}

module.exports = {tsvAlignment};