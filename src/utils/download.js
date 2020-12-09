const Axios = require("axios");
const YAML = require('js-yaml-parser');

const getDocuments = async (pk, book) => {
    const baseURLs = [
        ["unfoldingWord", "hbo", "uhb", "https://git.door43.org/unfoldingWord/hbo_uhb/raw/branch/master"],
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
                                    if (response.status !== 200) {
                                        throw new Error("Bad download status");
                                    }
                                    content.push(response.data);
                                })
                        } catch (err) {
                            console.log(`Could not load ${bookPath} for ${lang}/${abbr}`);
                        }
                    }
                }
            );
        if (content.length === 0) {
            console.log(`      Book ${book} not found`);
            continue;
        }
        console.log(`      Downloaded`)
        const startTime = Date.now();
        pk.importDocuments(selectors, "usfm", content, {});
        console.log(`      Imported in ${Date.now() - startTime} msec`);
    }
    return pk;
}

module.exports = {getDocuments};
