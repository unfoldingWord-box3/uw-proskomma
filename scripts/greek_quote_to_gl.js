const Axios = require("axios");
const YAML = require('js-yaml-parser');
const fse = require('fs-extra');

const {UWProsKomma} = require('../index');

// ARGS: tsv,
const pk = new UWProsKomma();

const args = process.argv.slice(2);
const tsvPath = args[0];
const book = tsvPath.split(".")[0].split("-")[1];

const getDocuments = async pk => {
    const baseURLs = [
        // ["rus", "ru_gl", "https://git.door43.org/ru_gl/ru_rlob/raw/branch/master"],
        ["unfoldingWord", "grc", "ugnt", "https://git.door43.org/unfoldingWord/el-x-koine_ugnt/raw/branch/master"],
        ["unfoldingWord", "en", "ust", "https://git.door43.org/unfoldingWord/en_ust/raw/branch/master"],
        ["unfoldingWord", "en", "ult", "https://git.door43.org/unfoldingWord/en_ult/raw/branch/master"]
    ];
    console.log("Download USFM");
    for (const [org, lang, abbr, baseURL] of baseURLs) {
        const selectors = {
            org,
            lang,
            abbr
        };
        console.log(`  ${org}/${lang}/${abbr}`)
        const content = [];
        await Axios.request(
            {method: "get", "url": `${baseURL}/manifest.yaml`}
        )
            .then(
                async response => {
                    const manifest = YAML.safeLoad(response.data);
                    const bookPaths = manifest.projects.map(e => e.path.split("/")[1]);
                    for (const bookPath of bookPaths) {
                        const pathBook = bookPath.split(".")[0].split('-')[1];
                        if (pathBook !== book) {
                            continue;
                        }
                        console.log(`    ${pathBook}`)
                        try {
                            await Axios.request(
                                {method: "get", "url": `${baseURL}/${bookPath}`}
                            )
                                .then(response => {
                                    content.push(response.data);
                                })
                        } catch (err) {
                            console.log(`Could not load ${bookPath} for ${lang}/${abbr}`);
                        }
                    }
                }
            );
        console.log(`      Downloaded`)
        pk.importDocuments(selectors, "usfm", content, {});
        console.log(`      Imported`);
    }
    return pk;
}

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
    console.log("Read TSV");
    const tsvEntries = fse.readFileSync(tsvPath)
        .toString()
        .split("\n")
        .map(r => r.split("\t"))
        .entries();
    const tsvObjects = [...tsvEntries]
        .map(r => tsvRowToObject(r))
        .filter(r => r.origQuote && parseInt(r.chapter) > 0);
    return tsvObjects;
}

const searchWordRecords = origString => {
    const ret = [];
    for (const searchExpr of origString.split(" ")) {
        if (searchExpr.includes("…")) {
            const textBefore = searchExpr.split("…")[0];
            const textAfter = searchExpr.split("…").reverse()[0];
            ret.push([textBefore, false]);
            ret.push([textAfter, true]);
        } else {
            ret.push([searchExpr, false]);
        }
    }
    return ret;
}

const doQuery = async (book, cv) => {
    const query = ('{' +
        'docSets {' +
        '  abbr: selector(id:"abbr")' +
        '  documents {' +
        '    mainSequence {' +
        '      blocks (withScriptureCV: "%cv%") {' +
        '        tokens(' +
        '          includeContext:true' +
        '          withScriptureCV: "%cv%"' +
        '        ) {' +
        '          subType' +
        '          chars' +
        '          position' +
        '          scopes(startsWith:["attribute/milestone/zaln/x-lemma", "attribute/spanWithAtts/w/lemma", ])' +
        '        }' +
        '      }' +
        '    }' +
        '  }' +
        '}' +
        '}').replace(/%book%/g, book)
        .replace(/%cv%/g, cv);
    return await pk.gqlQuery(query);
}

const translationTokens = docSets => {
    const ret = {};
    for (const docSet of docSets) {
        const blockTokens = [];
        for (const block of docSet.documents[0].mainSequence.blocks) {
            block.tokens
                .filter(t => t.subType === "wordLike")
                .map(t => {
                    t.lemma = t.scopes.map(s => s.split("/")[5]);
                    delete t.scopes;
                    delete t.subType;
                    blockTokens.push(t);
                })
        }
        ret[docSet.abbr] = blockTokens;
    }
    return ret;
}

const lemmaForSearchWords = (searchTuples, tokens) => {

    const lfsw1 = (searchTuples, tokens, lemma) => {
        if (!lemma) {
            lemma = [];
        }
        if (searchTuples.length === 0) { // Everything matched
            return lemma;
        } else if (tokens[0].chars === searchTuples[0][0]) { // First word matched, try next one
            return lfsw1(searchTuples.slice(1), tokens.slice(1), lemma.concat(tokens[0].lemma));
        } else if (searchTuples[0][1]) { // non-greedy wildcard, try again on next token
            return lfsw1(searchTuples, tokens.slice(1), lemma.concat(tokens[0].lemma));
        } else { // No wildcard and no match - fail
            return null;
        }
    }

    if (tokens.length === 0) {
        return null;
    }
    return lfsw1(searchTuples, tokens) || lemmaForSearchWords(searchTuples, tokens.slice(1));
}

const glTextForLemma = (tokens, lemmaTuples) => {

    const gltfl1 = (tokens, lemmaTuples, glWords) => {
        if (!glWords) {
            glWords = [];
        }
        if (lemmaTuples.filter(lt => !lt[1]).length === 0) { // Every lemma matched once - success!
            return glWords;
        } else if (tokens.length === 0) { // End of tokens and unmatched lemma - fail!
            return null;
        } else if (!tokens[0].lemma) { // No lemmas for first token - try next token
            return gltfl1(tokens.slice(1), lemmaTuples, glWords.concat([tokens[0].chars]));
        } else { // Try to match lemmaTuples to lemma for first Token
            let matched = false;
            for (const tokenLemma of tokens[0].lemma) {
                for (const lemmaTuple of lemmaTuples) {
                    if (tokenLemma === lemmaTuple[0]) {
                        lemmaTuple[1] = true;
                        matched = true;
                    }
                }
            }
            if (matched) { // Matched token and updated at least one lemma flag - next token please!
                return gltfl1(tokens.slice(1), lemmaTuples, glWords.concat([tokens[0].chars]));
            } else { // No match - fail
                return null;
            }
        }

    }

    if (tokens.length === 0) {
        return null;
    }
    return gltfl1(tokens, lemmaTuples) || glTextForLemma(tokens.slice(1), lemmaTuples);
}

getDocuments(pk)
    .then(async () => {
            console.log("Process TSV");
            const startTime = Date.now();
            let nRecords = 0;
            for (const tsvRecord of readTsv(tsvPath)) {
                nRecords++;
                const cv = `${tsvRecord.chapter}:${tsvRecord.verse}`;
                console.log(`  ${tsvRecord.book} ${cv}`);
                const searchTuples = searchWordRecords(tsvRecord.origQuote);
                // console.log("    Do Query");
                const result = await doQuery(tsvRecord.book, cv);
                if (result.errors) {
                    throw new Error(result.errors);
                }
                // console.log("    Process Query Results")
                const tokens = translationTokens(result.data.docSets);
                // console.log("    Lemma from search words")
                const lemma = lemmaForSearchWords(searchTuples, tokens.ugnt);
                console.log(`    Quote to match: "${tsvRecord.origQuote}"`);
                if (!lemma) {
                    console.log(`    NO LEMMA MATCHED`);
                    continue;
                }
                console.log(`    Lemma for match: ${lemma.join(" ")}`);
                for (const gl of ["ult", "ust"]) {
                    const glText = glTextForLemma(tokens[gl], lemma.map(l => [l, false]));
                    console.log(`    ${gl}: "${glText.join(" ")}"`);
                }
                console.log();
            }
            console.log(`${nRecords} queries in ${Date.now() - startTime} msec`);
        }
    )