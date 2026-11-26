// The version of Galley this server runs, from its package.json: the MCP server reports it, book_guide names the
// method by it, and the pick-up compares it with the checkout a repository's script runs from.
import pkg from '../../package.json';

export const GALLEY_VERSION: string = pkg.version;
