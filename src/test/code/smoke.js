const test = require('tape');
const fse = require('fs-extra');
const path = require('path');

const {UWProsKomma} = require('../../index')

const testGroup = "Smoke";

const pkWithDoc = () => {
    const pk = new UWProsKomma();
    const content = fse.readFileSync(path.resolve(__dirname, "../test_data/usfm/ust_psa_1.usfm")).toString();
    pk.importDocument(
        {"org": "unfoldingWord", "lang": "en", "abbr": "ust"},
        "usfm",
        content
    );
    return pk;
}

const itemFragment = '{ ... on Token { subType chars } ... on Scope { itemType label } ... on Graft { subType sequenceId } }';

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
    `Version info (${testGroup})`,
    async function (t) {
        try {
            t.plan(2);
            const pk = new UWProsKomma();
            const query = '{ processor packageVersion }';
            const result = await pk.gqlQuery(query);
            t.equal(result.errors, undefined);
            t.equal(result.data.processor, "ProsKomma JS for Unfolding Word");
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
            const pk = pkWithDoc();
            const query = '{docSets { selectors { key value } selectorString } }';
            const result = await pk.gqlQuery(query);
            t.equal(result.errors, undefined);
            const docSet = result.data.docSets[0];
            t.equal(docSet.selectors.length, 3);
            t.equal(docSet.selectorString, "unfoldingWord/en_ust");
        } catch (err) {
            console.log(err)
        }
    }
);

test(
    `s5 heading to ts milestone (${testGroup})`,
    async function (t) {
        try {
            t.plan(4);
            const pk = pkWithDoc();
            const query = `{documents { mainSequence { blocks { is { label } bg { subType } } } } }`;
            const result = await pk.gqlQuery(query);
            t.equal(result.errors, undefined);
            const blocks = result.data.documents[0].mainSequence.blocks;
            t.equal(blocks.map(b => b.is).map(is => is.map(s => s.label)).filter(l => l.includes("milestone/ts")).length, 3);
            t.equal(blocks.map(b => b.bg).map(bg => bg.map(g => g.subType)).filter(s => s.includes("title")).length, 1);
            t.equal(blocks.map(b => b.bg).map(bg => bg.map(g => g.subType)).filter(s => s.includes("heading")).length, 0);
        } catch (err) {
            console.log(err)
        }
    }
);
