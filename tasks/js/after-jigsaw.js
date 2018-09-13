let fs = require('fs');
let glob = require('glob-all');
let inlineCSS = require('juice');
let cheerio = require('cheerio');
let isURL = require('is-url');
let cleanCSS = require('email-remove-unused-css');
let pretty = require('pretty');
let minify = require('html-minifier').minify;
let sixHex = require('color-shorthand-hex-to-six-digit');
let altText = require('html-img-alt');

module.exports.processEmails = (config, build_path, env) => {

  let minifyOpts = config.transformers.minify;
  let cleanupOpts = config.transformers.cleanup;
  let files = glob.sync([build_path+'/**/*.html']);
  let extraCss = fs.readFileSync('source/css/extra.css', 'utf8');

  files.map((file) => {

    let html = fs.readFileSync(file, 'utf8');

    if (config.transformers.inlineCSS.enabled) {
      html = inlineCSS(html, {removeStyleTags: config.transformers.inlineCSS.removeStyleTags || false});
    }

    if (cleanupOpts.removeUnusedCss.enabled) {
      html = cleanCSS(html, { whitelist: cleanupOpts.whitelist || [] }).result;
    }

    let $ = cheerio.load(html, {decodeEntities: false});

    let style = $('style').first();
    style.html(extraCss + style.text());

    if (cleanupOpts.preferAttributeWidth) {
      Object.entries(cleanupOpts.preferAttributeWidth).map(([k, v]) => {
        if (v) {
          $(k).each((i, el) => { $(el).css('width', '') });
        }
      });
    }

    if (cleanupOpts.preferBgColorAttribute) {
      $('[bgcolor]').each((i, elem) => {
        $(elem).css('background-color', '');
      });
    }

    html = $.html();

    let baseImageURL = config.transformers.baseImageURL;
    if (isURL(baseImageURL)) {
      html = html.replace(/src=("|')([^http]*?)("|')/gim, 'src="' + baseImageURL + '/$2"')
                  .replace(/url\(("|')?([^http]*?)("|')?\)/gim, "url('" + baseImageURL + "/$2')");
    }

    if (config.transformers.prettify) {
      html = pretty(html, {ocd: true, indent_inner_html: false});
    }

    html = minify(html, {
      html5: false,
      keepClosingSlash: true,
      removeEmptyAttributes: true,
      includeAutoGeneratedTags: false,
      minifyCSS: minifyOpts.minifyCSS,
      maxLineLength: minifyOpts.maxLineLength,
      collapseWhitespace: minifyOpts.collapseWhitespace,
      preserveLineBreaks: minifyOpts.preserveLineBreaks,
      conservativeCollapse: minifyOpts.conservativeCollapse,
      processConditionalComments: minifyOpts.processConditionalComments
    });

    if (config.transformers.sixHex) {
      html = sixHex(html);
    }

    if (config.transformers.altText) {
      html = altText(html);
    }

    fs.writeFileSync(file, html);
  });
}
