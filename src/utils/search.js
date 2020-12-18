const xre = require('xregexp');

const {pruneTokens, slimSourceTokens, slimGLTokens} = require('../utils/tokens');

const searchWordRecords = origString => {
    const ret = [];
    for (let searchExpr of xre.split(origString, /[\s־]/)) {
        searchExpr = xre.replace(searchExpr,/[,’?;.!׃]/, "");
        if (searchExpr.includes("…")) {
            const searchExprParts = searchExpr.split("…");
            ret.push([searchExprParts[0], false]);
            searchExprParts.slice(1).forEach(p => ret.push([p, true]));
        } else {
            ret.push([searchExpr, false]);
        }
    }
    return ret.filter(t => t[0] !== "׀");
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
            return lfsw1(searchTuples.slice(1), tokens.slice(1), content.concat([[tokens[0].chars, tokens[0].occurrence]]));
        } else if (searchTuples[0][1]) { // non-greedy wildcard, try again on next token
            return lfsw1(searchTuples, tokens.slice(1), content.concat([[tokens[0].chars, tokens[0].occurrence]]));
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
            const matchingContent = content.filter(c => (token.occurrence.length > 0) && token.blContent.includes(c[0]) && token.occurrence.includes(c[1]));
            return [token.chars, (matchingContent.length > 0)];
        }
    )
};

const gl4Source = (book, cv, sourceTokens, glTokens, searchString, prune) => {
    const searchTuples = searchWordRecords(searchString);
    const ugntTokens = slimSourceTokens(sourceTokens.filter(t => t.subType === "wordLike"));
    const content = contentForSearchWords(searchTuples, ugntTokens);
    if (!content) {
        return {
            "error":
                `NO MATCH IN SOURCE\nSearch Tuples: ${JSON.stringify(searchTuples)}\nCodepoints: ${searchTuples.map(s => "|" + Array.from(s[0]).map(c => c.charCodeAt(0).toString(16)))}`
        }
    }
    const highlightedTokens = highlightedAlignedGlText(slimGLTokens(glTokens), content);
    if (prune) {
        return {"data": pruneTokens(highlightedTokens)};
    } else {
        return {"data": highlightedTokens};
    }
}

module.exports = {searchWordRecords, contentForSearchWords, gl4Source};
