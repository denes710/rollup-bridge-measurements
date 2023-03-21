"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = void 0;
/**
 * Helper to determine if the current environment is node or not
 *
 * @returns True if it is a node env, false otherwise
 */
const isNode = () => typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined";
exports.isNode = isNode;
//# sourceMappingURL=env.js.map