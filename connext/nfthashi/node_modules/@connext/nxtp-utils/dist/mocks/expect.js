"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = void 0;
const chai_1 = __importDefault(require("chai"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const chai_subset_1 = __importDefault(require("chai-subset"));
const sinon_chai_1 = __importDefault(require("sinon-chai"));
let chaiPlugin = chai_1.default.use(chai_subset_1.default);
chaiPlugin = chaiPlugin.use(chai_as_promised_1.default);
chaiPlugin = chaiPlugin.use(sinon_chai_1.default);
exports.expect = chaiPlugin.expect;
//# sourceMappingURL=expect.js.map