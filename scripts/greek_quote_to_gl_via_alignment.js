const Axios = require("axios");
const YAML = require('js-yaml-parser');
const fse = require('fs-extra');
const deepcopy = require('deepcopy');

const {UWProsKomma} = require('../index');

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
        const startTime = Date.now();
        pk.importDocuments(selectors, "usfm", content, {});
        console.log(`      Imported in ${Date.now() - startTime} msec`);
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
    for (let searchExpr of origString.split(" ")) {
        searchExpr = searchExpr.replace(/[,’?;.!]/g, "");
        if (searchExpr.includes("…")) {
            const searchExprParts = searchExpr.split("…");
            ret.push([searchExprParts[0], false]);
            searchExprParts.slice(1).forEach(p => ret.push([p, true]));
        } else {
            ret.push([searchExpr, false]);
        }
    }
    return ret;
}

const doQuery = async () => {
    const query = ('{' +
        'docSets {' +
        '  abbr: selector(id:"abbr")' +
        '  documents {' +
        '    book: header(id:"bookCode")' +
        '    mainSequence {' +
        '      itemGroups (' +
        '        byScopes:["chapter/", "verses/"]' +
        '        includeContext:true' +
        '      ) {' +
        '        scopeLabels' +
        '        tokens {' +
        '          subType' +
        '          chars' +
        '          position' +
        '          scopes(startsWith:["attribute/milestone/zaln/x-content", "attribute/milestone/zaln/x-occurrence"])' +
        '        }' +
        '      }' +
        '    }' +
        '  }' +
        '}' +
        '}');
    let startTime = Date.now();
    const result = await pk.gqlQuery(query);
    console.log(`GraphQL query in ${Date.now() - startTime} msec`);
    if (result.errors) {
        throw new Error(result.errors);
    }
    startTime = Date.now();
    const ret = {};
    for (const docSet of result.data.docSets) {
        ret[docSet.abbr] = {};
        for (const document of docSet.documents) {
            ret[docSet.abbr][document.book] = {};
            for (const itemGroup of document.mainSequence.itemGroups) {
                const chapter = itemGroup.scopeLabels.filter(s => s.startsWith("chapter/"))[0].split("/")[1];
                for (const verse of itemGroup.scopeLabels.filter(s => s.startsWith("verses/"))[0].split("/")[1].split("-")) {
                    const cv = `${chapter}:${verse}`;
                    ret[docSet.abbr][document.book][cv] = itemGroup.tokens;
                }
            }
        }
    }
    console.log(`Postprocess Query Result in ${Date.now() - startTime} msec`);
    return ret;
}

const slimTokens = (tokens, sourceOrGl) => {
    const ret = [];
    const occurrences = {};
    if (!tokens) {
        return null;
    }
    for (const token of tokens) {
        const t2 = deepcopy(token);
        const occurrenceScopes = t2.scopes.filter(s => s.startsWith("attribute/milestone/zaln/x-occurrence"));
        const xContentScopes = t2.scopes.filter(s => s.startsWith("attribute/milestone/zaln/x-content"));
        if (xContentScopes.length > 0) {
            t2.blContent = xContentScopes[0].split("/")[5];
        } else {
            t2.blContent = t2.chars;
        }
        t2.chars = t2.chars.replace(/[ \t\r\n]+/g, " ");
        const occurrenceField = "blContent";
        if (sourceOrGl === "gl" && occurrenceScopes.length > 0) {
            t2.occurrence = parseInt(occurrenceScopes[0].split("/")[5]);
        } else if (sourceOrGl === "source" && occurrenceField in t2) {
            if (!(t2[occurrenceField] in occurrences)) {
                occurrences[t2[occurrenceField]] = 1;
            } else {
                occurrences[t2[occurrenceField]]++;
            }
            t2.occurrence = occurrences[t2[occurrenceField]];
        }
        delete t2.scopes;
        ret.push(t2);
    }
    return ret;
}

const contentForSearchWords = (searchTuples, tokens) => {

    const lfsw1 = (searchTuples, tokens, content) => {
        if (!content) {
            content = [];
        }
        if (searchTuples.length === 0) { // Everything matched
            return content;
        } else if (tokens.length === 0) { // No more tokens - fail
            return null;
        } else if (tokens[0].chars === searchTuples[0][0]) { // First word matched, try next one
            return lfsw1(searchTuples.slice(1), tokens.slice(1), content.concat([[tokens[0].blContent, tokens[0].occurrence]]));
        } else if (searchTuples[0][1]) { // non-greedy wildcard, try again on next token
            return lfsw1(searchTuples, tokens.slice(1), content.concat([[tokens[0].blContent, tokens[0].occurrence]]));
        } else { // No wildcard and no match - fail
            return null;
        }
    }

    if (tokens.length === 0) {
        return null;
    }
    return lfsw1(searchTuples, tokens) || contentForSearchWords(searchTuples, tokens.slice(1));
}

const highlightedAlignedGlText = (glTokens, content) => {
    return glTokens.map(token => {
            const matchingContent = content.filter(c => token.occurrence && c[0] === token.blContent && c[1] === token.occurrence);
            return [token.chars, (matchingContent.length > 0)];
        }
    )
};

// MAIN
const pk = new UWProsKomma();
const args = process.argv.slice(2);
const tsvPath = args[0];
const book = tsvPath.split(".")[0].split("-")[1];

getDocuments(pk)
    .then(async () => {
            const startTime = Date.now();
            const tokenLookup = await doQuery(book);
            console.log("Iterate over TSV records");
            let nRecords = 0;
            const issues = {
                ugnt: 0,
                ult: 0,
                ust: 0
            }
            for (const tsvRecord of readTsv(tsvPath)) {
                nRecords++;
                const cv = `${tsvRecord.chapter}:${tsvRecord.verse}`;
                console.log(`  ${tsvRecord.book} ${cv}`);
                console.log(`    Search string: ${tsvRecord.origQuote}`);
                const searchTuples = searchWordRecords(tsvRecord.origQuote);
                const ugntTokens = slimTokens(tokenLookup.ugnt[book][cv].filter(t => t.subType === "wordLike"), "source");
                const content = contentForSearchWords(searchTuples, ugntTokens);
                if (!content) {
                    console.log(`    NO MATCH IN SOURCE`);
                    console.log(`      Search Tuples: ${JSON.stringify(searchTuples)}`)
                    console.log(`      Verse content: ${ugntTokens.map(t => `<${t.blContent} ${t.occurrence}`)}`);
                    issues.ugnt++;
                    continue;
                }
                console.log(`    Source content for match: ${content.map(c => `<${c[0]} ${c[1]}>`).join(" ")}`);
                for (const gl of ["ult", "ust"]) {
                    const glTokens = slimTokens(tokenLookup[gl][book][cv], "gl");
                    if (!glTokens) {
                        console.log(`    NO TOKENS for ${gl}`);
                        issues[gl]++;
                        continue;
                    }
                    const glText = highlightedAlignedGlText(glTokens, content);
                    console.log(`    ${gl}: "${glText.map(tp => tp[1] ? tp[0].toUpperCase() : tp[0]).join("").trim()}"`);
                }
                console.log();
            }
            console.log(`${nRecords} rows processed in ${Date.now() - startTime} msec`);
            console.log(`Issues: ${JSON.stringify(issues)}`);
        }
    )