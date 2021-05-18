const fse = require('fs-extra');
const { rejigAlignment } = require('../utils/rejig_alignment');

const inputUSFM = fse.readFileSync(process.argv[2]).toString();
console.log(rejigAlignment(inputUSFM));
