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
    console.log("Downloading USFM");
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
                        console.log(`    ${book}`)
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
        pk.importDocuments(selectors, "usfm", content, {});
        const query = `{ documents { header(id:"id") } }`;
        const result = await pk.gqlQuery(query);
        console.log(`      Downloaded`)
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

getDocuments(pk)
    .then(pk => {
        const tsvEntries = fse.readFileSync(tsvPath)
            .toString()
            .split("\n")
            .map(r => r.split("\t"))
            .entries();
        const tsvObjects = [...tsvEntries].map(r => tsvRowToObject(r))
            .filter(r => r.book);
        console.log(tsvObjects);
    }
)