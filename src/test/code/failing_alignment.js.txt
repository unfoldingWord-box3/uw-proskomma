const test = require('tape');
const fse = require('fs-extra');
const path = require('path');

const {tsvAlignment} = require("../lib/alignment");
const {getPkWithDownloads} = require("../lib/download");

const pkWithRUTDownloads = getPkWithDownloads("RUT");

const testGroup = "Smoke";

test(
    `Failing Hebrew alignment (${testGroup})`,
    async function (t) {
        try {
            t.plan(2);
            const highlighted = await tsvAlignment(await pkWithRUTDownloads,"failing_rut", "RUT", "ult");
            t.equal(highlighted.error, undefined);
            t.equal(
                highlighted.data.filter(h => h[1] && h[0] !== " ").map(h => h[0]).join(" "),
                "foo"
            );
        } catch (err) {
            console.log(err)
        }
    }
);
