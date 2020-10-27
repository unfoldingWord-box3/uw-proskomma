const test = require('tape');
const fse = require('fs-extra');
const path = require('path');

const {UWProsKomma} = require('../../index')

const testGroup = "Smoke";

test(
    `Instantiate (${testGroup})`,
    async function (t) {
        try {
            t.plan(1);
            t.doesNotThrow(() => new UWProsKomma());
        } catch (err) {
            console.log(err)
        }
    }
);

test(
    `Root Selector Query (${testGroup})`,
    async function (t) {
        try {
            t.plan(1);
            const pk = new UWProsKomma();
            const query = '{selectors { name type regex } }';
            const result = await pk.gqlQuery(query);
            t.equal(result.errors, undefined);
        } catch (err) {
            console.log(err)
        }
    }
);

test(
    `DocSet Selector Query (${testGroup})`,
    async function (t) {
        try {
            t.plan(3);
            const pk = new UWProsKomma();
            const content = fse.readFileSync(path.resolve(__dirname, "../test_data/usfm/ust_psa_1.usfm"));
            pk.importDocument(
                {"org": "unfoldingWord", "lang": "eng", "abbr": "ust"},
                "usfm",
                content
            );
            const query = '{docSets { selectors { key value } selectorString } }';
            const result = await pk.gqlQuery(query);
            t.equal(result.errors, undefined);
            const docSet = result.data.docSets[0];
            t.equal(docSet.selectors.length, 3);
            t.equal(docSet.selectorString, "unfoldingWord/eng_ust");
        } catch (err) {
            console.log(err)
        }
    }
);

