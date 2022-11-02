"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDUrl = exports.generateGHIssueLink = exports.processSendData = exports.timePromise = exports.now = exports.perf = exports.processSend = exports.base64MimeType = exports.getDUrl = exports.isDataURL = exports.isBase64 = exports.camelize = exports.without = exports.getConfigFromProcessEnv = exports.smartUserAgent = exports.timeout = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const datauri_1 = __importDefault(require("datauri"));
const is_url_superb_1 = __importDefault(require("is-url-superb"));
const model_1 = require("../api/model");
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const perf_hooks_1 = require("perf_hooks");
//@ts-ignore
process.send = process.send || function () { };
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms, 'timeout'));
exports.timeout = timeout;
/**
 *  Use this to generate a more likely valid user agent. It makes sure it has the WA part and replaces any windows or linux os info with mac.
 * @param useragent Your custom user agent
 * @param v The WA version from the debug info. This is optional. default is 2.2117.5
 */
const smartUserAgent = (useragent, v = '2.2117.5') => {
    useragent = useragent.replace(useragent
        .match(/\(([^()]*)\)/g)
        .find((x) => x.toLowerCase().includes('linux') ||
        x.toLowerCase().includes('windows')), '(Macintosh; Intel Mac OS X 10_15_2)');
    if (!useragent.includes('WhatsApp'))
        return `WhatsApp/${v} ${useragent}`;
    return useragent.replace(useragent
        .match(/WhatsApp\/([.\d])*/g)[0]
        .match(/[.\d]*/g)
        .find((x) => x), v);
};
exports.smartUserAgent = smartUserAgent;
const getConfigFromProcessEnv = (json) => {
    const output = {};
    json.forEach(({ env, key }) => {
        if (process.env[env])
            output[key] = process.env[env];
        if (process.env[env] === 'true' || process.env[env] === 'false')
            output[key] = Boolean(process.env[env]);
    });
    return output;
};
exports.getConfigFromProcessEnv = getConfigFromProcessEnv;
/**
 * Remove the key from the object and return the rest of the object.
 * @param {JsonObject} obj - The object to be filtered.
 * @param {string} key - The key to discard.
 * @returns The object without the key.
 */
const without = (obj, key) => {
    const _a = obj, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _b = key, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    discard = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
    return rest;
};
exports.without = without;
const camelize = (str) => {
    const arr = str.split('-');
    const capital = arr.map((item, index) => index
        ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
        : item.toLowerCase());
    // ^-- change here.
    const capitalString = capital.join('');
    return capitalString;
};
exports.camelize = camelize;
/**
 * Check if a string is Base64
 * @param str string
 * @returns
 */
const isBase64 = (str) => {
    const len = str.length;
    if (!len || len % 4 !== 0 || /[^A-Z0-9+/=]/i.test(str)) {
        return false;
    }
    const firstPaddingChar = str.indexOf('=');
    return (firstPaddingChar === -1 ||
        firstPaddingChar === len - 1 ||
        (firstPaddingChar === len - 2 && str[len - 1] === '='));
};
exports.isBase64 = isBase64;
/**
 * Check if a string is a DataURL
 * @param s string
 * @returns
 */
const isDataURL = (s) => !!s.match(/^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/g);
exports.isDataURL = isDataURL;
/**
 * @internal
 * A convinience method to download the [[DataURL]] of a file
 * @param url The url
 * @param optionsOverride You can use this to override the [axios request config](https://github.com/axios/axios#request-config)
 */
const getDUrl = (url, optionsOverride = {}) => __awaiter(void 0, void 0, void 0, function* () {
    // eslint-disable-next-line no-useless-catch
    try {
        const res = yield (0, axios_1.default)(Object.assign(Object.assign({ method: 'get', url, headers: {
                DNT: 1,
                'Upgrade-Insecure-Requests': 1,
            } }, optionsOverride), { responseType: 'arraybuffer' }));
        const dUrl = `data:${res.headers['content-type']};base64,${Buffer.from(res.data, 'binary').toString('base64')}`;
        return dUrl;
    }
    catch (error) {
        throw error;
    }
});
exports.getDUrl = getDUrl;
/**
 * @internal
 * Use this to extract the mime type from a [[DataURL]]
 */
const base64MimeType = (dUrl) => {
    let result = null;
    if (typeof dUrl !== 'string') {
        return result;
    }
    const mime = dUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    if (mime && mime.length) {
        result = mime[1];
    }
    return result;
};
exports.base64MimeType = base64MimeType;
/**
 * If process.send is defined, send the message three times
 * @param {string} message - The message to send to the parent process.
 * @returns Nothing.
 */
const processSend = (message) => {
    if (process.send) {
        process.send(message);
        process.send(message);
        process.send(message);
    }
    return;
};
exports.processSend = processSend;
/**
 * Return the performance object if it is available, otherwise return the Date object
 */
const perf = () => perf_hooks_1.performance || Date;
exports.perf = perf;
/**
 * Return the current time in milliseconds
 */
const now = () => (0, exports.perf)().now();
exports.now = now;
/**
 * `timePromise` returns a promise that resolves to the time it took to run the function passed to it
 * @param fn - the function to be timed.
 * @returns A string.
 */
function timePromise(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = (0, exports.now)();
        yield fn();
        return ((0, exports.now)() - start).toFixed(0);
    });
}
exports.timePromise = timePromise;
/**
 * It sends a message to the parent process.
 * @param {any} data - The data to be sent to the parent process.
 * @returns Nothing.
 */
const processSendData = (data = {}) => {
    const sd = () => process.send({
        type: 'process:msg',
        data
    }, (error) => {
        if (error) {
            console.error(error);
        }
    });
    return sd();
    //  return await new Promise((resolve, reject)=>{
    //   sd(resolve,reject)
    //  })
};
exports.processSendData = processSendData;
/**
 * It generates a link to the GitHub issue template for the current session
 * @param {ConfigObject} config - the config object
 * @param {SessionInfo} sessionInfo - The sessionInfo object from the CLI
 * @param {any} extras - any
 * @returns A link to the issue tracker for the current session.
 */
const generateGHIssueLink = (config, sessionInfo, extras = {}) => {
    const npm_ver = (0, child_process_1.execSync)('npm -v');
    const labels = [];
    if (sessionInfo.CLI)
        labels.push('CLI');
    if (!sessionInfo.LATEST_VERSION)
        labels.push('NCV');
    labels.push(config.multiDevice ? 'MD' : 'Legacy');
    if (sessionInfo.ACC_TYPE === 'BUSINESS')
        labels.push('BHA');
    if (sessionInfo.ACC_TYPE === 'PERSONAL')
        labels.push('PHA');
    const qp = Object.assign({ "template": "bug_report.yaml", 
        //@ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        "d_info": `${encodeURI(JSON.stringify(((_a) => {
            var { OS, purged, PAGE_UA, OW_KEY, NUM, NUM_HASH } = _a, o = __rest(_a, ["OS", "purged", "PAGE_UA", "OW_KEY", "NUM", "NUM_HASH"]);
            return o;
        })(sessionInfo), null, 2))}`, "enviro": `${`-%20OS:%20${encodeURI(sessionInfo.OS)}%0A-%20Node:%20${encodeURI(process.versions.node)}%0A-%20npm:%20${(String(npm_ver)).replace(/\s/g, '')}`}`, "labels": labels.join(',') }, extras);
    return `https://github.com/open-wa/wa-automate-nodejs/issues/new?${Object.keys(qp).map(k => `${k}=${qp[k]}`).join('&')}`;
};
exports.generateGHIssueLink = generateGHIssueLink;
/**
 * If the file is a DataURL, return it. If it's a file, convert it to a DataURL. If it's a URL,
 * download it and convert it to a DataURL. If Base64, returns it.
 * @param {string} file - The file to be converted to a DataURL.
 * @param {AxiosRequestConfig} requestConfig - AxiosRequestConfig = {}
 * @returns A DataURL
 */
const ensureDUrl = (file, requestConfig = {}) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, exports.isDataURL)(file) && !(0, exports.isBase64)(file)) {
        //must be a file then
        const relativePath = path.join(path.resolve(process.cwd(), file || ''));
        if (fs.existsSync(file) || fs.existsSync(relativePath)) {
            file = yield (0, datauri_1.default)(fs.existsSync(file) ? file : relativePath);
        }
        else if ((0, is_url_superb_1.default)(file)) {
            file = yield (0, exports.getDUrl)(file, requestConfig);
        }
        else
            throw new model_1.CustomError(model_1.ERROR_NAME.FILE_NOT_FOUND, 'Cannot find file. Make sure the file reference is relative, a valid URL or a valid DataURL');
    }
    return file;
});
exports.ensureDUrl = ensureDUrl;
