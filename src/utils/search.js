const xre = require('xregexp');

const {pruneTokens, slimTokens} = require('../utils/tokens');

const searchWordRecords = origString => {
    const ret = [];
    for (let searchExpr of origString.split(" ")) {
        searchExpr = xre.replace(searchExpr, `[,’?;.!\\p{Z}\\p{C}\\p{P}]`, "", "all");
        if (searchExpr.includes("…")) {
            const searchExprParts = searchExpr.split("…");
            ret.push([searchExprParts[0], false]);
            searchExprParts.slice(1).forEach(p => ret.push([p, true]));
        } else {
            ret.push([searchExpr, false]);
        }
    }
    return ret;
}

const contentForSearchWords = (searchTuples, tokens) => {

    const lfsw1 = (searchTuples, tokens, content) => {
        if (!content) {
            content = [];
        }
        if (searchTuples.length === 0) { // Everything matched
            return content;
        } else if (tokens.length === 0) { // No more tokens - fail
            return null;
        } else if (tokens[0].chars === searchTuples[0][0]) { // First word matched, try next one
            return lfsw1(searchTuples.slice(1), tokens.slice(1), content.concat([[tokens[0].blContent, tokens[0].occurrence]]));
        } else if (searchTuples[0][1]) { // non-greedy wildcard, try again on next token
            return lfsw1(searchTuples, tokens.slice(1), content.concat([[tokens[0].blContent, tokens[0].occurrence]]));
        } else { // No wildcard and no match - fail
            return null;
        }
    }

    if (tokens.length === 0) {
        return null;
    }
    return lfsw1(searchTuples, tokens) || contentForSearchWords(searchTuples, tokens.slice(1));
}

const highlightedAlignedGlText = (glTokens, content) => {
    return glTokens.map(token => {
            const matchingContent = content.filter(c => token.occurrence && c[0] === token.blContent && c[1] === token.occurrence);
            return [token.chars, (matchingContent.length > 0)];
        }
    )
};

const gl4source = (book, cv, sourceTokens, glTokens, searchString, prune) => {
    const searchTuples = searchWordRecords(searchString);
    const ugntTokens = slimTokens(sourceTokens.filter(t => t.subType === "wordLike"), "source");
    const content = contentForSearchWords(searchTuples, ugntTokens);
    if (!content) {
        return {
            "error":
                `NO MATCH IN SOURCE\nSearch Tuples: ${JSON.stringify(searchTuples)}`
        }
    }
    const highlightedTokens = highlightedAlignedGlText(slimTokens(glTokens, "gl"), content);
    if (prune) {
        return {"data": pruneTokens(highlightedTokens)};
    } else {
        return {"data": highlightedTokens};
    }
}

module.exports = {gl4source};
