"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../../node_modules/ms/index.js
var require_ms = __commonJS({
  "../../node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../node_modules/debug/src/common.js"(exports, module) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        let i;
        const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
        const len = split.length;
        for (i = 0; i < len; i++) {
          if (!split[i]) {
            continue;
          }
          namespaces = split[i].replace(/\*/g, ".*?");
          if (namespaces[0] === "-") {
            createDebug.skips.push(new RegExp("^" + namespaces.slice(1) + "$"));
          } else {
            createDebug.names.push(new RegExp("^" + namespaces + "$"));
          }
        }
      }
      function disable() {
        const namespaces = [
          ...createDebug.names.map(toNamespace),
          ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        if (name[name.length - 1] === "*") {
          return true;
        }
        let i;
        let len;
        for (i = 0, len = createDebug.skips.length; i < len; i++) {
          if (createDebug.skips[i].test(name)) {
            return false;
          }
        }
        for (i = 0, len = createDebug.names.length; i < len; i++) {
          if (createDebug.names[i].test(name)) {
            return true;
          }
        }
        return false;
      }
      function toNamespace(regexp) {
        return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module.exports = setup;
  }
});

// ../../node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../node_modules/debug/src/browser.js"(exports, module) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../../node_modules/has-flag/index.js"(exports, module) {
    "use strict";
    module.exports = (flag, argv) => {
      argv = argv || process.argv;
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const pos = argv.indexOf(prefix + flag);
      const terminatorPos = argv.indexOf("--");
      return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
    };
  }
});

// ../../node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../../node_modules/supports-color/index.js"(exports, module) {
    "use strict";
    var os = __require("os");
    var hasFlag = require_has_flag();
    var env = process.env;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false")) {
      forceColor = false;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = true;
    }
    if ("FORCE_COLOR" in env) {
      forceColor = env.FORCE_COLOR.length === 0 || parseInt(env.FORCE_COLOR, 10) !== 0;
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(stream) {
      if (forceColor === false) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (stream && !stream.isTTY && forceColor !== true) {
        return 0;
      }
      const min = forceColor ? 1 : 0;
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(process.versions.node.split(".")[0]) >= 8 && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      if (env.TERM === "dumb") {
        return min;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream);
      return translateLevel(level);
    }
    module.exports = {
      supportsColor: getSupportLevel,
      stdout: getSupportLevel(process.stdout),
      stderr: getSupportLevel(process.stderr)
    };
  }
});

// ../../node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../node_modules/debug/src/node.js"(exports, module) {
    var tty = __require("tty");
    var util = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return new Date().toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.format(...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// ../../node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../node_modules/debug/src/index.js"(exports, module) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node();
    }
  }
});

// src/client.ts





var _anchor = require('@project-serum/anchor');
var _bytes = require('@project-serum/anchor/dist/cjs/utils/bytes');







var _web3js = require('@solana/web3.js');

// src/idl/marginfi-types.ts
var IDL = {
  version: "0.1.0",
  name: "marginfi",
  instructions: [
    {
      name: "initializeMarginfiGroup",
      docs: ["Initialize a new Marginfi Group with initial config"],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: true,
          isSigner: true
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "configureMarginfiGroup",
      docs: ["Configure a Marginfi Group"],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: true,
          isSigner: false
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true
        }
      ],
      args: [
        {
          name: "config",
          type: {
            defined: "GroupConfig"
          }
        }
      ]
    },
    {
      name: "lendingPoolAddBank",
      docs: ["Add a new bank to the Marginfi Group"],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true
        },
        {
          name: "bankMint",
          isMut: false,
          isSigner: false
        },
        {
          name: "bank",
          isMut: true,
          isSigner: true
        },
        {
          name: "liquidityVaultAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "liquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "insuranceVaultAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "insuranceVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "feeVaultAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "feeVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "pythOracle",
          isMut: false,
          isSigner: false
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "bankConfig",
          type: {
            defined: "BankConfig"
          }
        }
      ]
    },
    {
      name: "lendingPoolConfigureBank",
      docs: ["Configure a bank in the Marginfi Group"],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true
        },
        {
          name: "bank",
          isMut: true,
          isSigner: false
        },
        {
          name: "pythOracle",
          isMut: false,
          isSigner: false,
          docs: [
            "Set only if pyth oracle is being changed otherwise can be a random account."
          ]
        }
      ],
      args: [
        {
          name: "bankConfigOpt",
          type: {
            defined: "BankConfigOpt"
          }
        }
      ]
    },
    {
      name: "lendingPoolHandleBankruptcy",
      docs: [
        "Handle bad debt of a bankrupt marginfi account for a given bank."
      ],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true
        },
        {
          name: "bank",
          isMut: true,
          isSigner: false
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "liquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "insuranceVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "insuranceVaultAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "initializeMarginfiAccount",
      docs: ["Initialize a marginfi account for a given group"],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: true
        },
        {
          name: "signer",
          isMut: true,
          isSigner: true
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: "bankDeposit",
      docs: [
        "Deposit assets into a lending account",
        "Repay borrowed assets, if any exist."
      ],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "signer",
          isMut: false,
          isSigner: true
        },
        {
          name: "bank",
          isMut: true,
          isSigner: false
        },
        {
          name: "signerTokenAccount",
          isMut: true,
          isSigner: false,
          docs: ["Token mint/authority are checked at transfer"]
        },
        {
          name: "bankLiquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "bankWithdraw",
      docs: [
        "Withdraw assets from a lending account",
        "Withdraw deposited assets, if any exist, otherwise borrow assets.",
        "Account health checked."
      ],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "signer",
          isMut: false,
          isSigner: true
        },
        {
          name: "bank",
          isMut: true,
          isSigner: false
        },
        {
          name: "destinationTokenAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "bankLiquidityVaultAuthority",
          isMut: true,
          isSigner: false
        },
        {
          name: "bankLiquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "lendingAccountLiquidate",
      docs: [
        "Liquidate a lending account balance of an unhealthy marginfi account"
      ],
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "assetBank",
          isMut: true,
          isSigner: false
        },
        {
          name: "assetPriceFeed",
          isMut: false,
          isSigner: false
        },
        {
          name: "liabBank",
          isMut: true,
          isSigner: false
        },
        {
          name: "liabPriceFeed",
          isMut: false,
          isSigner: false
        },
        {
          name: "liquidatorMarginfiAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "signer",
          isMut: false,
          isSigner: true
        },
        {
          name: "liquidateeMarginfiAccount",
          isMut: true,
          isSigner: false
        },
        {
          name: "bankLiquidityVaultAuthority",
          isMut: true,
          isSigner: false
        },
        {
          name: "bankLiquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "bankInsuranceVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "assetAmount",
          type: "u64"
        }
      ]
    },
    {
      name: "bankAccrueInterest",
      accounts: [
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false
        },
        {
          name: "bank",
          isMut: true,
          isSigner: false
        },
        {
          name: "liquidityVaultAuthority",
          isMut: false,
          isSigner: false
        },
        {
          name: "liquidityVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "insuranceVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "feeVault",
          isMut: true,
          isSigner: false
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "marginfiAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "group",
            type: "publicKey"
          },
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "lendingAccount",
            type: {
              defined: "LendingAccount"
            }
          }
        ]
      }
    },
    {
      name: "marginfiGroup",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: "publicKey"
          }
        ]
      }
    },
    {
      name: "bank",
      type: {
        kind: "struct",
        fields: [
          {
            name: "mint",
            type: "publicKey"
          },
          {
            name: "mintDecimals",
            type: "u8"
          },
          {
            name: "group",
            type: "publicKey"
          },
          {
            name: "ignore1",
            type: {
              array: ["u8", 7]
            }
          },
          {
            name: "depositShareValue",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "liabilityShareValue",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "liquidityVault",
            type: "publicKey"
          },
          {
            name: "liquidityVaultBump",
            type: "u8"
          },
          {
            name: "liquidityVaultAuthorityBump",
            type: "u8"
          },
          {
            name: "insuranceVault",
            type: "publicKey"
          },
          {
            name: "insuranceVaultBump",
            type: "u8"
          },
          {
            name: "insuranceVaultAuthorityBump",
            type: "u8"
          },
          {
            name: "feeVault",
            type: "publicKey"
          },
          {
            name: "feeVaultBump",
            type: "u8"
          },
          {
            name: "feeVaultAuthorityBump",
            type: "u8"
          },
          {
            name: "ignore2",
            type: {
              array: ["u8", 2]
            }
          },
          {
            name: "config",
            type: {
              defined: "BankConfig"
            }
          },
          {
            name: "totalLiabilityShares",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "totalDepositShares",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "lastUpdate",
            type: "i64"
          }
        ]
      }
    }
  ],
  types: [
    {
      name: "LendingAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "balances",
            type: {
              array: [
                {
                  defined: "Balance"
                },
                16
              ]
            }
          }
        ]
      }
    },
    {
      name: "Balance",
      type: {
        kind: "struct",
        fields: [
          {
            name: "active",
            type: "bool"
          },
          {
            name: "bankPk",
            type: "publicKey"
          },
          {
            name: "ignore",
            type: {
              array: ["u8", 7]
            }
          },
          {
            name: "depositShares",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "liabilityShares",
            type: {
              defined: "WrappedI80F48"
            }
          }
        ]
      }
    },
    {
      name: "GroupConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: {
              option: "publicKey"
            }
          }
        ]
      }
    },
    {
      name: "InterestRateConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "optimalUtilizationRate",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "plateauInterestRate",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "maxInterestRate",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "insuranceFeeFixedApr",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "insuranceIrFee",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "protocolFixedFeeApr",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "protocolIrFee",
            type: {
              defined: "WrappedI80F48"
            }
          }
        ]
      }
    },
    {
      name: "BankConfig",
      docs: [
        "TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "depositWeightInit",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "depositWeightMaint",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "liabilityWeightInit",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "liabilityWeightMaint",
            type: {
              defined: "WrappedI80F48"
            }
          },
          {
            name: "maxCapacity",
            type: "u64"
          },
          {
            name: "pythOracle",
            type: "publicKey"
          },
          {
            name: "interestRateConfig",
            type: {
              defined: "InterestRateConfig"
            }
          }
        ]
      }
    },
    {
      name: "WrappedI80F48",
      type: {
        kind: "struct",
        fields: [
          {
            name: "value",
            type: "i128"
          }
        ]
      }
    },
    {
      name: "BankConfigOpt",
      type: {
        kind: "struct",
        fields: [
          {
            name: "depositWeightInit",
            type: {
              option: {
                defined: "WrappedI80F48"
              }
            }
          },
          {
            name: "depositWeightMaint",
            type: {
              option: {
                defined: "WrappedI80F48"
              }
            }
          },
          {
            name: "liabilityWeightInit",
            type: {
              option: {
                defined: "WrappedI80F48"
              }
            }
          },
          {
            name: "liabilityWeightMaint",
            type: {
              option: {
                defined: "WrappedI80F48"
              }
            }
          },
          {
            name: "maxCapacity",
            type: {
              option: "u64"
            }
          },
          {
            name: "pythOracle",
            type: {
              option: "publicKey"
            }
          }
        ]
      }
    },
    {
      name: "WeightType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Initial"
          },
          {
            name: "Maintenance"
          }
        ]
      }
    },
    {
      name: "RiskRequirementType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Initial"
          },
          {
            name: "Maintenance"
          }
        ]
      }
    },
    {
      name: "BankVaultType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Liquidity"
          },
          {
            name: "Insurance"
          },
          {
            name: "Fee"
          }
        ]
      }
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "MathError",
      msg: "Math error"
    },
    {
      code: 6001,
      name: "BankNotFound",
      msg: "Invalid bank index"
    },
    {
      code: 6002,
      name: "LendingAccountBalanceNotFound",
      msg: "Lending account balance not found"
    },
    {
      code: 6003,
      name: "BankDepositCapacityExceeded",
      msg: "Bank deposit capacity exceeded"
    },
    {
      code: 6004,
      name: "InvalidTransfer",
      msg: "Invalid transfer"
    },
    {
      code: 6005,
      name: "MissingPythOrBankAccount",
      msg: "Missing Pyth or Bank account"
    },
    {
      code: 6006,
      name: "MissingPythAccount",
      msg: "Missing Pyth account"
    },
    {
      code: 6007,
      name: "InvalidPythAccount",
      msg: "Invalid Pyth account"
    },
    {
      code: 6008,
      name: "MissingBankAccount",
      msg: "Missing Bank account"
    },
    {
      code: 6009,
      name: "InvalidBankAccount",
      msg: "Invalid Bank account"
    },
    {
      code: 6010,
      name: "BadAccountHealth",
      msg: "Bad account health"
    },
    {
      code: 6011,
      name: "LendingAccountBalanceSlotsFull",
      msg: "Lending account balance slots are full"
    },
    {
      code: 6012,
      name: "BankAlreadyExists",
      msg: "Bank already exists"
    },
    {
      code: 6013,
      name: "BorrowingNotAllowed",
      msg: "Borrowing not allowed"
    },
    {
      code: 6014,
      name: "AccountIllegalPostLiquidationState",
      msg: "Illegal post liquidation state, account is either not unhealthy or liquidation was too big"
    },
    {
      code: 6015,
      name: "AccountNotBankrupt",
      msg: "Account is not bankrupt"
    },
    {
      code: 6016,
      name: "BalanceNotBadDebt",
      msg: "Account balance is not bad debt"
    },
    {
      code: 6017,
      name: "InvalidConfig",
      msg: "Invalid group config"
    },
    {
      code: 6018,
      name: "StaleOracle",
      msg: "Stale oracle data"
    }
  ]
};

// src/nodeWallet.ts



var NodeWallet = class {
  constructor(payer) {
    this.payer = payer;
  }
  static local() {
    const process2 = __require("process");
    const payer = _web3js.Keypair.fromSecretKey(
      Buffer.from(
        JSON.parse(
          __require("fs").readFileSync(
            process2.env.MARGINFI_WALLET || __require("path").join(
              __require("os").homedir(),
              ".config/solana/id.json"
            ),
            {
              encoding: "utf-8"
            }
          )
        )
      )
    );
    return new NodeWallet(payer);
  }
  static anchor() {
    const process2 = __require("process");
    if (!process2.env.ANCHOR_WALLET || process2.env.ANCHOR_WALLET === "") {
      throw new Error(
        "expected environment variable `ANCHOR_WALLET` is not set."
      );
    }
    const payer = _web3js.Keypair.fromSecretKey(
      Buffer.from(
        JSON.parse(
          __require("fs").readFileSync(process2.env.ANCHOR_WALLET, {
            encoding: "utf-8"
          })
        )
      )
    );
    return new NodeWallet(payer);
  }
  async signTransaction(tx) {
    if ("version" in tx) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }
    return tx;
  }
  async signAllTransactions(txs) {
    return txs.map((tx) => {
      if ("version" in tx) {
        tx.sign([this.payer]);
        return tx;
      } else {
        tx.partialSign(this.payer);
        return tx;
      }
    });
  }
  get publicKey() {
    return this.payer.publicKey;
  }
};

// src/types.ts
var BankVaultType = /* @__PURE__ */ ((BankVaultType2) => {
  BankVaultType2[BankVaultType2["LiquidityVault"] = 0] = "LiquidityVault";
  BankVaultType2[BankVaultType2["InsuranceVault"] = 1] = "InsuranceVault";
  BankVaultType2[BankVaultType2["FeeVault"] = 2] = "FeeVault";
  return BankVaultType2;
})(BankVaultType || {});
var AccountType = /* @__PURE__ */ ((AccountType2) => {
  AccountType2["MarginfiGroup"] = "marginfiGroup";
  AccountType2["MarginfiAccount"] = "marginfiAccount";
  return AccountType2;
})(AccountType || {});

// src/utils.ts






var _bignumberjs = require('bignumber.js'); var _bignumberjs2 = _interopRequireDefault(_bignumberjs);

// src/constants.ts

var PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED = Buffer.from(
  "liquidity_vault_auth"
);
var PDA_BANK_INSURANCE_VAULT_AUTH_SEED = Buffer.from(
  "insurance_vault_auth"
);
var PDA_BANK_FEE_VAULT_AUTH_SEED = Buffer.from("fee_vault_auth");
var PDA_BANK_LIQUIDITY_VAULT_SEED = Buffer.from("liquidity_vault");
var PDA_BANK_INSURANCE_VAULT_SEED = Buffer.from("insurance_vault");
var PDA_BANK_FEE_VAULT_SEED = Buffer.from("fee_vault");
var DEFAULT_COMMITMENT = "processed";
var DEFAULT_SEND_OPTS = {
  skipPreflight: false,
  preflightCommitment: DEFAULT_COMMITMENT
};
var DEFAULT_CONFIRM_OPTS = {
  commitment: DEFAULT_COMMITMENT,
  ...DEFAULT_SEND_OPTS
};
var PYTH_PRICE_CONF_INTERVALS = new (0, _bignumberjs2.default)(4.24);
var USDC_DECIMALS = 6;

// src/utils.ts
var _decimaljs = require('decimal.js');
function loadKeypair(keypairPath) {
  const path = __require("path");
  if (!keypairPath || keypairPath == "") {
    throw new Error("Keypair is required!");
  }
  if (keypairPath[0] === "~") {
    keypairPath = path.join(__require("os").homedir(), keypairPath.slice(1));
  }
  const keyPath = path.normalize(keypairPath);
  const loaded = _web3js.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(__require("fs").readFileSync(keyPath).toString()))
  );
  return loaded;
}
async function processTransaction(provider, tx, signers, opts) {
  const connection = new (0, _web3js.Connection)(
    provider.connection.rpcEndpoint,
    provider.opts
  );
  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight }
  } = await connection.getLatestBlockhashAndContext();
  tx.recentBlockhash = blockhash;
  tx.feePayer = provider.wallet.publicKey;
  tx = await provider.wallet.signTransaction(tx);
  if (signers === void 0) {
    signers = [];
  }
  signers.filter((s) => s !== void 0).forEach((kp) => {
    tx.partialSign(kp);
  });
  try {
    const signature = await connection.sendRawTransaction(
      tx.serialize(),
      opts || {
        skipPreflight: false,
        preflightCommitment: provider.connection.commitment,
        commitment: provider.connection.commitment,
        minContextSlot
      }
    );
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    });
    return signature;
  } catch (e) {
    console.log(e);
    throw e;
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function wrappedI80F48toBigNumber({ value }, scaleDecimal = 0) {
  let numbers = new (0, _decimaljs.Decimal)(
    `${value.isNeg() ? "-" : ""}0b${value.abs().toString(2)}p-48`
  ).dividedBy(10 ** scaleDecimal);
  return new (0, _bignumberjs2.default)(numbers.toString());
}
function toNumber(amount) {
  let amt;
  if (typeof amount === "number") {
    amt = amount;
  } else if (typeof amount === "string") {
    amt = Number(amount);
  } else {
    amt = amount.toNumber();
  }
  return amt;
}
function toBigNumber(amount) {
  let amt;
  if (amount instanceof _bignumberjs2.default) {
    amt = amount;
  } else {
    amt = new (0, _bignumberjs2.default)(amount.toString());
  }
  return amt;
}
function uiToNative(amount, decimals) {
  let amt = toBigNumber(amount);
  return new (0, _anchor.BN)(amt.times(10 ** decimals).toFixed(0, _bignumberjs2.default.ROUND_FLOOR));
}
function nativeToUi(amount, decimals) {
  let amt = toBigNumber(amount);
  return amt.div(10 ** decimals).toNumber();
}
function getBankVaultAuthoritySeeds(type) {
  switch (type) {
    case 0 /* LiquidityVault */:
      return PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED;
    case 1 /* InsuranceVault */:
      return PDA_BANK_INSURANCE_VAULT_AUTH_SEED;
    case 2 /* FeeVault */:
      return PDA_BANK_FEE_VAULT_AUTH_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}
function getBankVaultAuthority(bankVaultType, bankPk, programId) {
  return _web3js.PublicKey.findProgramAddressSync(
    [getBankVaultAuthoritySeeds(bankVaultType), bankPk.toBuffer()],
    programId
  );
}
function shortenAddress(pubkey, chars = 4) {
  const pubkeyStr = pubkey.toString();
  return `${pubkeyStr.slice(0, chars)}...${pubkeyStr.slice(-chars)}`;
}

// src/config.ts

var _superstruct = require('superstruct');

// src/configs.json
var configs_default = [
  {
    label: "devnet1",
    cluster: "devnet",
    program: "EPsDwX4sRNRkiykuqeyExF5LsHV9XBPMZM6gHj7QQbkY",
    group: "2y5NtJQVpaDPynjHFSEAcPJ6ZFWeReJaK2sCYFbRaERC",
    banks: [
      {
        label: "USDC",
        address: "DfEFnKXuv16nWPdc52Bwt6rHT2HKS4Syva3Tvxy38HPd"
      },
      {
        label: "SOL",
        address: "373d7qCQZPVs6JLmmiN8ch81VsdoJ9mrg54mCNbokYgS"
      }
    ]
  }
];

// src/config.ts
var BankConfigRaw = _superstruct.object.call(void 0, {
  label: _superstruct.string.call(void 0, ),
  address: _superstruct.string.call(void 0, )
});
var MarginfiConfigRaw = _superstruct.object.call(void 0, {
  label: _superstruct.literal.call(void 0, "devnet1"),
  cluster: _superstruct.string.call(void 0, ),
  program: _superstruct.string.call(void 0, ),
  group: _superstruct.string.call(void 0, ),
  banks: _superstruct.array.call(void 0, BankConfigRaw)
});
var ConfigRaw = _superstruct.array.call(void 0, MarginfiConfigRaw);
function parseBankConfig(bankConfigRaw) {
  return {
    label: bankConfigRaw.label,
    address: new (0, _web3js.PublicKey)(bankConfigRaw.address)
  };
}
function parseConfig(configRaw) {
  return {
    environment: configRaw.label,
    cluster: configRaw.cluster,
    programId: new (0, _web3js.PublicKey)(configRaw.program),
    groupPk: new (0, _web3js.PublicKey)(configRaw.group),
    banks: configRaw.banks.map((raw) => parseBankConfig(raw))
  };
}
function parseConfigs(configRaw) {
  return configRaw.reduce(
    (config, current, _) => ({
      [current.label]: parseConfig(current),
      ...config
    }),
    {}
  );
}
function loadDefaultConfig() {
  _superstruct.assert.call(void 0, configs_default, ConfigRaw);
  return parseConfigs(configs_default);
}
function getMarginfiConfig(environment, overrides) {
  const defaultConfigs = loadDefaultConfig();
  switch (environment) {
    case "devnet1":
      const defaultConfig = defaultConfigs[environment];
      return {
        environment,
        programId: _optionalChain([overrides, 'optionalAccess', _2 => _2.programId]) || defaultConfig.programId,
        groupPk: _optionalChain([overrides, 'optionalAccess', _3 => _3.groupPk]) || defaultConfig.groupPk,
        cluster: _optionalChain([overrides, 'optionalAccess', _4 => _4.cluster]) || defaultConfig.cluster,
        banks: _optionalChain([overrides, 'optionalAccess', _5 => _5.banks]) || defaultConfig.banks
      };
    default:
      throw Error(`Unknown environment ${environment}`);
  }
}
function getConfig(environment, overrides) {
  return {
    ...getMarginfiConfig(environment, overrides)
  };
}

// src/group.ts




var _client = require('@pythnetwork/client');

// src/bank.ts


// src/account.ts





var _token = require('@project-serum/anchor/dist/cjs/utils/token');






// src/instructions.ts


async function makeInitMarginfiAccountIx(mfProgram, accounts) {
  return mfProgram.methods.initializeMarginfiAccount().accounts({
    marginfiGroup: accounts.marginfiGroupPk,
    marginfiAccount: accounts.marginfiAccountPk,
    signer: accounts.signerPk,
    systemProgram: _web3js.SystemProgram.programId
  }).instruction();
}
async function makeDepositIx(mfProgram, accounts, args, remainingAccounts = []) {
  return mfProgram.methods.bankDeposit(args.amount).accounts({
    marginfiGroup: accounts.marginfiGroupPk,
    marginfiAccount: accounts.marginfiAccountPk,
    signer: accounts.authorityPk,
    signerTokenAccount: accounts.signerTokenAccountPk,
    bank: accounts.bankPk,
    bankLiquidityVault: accounts.bankLiquidityVaultPk,
    tokenProgram: _token.TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).instruction();
}
async function makeWithdrawIx(mfProgram, accounts, args, remainingAccounts = []) {
  return mfProgram.methods.bankWithdraw(args.amount).accounts({
    marginfiGroup: accounts.marginfiGroupPk,
    marginfiAccount: accounts.marginfiAccountPk,
    signer: accounts.signerPk,
    bankLiquidityVault: accounts.bankLiquidityVaultPk,
    bankLiquidityVaultAuthority: accounts.bankLiquidityVaultAuthorityPk,
    destinationTokenAccount: accounts.destinationTokenAccountPk,
    bank: accounts.bankPk,
    tokenProgram: _token.TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).instruction();
}
function makeLendingAccountLiquidateIx(mfiProgram, accounts, args, remainingAccounts = []) {
  return mfiProgram.methods.lendingAccountLiquidate(args.assetAmount).accountsStrict({
    marginfiGroup: accounts.marginfiGroup,
    signer: accounts.signer,
    assetBank: accounts.assetBank,
    assetPriceFeed: accounts.assetPriceFeed,
    liabBank: accounts.liabBank,
    liabPriceFeed: accounts.liabPriceFeed,
    liquidatorMarginfiAccount: accounts.liquidatorMarginfiAccount,
    liquidateeMarginfiAccount: accounts.liquidateeMarginfiAccount,
    bankLiquidityVaultAuthority: accounts.bankLiquidityVaultAuthority,
    bankLiquidityVault: accounts.bankLiquidityVault,
    bankInsuranceVault: accounts.bankInsuranceVault,
    tokenProgram: _token.TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).instruction();
}
var instructions = {
  makeDepositIx,
  makeWithdrawIx,
  makeInitMarginfiAccountIx,
  makeLendingAccountLiquidateIx
};
var instructions_default = instructions;

// src/account.ts
var MarginfiAccount = class {
  constructor(marginfiAccountPk, client, group, rawData) {
    this.client = client;
    this.publicKey = marginfiAccountPk;
    this._group = group;
    this._authority = rawData.authority;
    this._lendingAccount = rawData.lendingAccount.balances.filter((la) => la.active).map((la) => new Balance(la));
  }
  get authority() {
    return this._authority;
  }
  get group() {
    return this._group;
  }
  get lendingAccount() {
    return this._lendingAccount;
  }
  get _program() {
    return this.client.program;
  }
  get _config() {
    return this.client.config;
  }
  static async fetch(marginfiAccountPk, client, commitment) {
    const { config, program } = client;
    const _marginfiAccountPk = _anchor.translateAddress.call(void 0, marginfiAccountPk);
    const accountData = await MarginfiAccount._fetchAccountData(
      _marginfiAccountPk,
      config,
      program,
      commitment
    );
    const marginfiAccount = new MarginfiAccount(
      _marginfiAccountPk,
      client,
      await group_default.fetch(config, program, commitment),
      accountData
    );
    require_src()("mfi:margin-account")(
      "Loaded marginfi account %s",
      _marginfiAccountPk
    );
    return marginfiAccount;
  }
  static fromAccountData(marginfiAccountPk, client, accountData, marginfiGroup) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );
    const _marginfiAccountPk = _anchor.translateAddress.call(void 0, marginfiAccountPk);
    return new MarginfiAccount(
      _marginfiAccountPk,
      client,
      marginfiGroup,
      accountData
    );
  }
  static fromAccountDataRaw(marginfiAccountPk, client, marginfiAccountRawData, marginfiGroup) {
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountRawData);
    return MarginfiAccount.fromAccountData(
      marginfiAccountPk,
      client,
      marginfiAccountData,
      marginfiGroup
    );
  }
  async makeDepositIx(amount, bank) {
    const userTokenAtaPk = await _token.associatedAddress.call(void 0, {
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey
    });
    const ix = await instructions_default.makeDepositIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        authorityPk: this.client.provider.wallet.publicKey,
        signerTokenAccountPk: userTokenAtaPk,
        bankLiquidityVaultPk: bank.liquidityVault,
        bankPk: bank.publicKey
      },
      { amount: uiToNative(amount, bank.mintDecimals) }
    );
    return { instructions: [ix], keys: [] };
  }
  async deposit(amount, bank) {
    const debug = require_src()(
      `mfi:margin-account:${this.publicKey.toString()}:deposit`
    );
    debug("Depositing %s %s into marginfi account", amount, bank.mint);
    const ixs = await this.makeDepositIx(amount, bank);
    const tx = new (0, _web3js.Transaction)().add(...ixs.instructions);
    const sig = await processTransaction(this.client.provider, tx);
    debug("Depositing successful %s", sig);
    await this.reload();
    return sig;
  }
  async makeWithdrawIx(amount, bank) {
    const userTokenAtaPk = await _token.associatedAddress.call(void 0, {
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey
    });
    const [bankLiquidityVaultAuthorityPk] = await getBankVaultAuthority(
      0 /* LiquidityVault */,
      bank.publicKey,
      this._program.programId
    );
    const remainingAccounts = this.getHealthCheckAccounts([bank]);
    const ix = await instructions_default.makeWithdrawIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        signerPk: this.client.provider.wallet.publicKey,
        bankPk: bank.publicKey,
        destinationTokenAccountPk: userTokenAtaPk,
        bankLiquidityVaultPk: bank.liquidityVault,
        bankLiquidityVaultAuthorityPk
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );
    return { instructions: [ix], keys: [] };
  }
  async withdraw(amount, bank) {
    const debug = require_src()(
      `mfi:margin-account:${this.publicKey.toString()}:withdraw`
    );
    debug("Withdrawing %s from marginfi account", amount);
    const ixs = await this.makeWithdrawIx(amount, bank);
    const tx = new (0, _web3js.Transaction)().add(...ixs.instructions);
    const sig = await processTransaction(this.client.provider, tx);
    debug("Withdrawing successful %s", sig);
    await this.reload();
    return sig;
  }
  getHealthCheckAccounts(mandatoryBanks = []) {
    let mandatoryBanksSet = new Set(mandatoryBanks.map((b) => b.publicKey));
    let mandatoryBanksAdded = /* @__PURE__ */ new Set();
    let remainingAccounts = this.lendingAccount.flatMap((balance) => {
      const bank = this._group.getBankByPk(balance.bankPk);
      if (bank === null)
        throw Error(`Could not find bank ${balance.bankPk.toBase58()}`);
      if (mandatoryBanksSet.has(bank.publicKey)) {
        mandatoryBanksAdded.add(bank.publicKey);
      }
      return [
        {
          pubkey: bank.publicKey,
          isSigner: false,
          isWritable: false
        },
        {
          pubkey: bank.config.pythOracle,
          isSigner: false,
          isWritable: false
        }
      ];
    });
    const remainingBanksSet = new Set(
      [...mandatoryBanksSet].filter((x) => !mandatoryBanksAdded.has(x))
    );
    if (remainingBanksSet.size > 0) {
      remainingBanksSet.forEach((bankPk) => {
        const bank = this._group.getBankByPk(bankPk);
        if (bank === null)
          throw Error(`Could not find bank ${bankPk.toBase58()}`);
        remainingAccounts = remainingAccounts.concat([
          {
            pubkey: bankPk,
            isSigner: false,
            isWritable: false
          },
          {
            pubkey: bank.config.pythOracle,
            isSigner: false,
            isWritable: false
          }
        ]);
      });
    }
    return remainingAccounts;
  }
  static async _fetchAccountData(accountAddress, config, program, commitment) {
    const mergedCommitment = _nullishCoalesce(_nullishCoalesce(commitment, () => ( program.provider.connection.commitment)), () => ( DEFAULT_COMMITMENT));
    const data = await program.account.marginfiAccount.fetch(
      accountAddress,
      mergedCommitment
    );
    if (!data.group.equals(config.groupPk))
      throw Error(
        `Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`
      );
    return data;
  }
  static decode(encoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return coder.accounts.decode("marginfiAccount" /* MarginfiAccount */, encoded);
  }
  static async encode(decoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return await coder.accounts.encode("marginfiAccount" /* MarginfiAccount */, decoded);
  }
  async reload() {
    require_src()(`mfi:margin-account:${this.publicKey.toString()}:loader`)(
      "Reloading account data"
    );
    const [marginfiGroupAi, marginfiAccountAi] = await this._loadGroupAndAccountAi();
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountAi.data);
    if (!marginfiAccountData.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );
    const bankAddresses = this._config.banks.map((b) => b.address);
    let bankAccountsData = await this._program.account.bank.fetchMultiple(
      bankAddresses
    );
    let nullAccounts = [];
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] === null)
        nullAccounts.push(bankAddresses[i]);
    }
    if (nullAccounts.length > 0) {
      throw Error(`Failed to fetch banks ${nullAccounts}`);
    }
    const pythAccounts = await this._program.provider.connection.getMultipleAccountsInfo(
      bankAccountsData.map((b) => b.config.pythOracle)
    );
    const banks = bankAccountsData.map(
      (bd, index) => new bank_default(
        this._config.banks[index].label,
        bankAddresses[index],
        bd,
        _client.parsePriceData.call(void 0, pythAccounts[index].data)
      )
    );
    this._group = group_default.fromAccountDataRaw(
      this._config,
      this._program,
      marginfiGroupAi.data,
      banks
    );
    this._updateFromAccountData(marginfiAccountData);
  }
  _updateFromAccountData(data) {
    this._authority = data.authority;
    this._lendingAccount = data.lendingAccount.balances.filter((la) => la.active).map((la) => new Balance(la));
  }
  async _loadGroupAndAccountAi() {
    const debug = require_src()(
      `mfi:margin-account:${this.publicKey.toString()}:loader`
    );
    debug(
      "Loading marginfi account %s, and group %s",
      this.publicKey,
      this._config.groupPk
    );
    let [marginfiGroupAi, marginfiAccountAi] = await this.client.provider.connection.getMultipleAccountsInfo(
      [this._config.groupPk, this.publicKey],
      DEFAULT_COMMITMENT
    );
    if (!marginfiAccountAi) {
      throw Error("Marginfi account no found");
    }
    if (!marginfiGroupAi) {
      throw Error("Marginfi Group Account no found");
    }
    return [marginfiGroupAi, marginfiAccountAi];
  }
  getHealthComponents(marginReqType) {
    const [assets, liabilities] = this._lendingAccount.map((accountBalance) => {
      const bank = this._group.banks.get(accountBalance.bankPk.toBase58());
      if (!bank)
        throw Error(
          `Bank ${shortenAddress(accountBalance.bankPk)} not found`
        );
      const { assets: assets2, liabilities: liabilities2 } = accountBalance.getUsdValueWithPriceBias(
        bank,
        marginReqType
      );
      return [assets2, liabilities2];
    }).reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new (0, _bignumberjs2.default)(0), new (0, _bignumberjs2.default)(0)]
    );
    return { assets, liabilities };
  }
  getActiveBalances() {
    return this._lendingAccount.filter((b) => b.active);
  }
  canBeLiquidated() {
    const { assets, liabilities } = this.getHealthComponents(
      MarginRequirementType.Maint
    );
    return assets < liabilities;
  }
  getBalance(bankPk) {
    return _nullishCoalesce(this._lendingAccount.find((b) => b.bankPk.equals(bankPk)), () => ( Balance.newEmpty(bankPk)));
  }
  getFreeCollateral() {
    const { assets, liabilities } = this.getHealthComponents(
      MarginRequirementType.Init
    );
    return _bignumberjs2.default.max(0, assets.minus(liabilities));
  }
  _getHealthComponentsWithoutBias(marginReqType) {
    const [assets, liabilities] = this._lendingAccount.map((accountBalance) => {
      const bank = this._group.banks.get(accountBalance.bankPk.toBase58());
      if (!bank)
        throw Error(
          `Bank ${shortenAddress(accountBalance.bankPk)} not found`
        );
      const { assets: assets2, liabilities: liabilities2 } = accountBalance.getUsdValue(
        bank,
        marginReqType
      );
      return [assets2, liabilities2];
    }).reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new (0, _bignumberjs2.default)(0), new (0, _bignumberjs2.default)(0)]
    );
    return { assets, liabilities };
  }
  computeApy() {
    const { assets, liabilities } = this._getHealthComponentsWithoutBias(
      MarginRequirementType.Equity
    );
    const totalUsdValue = assets.minus(liabilities);
    return this.getActiveBalances().reduce((weightedApy, balance) => {
      const bank = this._group.getBankByPk(balance.bankPk);
      if (!bank)
        throw Error(`Bank ${balance.bankPk.toBase58()} not found`);
      return weightedApy.minus(
        bank.getInterestRates().borrowingRate.times(
          balance.getUsdValue(bank, MarginRequirementType.Equity).liabilities
        ).div(liabilities)
      ).plus(
        bank.getInterestRates().lendingRate.times(
          balance.getUsdValue(bank, MarginRequirementType.Equity).assets
        ).div(assets)
      );
    }, new (0, _bignumberjs2.default)(0)).toNumber();
  }
  getMaxWithdrawForBank(bank) {
    const balance = this.getBalance(bank.publicKey);
    const freeCollateral = this.getFreeCollateral();
    const untiedCollateralForBank = _bignumberjs2.default.min(
      bank.getAssetUsdValue(
        balance.depositShares,
        MarginRequirementType.Init,
        0 /* Lowest */
      ),
      freeCollateral
    );
    const priceLowestBias = bank.getPrice(0 /* Lowest */);
    const priceHighestBias = bank.getPrice(2 /* Highest */);
    const depositWeight = bank.getAssetWeight(MarginRequirementType.Init);
    const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Init);
    return untiedCollateralForBank.div(priceLowestBias.times(depositWeight)).plus(
      freeCollateral.minus(untiedCollateralForBank).div(priceHighestBias.times(liabWeight))
    );
  }
  async makeLendingAccountLiquidateIx(liquidateeMarginfiAccount, assetBank, assetQuantityUi, liabBank) {
    const ix = await instructions_default.makeLendingAccountLiquidateIx(
      this._program,
      {
        marginfiGroup: this._config.groupPk,
        signer: this.client.provider.wallet.publicKey,
        assetBank: assetBank.publicKey,
        assetPriceFeed: assetBank.config.pythOracle,
        liabBank: liabBank.publicKey,
        liabPriceFeed: liabBank.config.pythOracle,
        liquidatorMarginfiAccount: this.publicKey,
        liquidateeMarginfiAccount: liquidateeMarginfiAccount.publicKey,
        bankLiquidityVaultAuthority: getBankVaultAuthority(
          0 /* LiquidityVault */,
          liabBank.publicKey,
          this._program.programId
        )[0],
        bankLiquidityVault: liabBank.liquidityVault,
        bankInsuranceVault: liabBank.insuranceVault
      },
      { assetAmount: uiToNative(assetQuantityUi, assetBank.mintDecimals) },
      [
        ...this.getHealthCheckAccounts([assetBank, liabBank]),
        ...liquidateeMarginfiAccount.getHealthCheckAccounts()
      ]
    );
    return { instructions: [ix], keys: [] };
  }
  async lendingAccountLiquidate(liquidateeMarginfiAccount, assetBank, assetQuantityUi, liabBank) {
    const ixw = await this.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      assetBank,
      assetQuantityUi,
      liabBank
    );
    const tx = new (0, _web3js.Transaction)().add(...ixw.instructions);
    return processTransaction(this.client.provider, tx);
  }
  toString() {
    const { assets, liabilities } = this.getHealthComponents(
      MarginRequirementType.Equity
    );
    let str = `-----------------
  Marginfi account:
    Address: ${this.publicKey.toBase58()}
    Group: ${this.group.publicKey.toBase58()}
    Authority: ${this.authority.toBase58()}
    Equity: ${this.getHealthComponents(
      MarginRequirementType.Equity
    ).assets.toFixed(6)}
    Equity: ${assets.minus(liabilities).toFixed(6)}
    Assets: ${assets.toFixed(6)},
    Liabilities: ${liabilities.toFixed(6)}`;
    const activeLendingAccounts = this.lendingAccount.filter((la) => la.active);
    if (activeLendingAccounts.length > 0) {
      str = str.concat("\n-----------------\nBalances:");
    }
    for (let lendingAccount of activeLendingAccounts) {
      const bank = this._group.getBankByPk(lendingAccount.bankPk);
      if (!bank) {
        console.log(`Bank ${lendingAccount.bankPk} not found`);
        continue;
      }
      const utpStr = `
  Bank ${bank.label}:
      Address: ${bank.publicKey.toBase58()}
      Mint: ${bank.mint.toBase58()}
      Equity: ${lendingAccount.getUsdValue(
        bank,
        MarginRequirementType.Equity
      )}`;
      str = str.concat(utpStr);
    }
    return str;
  }
};
var account_default = MarginfiAccount;
var Balance = class {
  constructor(data) {
    this.active = data.active;
    this.bankPk = data.bankPk;
    this.depositShares = wrappedI80F48toBigNumber(data.depositShares);
    this.liabilityShares = wrappedI80F48toBigNumber(data.liabilityShares);
  }
  static newEmpty(bankPk) {
    return new Balance({
      active: false,
      bankPk,
      depositShares: { value: new (0, _anchor.BN)(0) },
      liabilityShares: { value: new (0, _anchor.BN)(0) }
    });
  }
  getUsdValue(bank, marginReqType) {
    return {
      assets: bank.getAssetUsdValue(
        this.depositShares,
        marginReqType,
        1 /* None */
      ),
      liabilities: bank.getLiabilityUsdValue(
        this.liabilityShares,
        marginReqType,
        1 /* None */
      )
    };
  }
  getUsdValueWithPriceBias(bank, marginReqType) {
    return {
      assets: bank.getAssetUsdValue(
        this.depositShares,
        marginReqType,
        0 /* Lowest */
      ),
      liabilities: bank.getLiabilityUsdValue(
        this.liabilityShares,
        marginReqType,
        2 /* Highest */
      )
    };
  }
  getQuantity(bank) {
    return {
      assets: bank.getAssetQuantity(this.depositShares),
      liabilities: bank.getLiabilityQuantity(this.liabilityShares)
    };
  }
};
var MarginRequirementType = /* @__PURE__ */ ((MarginRequirementType2) => {
  MarginRequirementType2[MarginRequirementType2["Init"] = 0] = "Init";
  MarginRequirementType2[MarginRequirementType2["Maint"] = 1] = "Maint";
  MarginRequirementType2[MarginRequirementType2["Equity"] = 2] = "Equity";
  return MarginRequirementType2;
})(MarginRequirementType || {});

// src/bank.ts

var Bank = class {
  constructor(label, address, rawData, priceData) {
    this.label = label;
    this.publicKey = address;
    this.mint = rawData.mint;
    this.mintDecimals = rawData.mintDecimals;
    this.group = rawData.group;
    this.depositShareValue = wrappedI80F48toBigNumber(
      rawData.depositShareValue
    );
    this.liabilityShareValue = wrappedI80F48toBigNumber(
      rawData.liabilityShareValue
    );
    this.liquidityVault = rawData.liquidityVault;
    this.liquidityVaultBump = rawData.liquidityVaultBump;
    this.liquidityVaultAuthorityBump = rawData.liquidityVaultAuthorityBump;
    this.insuranceVault = rawData.insuranceVault;
    this.insuranceVaultBump = rawData.insuranceVaultBump;
    this.insuranceVaultAuthorityBump = rawData.insuranceVaultAuthorityBump;
    this.feeVault = rawData.feeVault;
    this.feeVaultBump = rawData.feeVaultBump;
    this.feeVaultAuthorityBump = rawData.feeVaultAuthorityBump;
    this.config = {
      depositWeightInit: wrappedI80F48toBigNumber(
        rawData.config.depositWeightInit
      ),
      depositWeightMaint: wrappedI80F48toBigNumber(
        rawData.config.depositWeightMaint
      ),
      liabilityWeightInit: wrappedI80F48toBigNumber(
        rawData.config.liabilityWeightInit
      ),
      liabilityWeightMaint: wrappedI80F48toBigNumber(
        rawData.config.liabilityWeightMaint
      ),
      maxCapacity: nativeToUi(rawData.config.maxCapacity, this.mintDecimals),
      pythOracle: rawData.config.pythOracle,
      interestRateConfig: {
        insuranceFeeFixedApr: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.insuranceFeeFixedApr
        ),
        maxInterestRate: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.maxInterestRate
        ),
        insuranceIrFee: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.insuranceIrFee
        ),
        optimalUtilizationRate: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.optimalUtilizationRate
        ),
        plateauInterestRate: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.optimalUtilizationRate
        ),
        protocolFixedFeeApr: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.protocolFixedFeeApr
        ),
        protocolIrFee: wrappedI80F48toBigNumber(
          rawData.config.interestRateConfig.protocolIrFee
        )
      }
    };
    this.totalDepositShares = wrappedI80F48toBigNumber(
      rawData.totalDepositShares
    );
    this.totalLiabilityShares = wrappedI80F48toBigNumber(
      rawData.totalLiabilityShares
    );
    this.priceData = priceData;
  }
  get totalDeposits() {
    return this.getAssetQuantity(this.totalDepositShares);
  }
  get totalLiabilities() {
    return this.getLiabilityQuantity(this.totalLiabilityShares);
  }
  async reloadPriceData(connection) {
    const pythPriceAccount = await connection.getAccountInfo(
      this.config.pythOracle
    );
    this.priceData = _client.parsePriceData.call(void 0, pythPriceAccount.data);
  }
  getAssetQuantity(depositShares) {
    return depositShares.times(this.depositShareValue);
  }
  getLiabilityQuantity(liabilityShares) {
    return liabilityShares.times(this.liabilityShareValue);
  }
  getAssetShares(depositValue) {
    return depositValue.div(this.depositShareValue);
  }
  getLiabilityShares(liabilityValue) {
    return liabilityValue.div(this.liabilityShareValue);
  }
  getAssetUsdValue(depositShares, marginRequirementType, priceBias) {
    return this.getUsdValue(
      this.getAssetQuantity(depositShares),
      priceBias,
      this.getAssetWeight(marginRequirementType)
    );
  }
  getLiabilityUsdValue(liabilityShares, marginRequirementType, priceBias) {
    return this.getUsdValue(
      this.getLiabilityQuantity(liabilityShares),
      priceBias,
      this.getLiabilityWeight(marginRequirementType)
    );
  }
  getUsdValue(quantity, priceBias, weight) {
    const price = this.getPrice(priceBias);
    return quantity.times(price).times(_nullishCoalesce(weight, () => ( 1))).dividedBy(10 ** this.mintDecimals);
  }
  getPrice(priceBias) {
    const basePrice = this.priceData.emaPrice;
    const confidenceRange = this.priceData.emaConfidence;
    const basePriceVal = new (0, _bignumberjs2.default)(basePrice.value);
    const confidenceRangeVal = new (0, _bignumberjs2.default)(confidenceRange.value).times(
      PYTH_PRICE_CONF_INTERVALS
    );
    switch (priceBias) {
      case PriceBias.Lowest:
        return basePriceVal.minus(confidenceRangeVal);
      case PriceBias.Highest:
        return basePriceVal.plus(confidenceRangeVal);
      case PriceBias.None:
        return basePriceVal;
    }
  }
  getAssetWeight(marginRequirementType) {
    switch (marginRequirementType) {
      case 0 /* Init */:
        return this.config.depositWeightInit;
      case 1 /* Maint */:
        return this.config.depositWeightMaint;
      case 2 /* Equity */:
        return new (0, _bignumberjs2.default)(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }
  getLiabilityWeight(marginRequirementType) {
    switch (marginRequirementType) {
      case 0 /* Init */:
        return this.config.liabilityWeightInit;
      case 1 /* Maint */:
        return this.config.liabilityWeightMaint;
      case 2 /* Equity */:
        return new (0, _bignumberjs2.default)(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }
  getQuantityFromUsdValue(usdValue, priceBias) {
    const price = this.getPrice(priceBias);
    return usdValue.div(price);
  }
  getInterestRates() {
    const {
      insuranceFeeFixedApr,
      insuranceIrFee,
      protocolFixedFeeApr,
      protocolIrFee
    } = this.config.interestRateConfig;
    const rateFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
    const fixedFee = insuranceIrFee.plus(protocolIrFee);
    const interestRate = this.interestRateCurve();
    const utilizationRate = this.getUtilizationRate();
    const lendingRate = interestRate.times(utilizationRate);
    const borrowingRate = interestRate.times(new (0, _bignumberjs2.default)(1).plus(rateFee)).plus(fixedFee);
    return { lendingRate, borrowingRate };
  }
  interestRateCurve() {
    const { optimalUtilizationRate, plateauInterestRate, maxInterestRate } = this.config.interestRateConfig;
    const utilizationRate = this.getUtilizationRate();
    if (utilizationRate.lte(optimalUtilizationRate)) {
      return utilizationRate.times(maxInterestRate).div(optimalUtilizationRate);
    } else {
      return utilizationRate.minus(optimalUtilizationRate).div(new (0, _bignumberjs2.default)(1).minus(optimalUtilizationRate)).times(maxInterestRate.minus(plateauInterestRate)).plus(plateauInterestRate);
    }
  }
  getUtilizationRate() {
    return this.totalLiabilities.div(this.totalDeposits);
  }
};
var bank_default = Bank;
var PriceBias = /* @__PURE__ */ ((PriceBias2) => {
  PriceBias2[PriceBias2["Lowest"] = 0] = "Lowest";
  PriceBias2[PriceBias2["None"] = 1] = "None";
  PriceBias2[PriceBias2["Highest"] = 2] = "Highest";
  return PriceBias2;
})(PriceBias || {});

// src/group.ts
var MarginfiGroup = class {
  constructor(config, program, rawData, banks) {
    this.publicKey = config.groupPk;
    this._config = config;
    this._program = program;
    this._admin = rawData.admin;
    this._banks = banks.reduce((acc, current) => {
      acc.set(current.publicKey.toBase58(), current);
      return acc;
    }, /* @__PURE__ */ new Map());
  }
  get admin() {
    return this._admin;
  }
  get banks() {
    return this._banks;
  }
  static async fetch(config, program, commitment) {
    const debug = require_src()(`mfi:margin-group`);
    debug("Loading Marginfi Group %s", config.groupPk);
    const accountData = await MarginfiGroup._fetchAccountData(
      config,
      program,
      commitment
    );
    const bankAddresses = config.banks.map((b) => b.address);
    let bankAccountsData = await program.account.bank.fetchMultiple(
      bankAddresses,
      commitment
    );
    let nullAccounts = [];
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] === null)
        nullAccounts.push(bankAddresses[i]);
    }
    if (nullAccounts.length > 0) {
      throw Error(`Failed to fetch banks ${nullAccounts}`);
    }
    const pythAccounts = await program.provider.connection.getMultipleAccountsInfo(
      bankAccountsData.map((b) => b.config.pythOracle)
    );
    const banks = bankAccountsData.map(
      (bd, index) => new bank_default(
        config.banks[index].label,
        bankAddresses[index],
        bd,
        _client.parsePriceData.call(void 0, pythAccounts[index].data)
      )
    );
    return new MarginfiGroup(config, program, accountData, banks);
  }
  static fromAccountData(config, program, accountData, banks) {
    return new MarginfiGroup(config, program, accountData, banks);
  }
  static fromAccountDataRaw(config, program, rawData, banks) {
    const data = MarginfiGroup.decode(rawData);
    return MarginfiGroup.fromAccountData(config, program, data, banks);
  }
  static async _fetchAccountData(config, program, commitment) {
    const mergedCommitment = _nullishCoalesce(_nullishCoalesce(commitment, () => ( program.provider.connection.commitment)), () => ( DEFAULT_COMMITMENT));
    const data = await program.account.marginfiGroup.fetch(
      config.groupPk,
      mergedCommitment
    );
    return data;
  }
  static decode(encoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return coder.accounts.decode("marginfiGroup" /* MarginfiGroup */, encoded);
  }
  static async encode(decoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return await coder.accounts.encode("marginfiGroup" /* MarginfiGroup */, decoded);
  }
  async reload(commitment) {
    const data = await MarginfiGroup._fetchAccountData(
      this._config,
      this._program,
      commitment
    );
  }
  getBankByLabel(label) {
    return _nullishCoalesce([...this._banks.values()].find((bank) => bank.label === label), () => ( null));
  }
  getBankByPk(publicKey) {
    let _publicKey = _anchor.translateAddress.call(void 0, publicKey);
    return _nullishCoalesce(this._banks.get(_publicKey.toString()), () => ( null));
  }
};
var group_default = MarginfiGroup;

// src/client.ts
var MarginfiClient2 = class {
  constructor(config, program, wallet, group) {
    this.config = config;
    this.program = program;
    this.wallet = wallet;
    this.programId = config.programId;
    this._group = group;
  }
  static async fetch(config, wallet, connection, opts) {
    const debug = require_src()("mfi:client");
    debug(
      "Loading Marginfi Client\n	program: %s\n	env: %s\n	group: %s\n	url: %s",
      config.programId,
      config.environment,
      config.groupPk,
      connection.rpcEndpoint
    );
    const provider = new (0, _anchor.AnchorProvider)(connection, wallet, {
      ..._anchor.AnchorProvider.defaultOptions(),
      commitment: _nullishCoalesce(connection.commitment, () => ( _anchor.AnchorProvider.defaultOptions().commitment)),
      ...opts
    });
    const program = new (0, _anchor.Program)(
      IDL,
      config.programId,
      provider
    );
    return new MarginfiClient2(
      config,
      program,
      wallet,
      await group_default.fetch(config, program, _optionalChain([opts, 'optionalAccess', _6 => _6.commitment]))
    );
  }
  static async fromEnv(overrides) {
    const debug = require_src()("mfi:client");
    const env = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _7 => _7.env]), () => ( process.env.MARGINFI_ENV));
    const connection = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _8 => _8.connection]), () => ( new (0, _web3js.Connection)(process.env.MARGINFI_RPC_ENDPOINT, {
      commitment: DEFAULT_COMMITMENT
    })));
    const programId = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _9 => _9.programId]), () => ( new (0, _web3js.PublicKey)(process.env.MARGINFI_PROGRAM)));
    const groupPk = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _10 => _10.marginfiGroup]), () => ( (process.env.MARGINFI_GROUP ? new (0, _web3js.PublicKey)(process.env.MARGINFI_GROUP) : _web3js.PublicKey.default)));
    const wallet = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _11 => _11.wallet]), () => ( new NodeWallet(
      process.env.MARGINFI_WALLET_KEY ? _web3js.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(process.env.MARGINFI_WALLET_KEY))
      ) : loadKeypair(process.env.MARGINFI_WALLET)
    )));
    debug("Loading the marginfi client from env vars");
    debug(
      "Env: %s\nProgram: %s\nGroup: %s\nSigner: %s",
      env,
      programId,
      groupPk,
      wallet.publicKey
    );
    const config = await getConfig(env, {
      groupPk: _anchor.translateAddress.call(void 0, groupPk),
      programId: _anchor.translateAddress.call(void 0, programId)
    });
    return MarginfiClient2.fetch(config, wallet, connection, {
      commitment: connection.commitment
    });
  }
  get group() {
    return this._group;
  }
  get provider() {
    return this.program.provider;
  }
  async makeCreateMarginfiAccountIx(marginfiAccountKeypair) {
    const dbg = require_src()("mfi:client");
    const accountKeypair = marginfiAccountKeypair || _web3js.Keypair.generate();
    dbg("Generating marginfi account ix for %s", accountKeypair.publicKey);
    const initMarginfiAccountIx = await instructions_default.makeInitMarginfiAccountIx(
      this.program,
      {
        marginfiGroupPk: this._group.publicKey,
        marginfiAccountPk: accountKeypair.publicKey,
        signerPk: this.provider.wallet.publicKey
      }
    );
    const ixs = [initMarginfiAccountIx];
    return {
      instructions: ixs,
      keys: [accountKeypair]
    };
  }
  async createMarginfiAccount(opts) {
    const dbg = require_src()("mfi:client");
    const accountKeypair = _web3js.Keypair.generate();
    const ixs = await this.makeCreateMarginfiAccountIx(accountKeypair);
    const tx = new (0, _web3js.Transaction)().add(...ixs.instructions);
    const sig = await this.processTransaction(tx, ixs.keys, opts);
    dbg("Created Marginfi account %s", sig);
    return _optionalChain([opts, 'optionalAccess', _12 => _12.dryRun]) ? Promise.resolve(void 0) : account_default.fetch(accountKeypair.publicKey, this, _optionalChain([opts, 'optionalAccess', _13 => _13.commitment]));
  }
  async getAllMarginfiAccountAddresses() {
    return (await this.program.provider.connection.getProgramAccounts(
      this.programId,
      {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0
        },
        filters: [
          {
            memcmp: {
              bytes: this._group.publicKey.toBase58(),
              offset: 8 + 32
            }
          },
          {
            memcmp: {
              offset: 0,
              bytes: _bytes.bs58.encode(
                _anchor.BorshAccountsCoder.accountDiscriminator(
                  "marginfiAccount" /* MarginfiAccount */
                )
              )
            }
          }
        ]
      }
    )).map((a) => a.pubkey);
  }
  async getMarginfiAccountsForAuthority(authority) {
    const marginfiGroup = await group_default.fetch(this.config, this.program);
    const _authority = authority ? _anchor.translateAddress.call(void 0, authority) : this.provider.wallet.publicKey;
    console.log("fetching accounts for ", _authority.toBase58());
    return (await this.program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: this._group.publicKey.toBase58(),
          offset: 8
        }
      },
      {
        memcmp: {
          bytes: _authority.toBase58(),
          offset: 8 + 32
        }
      }
    ])).map(
      (a) => account_default.fromAccountData(
        a.publicKey,
        this,
        a.account,
        marginfiGroup
      )
    );
  }
  async getAllProgramAccountAddresses(type) {
    return (await this.program.provider.connection.getProgramAccounts(
      this.programId,
      {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: _bytes.bs58.encode(
                _anchor.BorshAccountsCoder.accountDiscriminator(type)
              )
            }
          }
        ]
      }
    )).map((a) => a.pubkey);
  }
  async processTransaction(transaction, signers, opts) {
    let signature = "";
    try {
      const connection = new (0, _web3js.Connection)(
        this.provider.connection.rpcEndpoint,
        this.provider.opts
      );
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
      } = await connection.getLatestBlockhashAndContext();
      const versionedMessage = new (0, _web3js.TransactionMessage)({
        instructions: transaction.instructions,
        payerKey: this.provider.publicKey,
        recentBlockhash: blockhash
      });
      const versionedTransaction = new (0, _web3js.VersionedTransaction)(
        versionedMessage.compileToV0Message([])
      );
      await this.wallet.signTransaction(versionedTransaction);
      if (signers)
        versionedTransaction.sign(signers);
      if (_optionalChain([opts, 'optionalAccess', _14 => _14.dryRun])) {
        const response = await connection.simulateTransaction(
          versionedTransaction,
          _nullishCoalesce(opts, () => ( { minContextSlot, sigVerify: false }))
        );
        console.log(
          response.value.err ? `\u274C Error: ${response.value.err}` : `\u2705 Success - ${response.value.unitsConsumed} CU`
        );
        console.log("------ Logs \u{1F447} ------");
        console.log(response.value.logs);
        const signaturesEncoded = encodeURIComponent(
          JSON.stringify(
            versionedTransaction.signatures.map((s) => _bytes.bs58.encode(s))
          )
        );
        const messageEncoded = encodeURIComponent(
          Buffer.from(versionedTransaction.message.serialize()).toString(
            "base64"
          )
        );
        console.log(
          Buffer.from(versionedTransaction.message.serialize()).toString(
            "base64"
          )
        );
        const urlEscaped = `https://explorer.solana.com/tx/inspector?cluster=${this.config.cluster}&signatures=${signaturesEncoded}&message=${messageEncoded}`;
        console.log("------ Inspect \u{1F447} ------");
        console.log(urlEscaped);
        return versionedTransaction.signatures[0].toString();
      } else {
        let mergedOpts = {
          ...DEFAULT_CONFIRM_OPTS,
          commitment: _nullishCoalesce(connection.commitment, () => ( DEFAULT_CONFIRM_OPTS.commitment)),
          preflightCommitment: _nullishCoalesce(connection.commitment, () => ( DEFAULT_CONFIRM_OPTS.commitment)),
          minContextSlot,
          ...opts
        };
        signature = await connection.sendTransaction(
          versionedTransaction,
          mergedOpts
        );
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature
          },
          mergedOpts.commitment
        );
        return signature;
      }
    } catch (error) {
      throw `Transaction failed! ${_optionalChain([error, 'optionalAccess', _15 => _15.message])}`;
    }
  }
};
var client_default = MarginfiClient2;

// src/clientReadonly.ts













// src/accountReadonly.ts



var MarginfiAccountReadonly = class {
  constructor(marginfiAccountPk, client, group, rawData) {
    this.client = client;
    this.publicKey = marginfiAccountPk;
    this._group = group;
    this._authority = rawData.authority;
    this._lendingAccount = rawData.lendingAccount.balances.filter((la) => la.active).map((la) => new Balance(la));
  }
  get authority() {
    return this._authority;
  }
  get group() {
    return this._group;
  }
  get lendingAccount() {
    return this._lendingAccount;
  }
  get _program() {
    return this.client.program;
  }
  get _config() {
    return this.client.config;
  }
  static async fetch(marginfiAccountPk, client, commitment) {
    const { config, program } = client;
    const _marginfiAccountPk = _anchor.translateAddress.call(void 0, marginfiAccountPk);
    const accountData = await MarginfiAccountReadonly._fetchAccountData(
      _marginfiAccountPk,
      config,
      program,
      commitment
    );
    const marginfiAccount = new MarginfiAccountReadonly(
      _marginfiAccountPk,
      client,
      await group_default.fetch(config, program, commitment),
      accountData
    );
    require_src()("mfi:margin-account")(
      "Loaded marginfi account %s",
      _marginfiAccountPk
    );
    return marginfiAccount;
  }
  static fromAccountData(marginfiAccountPk, client, accountData, marginfiGroup) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );
    const _marginfiAccountPk = _anchor.translateAddress.call(void 0, marginfiAccountPk);
    return new MarginfiAccountReadonly(
      _marginfiAccountPk,
      client,
      marginfiGroup,
      accountData
    );
  }
  static fromAccountDataRaw(marginfiAccountPk, client, marginfiAccountRawData, marginfiGroup) {
    const marginfiAccountData = MarginfiAccountReadonly.decode(
      marginfiAccountRawData
    );
    return MarginfiAccountReadonly.fromAccountData(
      marginfiAccountPk,
      client,
      marginfiAccountData,
      marginfiGroup
    );
  }
  static async _fetchAccountData(accountAddress, config, program, commitment) {
    const mergedCommitment = _nullishCoalesce(_nullishCoalesce(commitment, () => ( program.provider.connection.commitment)), () => ( DEFAULT_COMMITMENT));
    const data = await program.account.marginfiAccount.fetch(
      accountAddress,
      mergedCommitment
    );
    if (!data.group.equals(config.groupPk))
      throw Error(
        `Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`
      );
    return data;
  }
  static decode(encoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return coder.accounts.decode("marginfiAccount" /* MarginfiAccount */, encoded);
  }
  static async encode(decoded) {
    const coder = new (0, _anchor.BorshCoder)(IDL);
    return await coder.accounts.encode("marginfiAccount" /* MarginfiAccount */, decoded);
  }
  async reload() {
    require_src()(`mfi:margin-account:${this.publicKey.toString()}:loader`)(
      "Reloading account data"
    );
    const [marginfiGroupAi, marginfiAccountAi] = await this.loadGroupAndAccountAi();
    const marginfiAccountData = MarginfiAccountReadonly.decode(
      marginfiAccountAi.data
    );
    if (!marginfiAccountData.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );
    const bankAddresses = this._config.banks.map((b) => b.address);
    let bankAccountsData = await this._program.account.bank.fetchMultiple(
      bankAddresses
    );
    let nullAccounts = [];
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] === null)
        nullAccounts.push(bankAddresses[i]);
    }
    if (nullAccounts.length > 0) {
      throw Error(`Failed to fetch banks ${nullAccounts}`);
    }
    const pythAccounts = await this._program.provider.connection.getMultipleAccountsInfo(
      bankAccountsData.map((b) => b.config.pythOracle)
    );
    const banks = bankAccountsData.map(
      (bd, index) => new bank_default(
        this._config.banks[index].label,
        bankAddresses[index],
        bd,
        _client.parsePriceData.call(void 0, pythAccounts[index].data)
      )
    );
    this._group = group_default.fromAccountDataRaw(
      this._config,
      this._program,
      marginfiGroupAi.data,
      banks
    );
    this._updateFromAccountData(marginfiAccountData);
  }
  _updateFromAccountData(data) {
    this._authority = data.authority;
    this._lendingAccount = data.lendingAccount.balances.filter((la) => la.active).map((la) => new Balance(la));
  }
  async loadGroupAndAccountAi() {
    const debug = require_src()(
      `mfi:margin-account:${this.publicKey.toString()}:loader`
    );
    debug(
      "Loading marginfi account %s, and group %s",
      this.publicKey,
      this._config.groupPk
    );
    let [marginfiGroupAi, marginfiAccountAi] = await this.client.provider.connection.getMultipleAccountsInfo(
      [this._config.groupPk, this.publicKey],
      DEFAULT_COMMITMENT
    );
    if (!marginfiAccountAi) {
      throw Error("Marginfi account no found");
    }
    if (!marginfiGroupAi) {
      throw Error("Marginfi Group Account no found");
    }
    return [marginfiGroupAi, marginfiAccountAi];
  }
  getHealthComponents(marginReqType) {
    const [assets, liabilities] = this._lendingAccount.map((accountBalance) => {
      const bank = this._group.banks.get(accountBalance.bankPk.toBase58());
      if (!bank)
        throw Error(
          `Bank ${shortenAddress(accountBalance.bankPk)} not found`
        );
      const { assets: assets2, liabilities: liabilities2 } = accountBalance.getUsdValueWithPriceBias(
        bank,
        marginReqType
      );
      return [assets2, liabilities2];
    }).reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new (0, _bignumberjs2.default)(0), new (0, _bignumberjs2.default)(0)]
    );
    return { assets, liabilities };
  }
  canBeLiquidated() {
    const { assets, liabilities } = this.getHealthComponents(
      1 /* Maint */
    );
    return assets < liabilities;
  }
  getMaxWithdrawForBank(bank) {
    return new (0, _bignumberjs2.default)(0);
  }
};
var accountReadonly_default = MarginfiAccountReadonly;

// src/clientReadonly.ts
var MarginfiClientReadonly = class {
  constructor(config, program, group) {
    this.config = config;
    this.program = program;
    this.programId = config.programId;
    this._group = group;
  }
  static async fetch(config, connection, opts) {
    const debug = require_src()("mfi:client");
    debug(
      "Loading Marginfi Client\n	program: %s\n	env: %s\n	group: %s\n	url: %s",
      config.programId,
      config.environment,
      config.groupPk,
      connection.rpcEndpoint
    );
    const provider = new (0, _anchor.AnchorProvider)(connection, {}, {
      ..._anchor.AnchorProvider.defaultOptions(),
      commitment: _nullishCoalesce(connection.commitment, () => ( _anchor.AnchorProvider.defaultOptions().commitment)),
      ...opts
    });
    const program = new (0, _anchor.Program)(
      IDL,
      config.programId,
      provider
    );
    return new MarginfiClientReadonly(
      config,
      program,
      await group_default.fetch(config, program, _optionalChain([opts, 'optionalAccess', _16 => _16.commitment]))
    );
  }
  static async fromEnv(overrides) {
    const debug = require_src()("mfi:client");
    const env = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _17 => _17.env]), () => ( process.env.MARGINFI_ENV));
    const connection = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _18 => _18.connection]), () => ( new (0, _web3js.Connection)(process.env.MARGINFI_RPC_ENDPOINT, {
      commitment: DEFAULT_COMMITMENT
    })));
    const programId = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _19 => _19.programId]), () => ( new (0, _web3js.PublicKey)(process.env.MARGINFI_PROGRAM)));
    const groupPk = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _20 => _20.marginfiGroup]), () => ( (process.env.MARGINFI_GROUP ? new (0, _web3js.PublicKey)(process.env.MARGINFI_GROUP) : _web3js.PublicKey.default)));
    debug("Loading the marginfi client from env vars");
    debug("Env: %s\nProgram: %s\nGroup: %s", env, programId, groupPk);
    const config = await getConfig(env, {
      groupPk: _anchor.translateAddress.call(void 0, groupPk),
      programId: _anchor.translateAddress.call(void 0, programId)
    });
    return MarginfiClientReadonly.fetch(config, connection, {
      commitment: connection.commitment
    });
  }
  get group() {
    return this._group;
  }
  get provider() {
    return this.program.provider;
  }
  async makeCreateMarginfiAccountIx(marginfiAccountKeypair) {
    const dbg = require_src()("mfi:client");
    const accountKeypair = marginfiAccountKeypair || _web3js.Keypair.generate();
    dbg("Generating marginfi account ix for %s", accountKeypair.publicKey);
    const initMarginfiAccountIx = await instructions_default.makeInitMarginfiAccountIx(
      this.program,
      {
        marginfiGroupPk: this._group.publicKey,
        marginfiAccountPk: accountKeypair.publicKey,
        signerPk: this.provider.wallet.publicKey
      }
    );
    const ixs = [initMarginfiAccountIx];
    return {
      instructions: ixs,
      keys: [accountKeypair]
    };
  }
  async getAllMarginfiAccountAddresses() {
    return (await this.program.provider.connection.getProgramAccounts(
      this.programId,
      {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0
        },
        filters: [
          {
            memcmp: {
              bytes: this._group.publicKey.toBase58(),
              offset: 8 + 32
            }
          },
          {
            memcmp: {
              offset: 0,
              bytes: _bytes.bs58.encode(
                _anchor.BorshAccountsCoder.accountDiscriminator(
                  "marginfiAccount" /* MarginfiAccount */
                )
              )
            }
          }
        ]
      }
    )).map((a) => a.pubkey);
  }
  async getMarginfiAccountsForAuthority(authority) {
    const marginfiGroup = await group_default.fetch(this.config, this.program);
    const _authority = _anchor.translateAddress.call(void 0, authority);
    return (await this.program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: _authority.toBase58(),
          offset: 8
        }
      },
      {
        memcmp: {
          bytes: this._group.publicKey.toBase58(),
          offset: 8 + 32
        }
      }
    ])).map(
      (a) => accountReadonly_default.fromAccountData(
        a.publicKey,
        this,
        a.account,
        marginfiGroup
      )
    );
  }
  async getAllProgramAccountAddresses(type) {
    return (await this.program.provider.connection.getProgramAccounts(
      this.programId,
      {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: _bytes.bs58.encode(
                _anchor.BorshAccountsCoder.accountDiscriminator(type)
              )
            }
          }
        ]
      }
    )).map((a) => a.pubkey);
  }
};
var clientReadonly_default = MarginfiClientReadonly;






























exports.AccountType = AccountType; exports.BankVaultType = BankVaultType; exports.DEFAULT_COMMITMENT = DEFAULT_COMMITMENT; exports.DEFAULT_CONFIRM_OPTS = DEFAULT_CONFIRM_OPTS; exports.DEFAULT_SEND_OPTS = DEFAULT_SEND_OPTS; exports.MARGINFI_IDL = IDL; exports.MarginfiClient = client_default; exports.MarginfiGroup = group_default; exports.MarginfiReadonlyClient = clientReadonly_default; exports.NodeWallet = NodeWallet; exports.PDA_BANK_FEE_VAULT_AUTH_SEED = PDA_BANK_FEE_VAULT_AUTH_SEED; exports.PDA_BANK_FEE_VAULT_SEED = PDA_BANK_FEE_VAULT_SEED; exports.PDA_BANK_INSURANCE_VAULT_AUTH_SEED = PDA_BANK_INSURANCE_VAULT_AUTH_SEED; exports.PDA_BANK_INSURANCE_VAULT_SEED = PDA_BANK_INSURANCE_VAULT_SEED; exports.PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED = PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED; exports.PDA_BANK_LIQUIDITY_VAULT_SEED = PDA_BANK_LIQUIDITY_VAULT_SEED; exports.PYTH_PRICE_CONF_INTERVALS = PYTH_PRICE_CONF_INTERVALS; exports.USDC_DECIMALS = USDC_DECIMALS; exports.getBankVaultAuthority = getBankVaultAuthority; exports.getConfig = getConfig; exports.loadKeypair = loadKeypair; exports.nativeToUi = nativeToUi; exports.processTransaction = processTransaction; exports.shortenAddress = shortenAddress; exports.sleep = sleep; exports.toBigNumber = toBigNumber; exports.toNumber = toNumber; exports.uiToNative = uiToNative; exports.wrappedI80F48toBigNumber = wrappedI80F48toBigNumber;
//# sourceMappingURL=index.js.map