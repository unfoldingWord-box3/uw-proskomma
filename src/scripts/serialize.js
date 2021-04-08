const {getDocuments} = require('../utils/download');
const {UWProskomma} = require('../../index');

const pk = new UWProskomma();
getDocuments(pk, null, true, true).then();