const { ProsKomma } = require('proskomma');

class UWProsKomma extends ProsKomma {

    constructor() {
        super();
        this.selectors = [
            {
                name: "org",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "lang",
                type: "string",
                regex: "^[^\\s]+$"
            },
            {
                name: "abbr",
                type: "string",
                regex: "^[a-z0-9]+$"
            }
        ];
        this.validateSelectors();
        this.filters = {};
        this.customTags = {
            heading: [],
            paragraph: [],
            char: [],
            word: [],
            intro: [],
            introHeading: []
        }
        this.emptyBlocks = [];
    }

    selectorString(docSetSelectors) {
        return `${docSetSelectors.org}/${docSetSelectors.lang}_${docSetSelectors.abbr}`;
    }

    importDocuments(selectors, contentType, contentStrings, filterOptions, customTags, emptyBlocks, tags) {
        contentStrings = contentStrings.map(cs => cs.replace(/\\s5/g, "\\ts\\*"));
        return super.importDocuments(selectors, contentType, contentStrings, filterOptions, customTags, emptyBlocks, tags);
    }

}

module.exports = {UWProsKomma}