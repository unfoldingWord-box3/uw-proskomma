const path = require('path');
const fse = require('fs-extra');
const {UWProskomma} = require('../../index');

if (process.argv.length !== 6) {
    console.log(`ERROR: Expected 4 arguments, found ${process.argv.length - 2}`);
    console.log(`USAGE: node serialize_dirs.js <inputDir> <org> <lang> <abbr>`);
    process.exit(1);
}

const pk = new UWProskomma();
const inputDir = process.argv[2];
const org = process.argv[3];
const lang = process.argv[4];
const abbr = process.argv[5];

let ptBooks = [ // 66 books for now
    "GEN",
    "EXO",
    "LEV",
    "NUM",
    "DEU",
    "JOS",
    "JDG",
    "RUT",
    "1SA",
    "2SA",
    "1KI",
    "2KI",
    "1CH",
    "2CH",
    "EZR",
    "NEH",
    "EST",
    "JOB",
    "PSA",
    "PRO",
    "ECC",
    "SNG",
    "ISA",
    "JER",
    "LAM",
    "EZK",
    "DAN",
    "HOS",
    "JOL",
    "AMO",
    "OBA",
    "JON",
    "MIC",
    "NAM",
    "HAB",
    "ZEP",
    "HAG",
    "ZEC",
    "MAL",
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV",
/*
    "TOB",
    "JDT",
    "ESG",
    "WIS",
    "SIR",
    "BAR",
    "LJE",
    "S3Y",
    "SUS",
    "BEL",
    "1MA",
    "2MA",
    "3MA",
    "4MA",
    "1ES",
    "2ES",
    "MAN",
    "PS2",
    "ODA",
    "PSS",
    "JSA",
    "JDB",
    "TBS",
    "SST",
    "DNT",
    "BLT",
    "EZA",
    "5EZ",
    "6EZ",
    "DAG",
    "PS3",
    "2BA",
    "LBA",
    "JUB",
    "ENO",
    "1MQ",
    "2MQ",
    "3MQ",
    "REP",
    "4BA",
    "LAO"
*/
];

const dirFiles = fse.readdirSync(path.resolve(__dirname, inputDir));
let content = [];
for (const book of ptBooks) {
    let found = false;
    for (const file of dirFiles) {
        if (file.toUpperCase().includes(book)) {
            content.push(file);
            found = true;
            break;
        }
    }
}
content = content.map(
    c => [
        fse.readFileSync(path.join(__dirname, inputDir, c)).toString(),
        c.split('.')[1]
    ]
);
pk.importDocuments(
    {org, lang, abbr},
    content[0][1],
    content.map(c => c[0]),
    {}
    );
const outDir = path.resolve(__dirname, '..', '..', 'serialized');
fse.mkdirs(outDir);
fse.writeFileSync(
    path.join(
        outDir,
        [org, lang, abbr].join('_') + "_pkserialized.json",
    ),
    JSON.stringify(pk.serializeSuccinct(`${org}/${lang}_${abbr}`))
);
