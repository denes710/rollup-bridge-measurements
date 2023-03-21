"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = exports.safeJsonStringify = void 0;
/**
 * Converts all undefined values within an object to null
 *
 * @param _key - Key of the object
 * @param value - Value to potentially be converted from undefined to null
 * @returns
 */
const nullify = (_key, value) => (typeof value === "undefined" ? null : value);
/**
 * Converts a JSON object to a string safely
 *
 * @param value - JSON to convert to a string
 * @returns string representation of the provied json
 */
const safeJsonStringify = (value) => {
    try {
        return typeof value === "string" ? value : JSON.stringify(value, nullify);
    }
    catch (e) {
        return value;
    }
};
exports.safeJsonStringify = safeJsonStringify;
/**
 * Parses a json string safely
 *
 * @param value - JSON string to parse
 * @returns a JSON
 */
function safeJsonParse(value) {
    try {
        return typeof value === "string" ? JSON.parse(value, nullify) : value;
    }
    catch (e) {
        return value;
    }
}
exports.safeJsonParse = safeJsonParse;
//# sourceMappingURL=json.js.map