const {
    UWProskomma,
    getDocuments,
} = require('../../../index')

const getPkWithDownloads = async (book) => {
    const pk = new UWProskomma();
    await getDocuments(pk, book);
    return pk;
}

module.exports = {getPkWithDownloads};