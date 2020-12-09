const deepcopy = require('deepcopy');

const slimTokens = (tokens, sourceOrGl) => {
    const ret = [];
    const occurrences = {};
    if (!tokens) {
        return null;
    }
    for (const token of tokens) {
        const t2 = deepcopy(token);
        const occurrenceScopes = t2.scopes.filter(s => s.startsWith("attribute/milestone/zaln/x-occurrence"));
        const xContentScopes = t2.scopes.filter(s => s.startsWith("attribute/milestone/zaln/x-content"));
        if (xContentScopes.length > 0) {
            t2.blContent = xContentScopes[0].split("/")[5];
        } else {
            t2.blContent = t2.chars;
        }
        t2.chars = t2.chars.replace(/[ \t\r\n]+/g, " ");
        const occurrenceField = "blContent";
        if (sourceOrGl === "gl" && occurrenceScopes.length > 0) {
            t2.occurrence = parseInt(occurrenceScopes[0].split("/")[5]);
        } else if (sourceOrGl === "source" && occurrenceField in t2) {
            if (!(t2[occurrenceField] in occurrences)) {
                occurrences[t2[occurrenceField]] = 1;
            } else {
                occurrences[t2[occurrenceField]]++;
            }
            t2.occurrence = occurrences[t2[occurrenceField]];
        }
        delete t2.scopes;
        ret.push(t2);
    }
    return ret;
}

const pruneTokens = tokens => {

    const pruneStart = ts => {
        if (ts.length === 0 || ts[0][1]) {
            return ts;
        } else {
            return pruneStart(ts.slice(1));
        }
    }

    const pruneEnd = ts => {
        if (ts.length === 0 || ts[ts.length - 1][1]) {
            return ts;
        } else {
            return pruneEnd(ts.slice(0, ts.length - 1));
        }
    }

    return pruneEnd(pruneStart(tokens));

}

module.exports = {slimTokens, pruneTokens};
