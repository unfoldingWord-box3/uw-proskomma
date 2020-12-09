const fse = require('fs-extra');

const tsvRowToObject = entry => {
    const [n, row] = entry;
    return {
        n: n,
        book: row[0],
        chapter: row[1],
        verse: row[2],
        id: row[3],
        supportReference: row[4],
        origQuote: row[5],
        occurrence: row[6],
        glQuote: row[7],
        occurrenceNote: row[8]
    }
}

const readTsv = path => {
    const tsvEntries = fse.readFileSync(path)
        .toString()
        .split("\n")
        .map(r => r.split("\t"))
        .entries();
    return [...tsvEntries]
        .map(r => tsvRowToObject(r))
        .filter(r => r.origQuote && parseInt(r.chapter) > 0);
}

module.exports = {readTsv};
