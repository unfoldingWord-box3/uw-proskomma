const {readTsv} = require('../utils/tsv');
const {getDocuments} = require('../utils/download');
const {doAlignmentQuery} = require('../utils/query');
const {gl4Source} = require('../utils/search');
const {highlightedAsString} = require('../utils/render');
const {UWProskomma} = require('../../index');

const pk = new UWProskomma();
const args = process.argv.slice(2);
const tsvPath = args[0];
const prune = (args[1] === "prune") || false;
const book = tsvPath.split("/").reverse()[0].split(".")[0].split("-")[1];

getDocuments(pk, book, true)
    .then(async () => {
            // Query Proskomma which now contains the books
            // Returns the tokens for each verse, accessible by
            // [abbr][book][chapter:verse]
            const tokenLookup = await doAlignmentQuery(pk);
            // Iterate over TSV records
            let nRecords = 0;
            let counts = {pass:0, fail:0};
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
                    const highlighted = gl4Source(
                        book,
                        cv,
                        sourceTokens,
                        glTokens,
                        tsvRecord.origQuote,
                        prune
                    );
                    // Returned object has either "data" or "error"
                    if ("data" in highlighted) {
                        counts.pass++;
                        console.log(`    ${gl}: "${highlightedAsString(highlighted.data)}"`);
                    } else {
                        counts.fail++;
                        console.log(`    Error: ${highlighted.error}`);
                        console.log(`Verse tokens: ${JSON.stringify(sourceTokens.filter(t => t.subType === "wordLike").map(t => t.chars))}`);
                        console.log(`Verse codepoints: ${sourceTokens.filter(t => t.subType === "wordLike").map(t => t.chars).map(s => "|" + Array.from(s).map(c => c.charCodeAt(0).toString(16)))}`);
                    }
                }
            }
            console.log(counts);
        }
    )