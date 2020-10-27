const test = require('tape');
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