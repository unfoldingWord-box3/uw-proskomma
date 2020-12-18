const {readTsv} = require('../utils/tsv');
const {getDocuments} = require('../utils/download');
const {doAlignmentQuery} = require('../utils/query');
const {searchWordRecords, contentForSearchWords} = require('../utils/search');
const {slimSourceTokens} = require('../utils/tokens');
const {UWProskomma} = require('../../index');

const pk = new UWProskomma();
const args = process.argv.slice(2);
const tsvPath = args[0];
const book = tsvPath.split("/").reverse()[0].split(".")[0].split("-")[1];

getDocuments(pk, book, false)
    .then(
        async () => {
            const tokenLookup = await doAlignmentQuery(pk);
            // Iterate over TSV records
            console.log("noteID\tbook\tchapter\tverse\tsupportReference\tquote\tannotation\tsourceWord\tsourceWordOccurrence");
            for (const tsvRecord of readTsv(tsvPath)) {
                const cv = `${tsvRecord.chapter}:${tsvRecord.verse}`;
                const source = tokenLookup.uhb || tokenLookup.ugnt;
                const sourceTokens = source[book][cv];
                const searchTuples = searchWordRecords(tsvRecord.origQuote);
                const searchMatchTokens = slimSourceTokens(sourceTokens.filter(t => t.subType === "wordLike"));
                const content = contentForSearchWords(searchTuples, searchMatchTokens);
                const rowStart = `${tsvRecord.id}\t${tsvRecord.book}\t${tsvRecord.chapter}\t${tsvRecord.verse}\t${tsvRecord.supportReference}\t${tsvRecord.origQuote}\t${tsvRecord.occurrenceNote}`;
                for (const [chars, occ] of content) {
                    console.log(`${rowStart}\t${chars}\t${occ}`);
                }
            }
        }
    )