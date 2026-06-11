module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/style.css");
    eleventyConfig.addPassthroughCopy("src/script.js");
    eleventyConfig.addPassthroughCopy("src/images");
    eleventyConfig.addPassthroughCopy("src/admin");

    return {
        dir: {
            input: "src",
            output: "_site"
        }
    };
};