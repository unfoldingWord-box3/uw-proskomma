const doAlignmentQuery = async pk => {
    const query = ('{' +
        'docSets {' +
        '  abbr: selector(id:"abbr")' +
        '  documents {' +
        '    book: header(id:"bookCode")' +
        '    mainSequence {' +
        '      itemGroups (' +
        '        byScopes:["chapter/", "verses/"]' +
        '        includeContext:true' +
        '      ) {' +
        '        scopeLabels' +
        '        tokens {' +
        '          subType' +
        '          chars' +
        '          position' +
        '          scopes(startsWith:["attribute/milestone/zaln/x-content", "attribute/milestone/zaln/x-occurrence"])' +
        '        }' +
        '      }' +
        '    }' +
        '  }' +
        '}' +
        '}');
    const result = await pk.gqlQuery(query);
    if (result.errors) {
        throw new Error(result.errors);
    }
    const ret = {};
    for (const docSet of result.data.docSets) {
        ret[docSet.abbr] = {};
        for (const document of docSet.documents) {
            ret[docSet.abbr][document.book] = {};
            for (const itemGroup of document.mainSequence.itemGroups) {
                const chapter = itemGroup.scopeLabels.filter(s => s.startsWith("chapter/"))[0].split("/")[1];
                for (const verse of itemGroup.scopeLabels.filter(s => s.startsWith("verses/"))[0].split("/")[1].split("-")) {
                    const cv = `${chapter}:${verse}`;
                    ret[docSet.abbr][document.book][cv] = itemGroup.tokens;
                }
            }
        }
    }
    return ret;
}

module.exports = {doAlignmentQuery};
