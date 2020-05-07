import AnsiUp from 'ansi_up';
import './ansi-colors.css';

const ansiUpInstance = new AnsiUp();
ansiUpInstance.use_classes = true;

/**
 * Function, that returns html (line content with ansi_up classes defined
 * in ansi-colors.css) and replaces tabs with non-breaking spaces.
 * @param {string} line_content Content of line.
 * @returns {string}
 */
function ansiToHTML(ansi) {
    return ansiUpInstance.ansi_to_html(ansi).replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

export { AnsiUp, ansiToHTML };
