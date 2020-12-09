const {readTsv} = require('../utils/tsv');
const {getDocuments} = require('../utils/download');
const {doQuery} = require('../utils/query');
const {gl4source} = require('../utils/search');
const {highlightedAsString} = require('../utils/render');
const {UWProsKomma} = require('../index');

const pk = new UWProsKomma();
const args = process.argv.slice(2);
const tsvPath = args[0];
const prune = (args[1] === "prune") || false;
const book = tsvPath.split(".")[0].split("-")[1];

getDocuments(pk, book)
    .then(async () => {
            // Query Proskomma which now contains the books
            // Returns the tokens for each verse, accessible by
            // [abbr][book][chapter:verse]
            const tokenLookup = await doQuery(pk);
            // Iterate over TSV records
            let nRecords = 0;
            for (const tsvRecord of readTsv(tsvPath)) {
                nRecords++;
                const cv = `${tsvRecord.chapter}:${tsvRecord.verse}`;
                console.log(`  ${tsvRecord.book} ${cv}`);
                console.log(`    Search string: ${tsvRecord.origQuote}`);
                // Iterate over GLs
                for (const gl of ["ult", "ust"]) {
                    // Pick the right source for the book (inelegant but works)
                    const source = tokenLookup.uhb || tokenLookup.ugnt;
                    // Get the tokens for BCV
                    const sourceTokens = source[book][cv];
                    const glTokens = tokenLookup[gl][book][cv];
                    // Do the alignment
                    const highlighted = gl4source(
                        book,
                        cv,
                        sourceTokens,
                        glTokens,
                        tsvRecord.origQuote,
                        prune
                    );
                    // Returned object has either "data" or "error"
                    if ("data" in highlighted) {
                        console.log(`    ${gl}: "${highlightedAsString(highlighted.data)}"`);
                    } else {
                        console.log(`    Error: ${highlighted.error}`)
                    }
                }
            }
        }
    )