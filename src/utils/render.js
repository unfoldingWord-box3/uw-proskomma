const highlightedAsString = highlighted =>
    highlighted
        .map(tp => tp[1] ? tp[0].toUpperCase() : tp[0])
        .join("")
        .trim();

module.exports = {highlightedAsString};
