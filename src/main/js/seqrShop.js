/**
 * SEQR Webshop Injector
 * User: erik.hedenstrom@seamless.e
 * Date: 2013-11-21
 * Time: 21:43
 */

if (!window.console) {
    window.console = {
        log: function () {
        }
    };
}

(function () {

    var baseURL = "";
    var args = {};
    var cache = {};

    var isMobile = {
        Android: function () {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function () {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function () {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function () {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function () {
            return navigator.userAgent.match(/IEMobile/i);
        }
    };

    function compileTemplate(str) {
        var strFunc =
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
                "with(obj){p.push('" +
                str.replace(/[\r\t\n]/g, " ")
                    .replace(/'(?=[^%]*%>)/g, "\t")
                    .split("'").join("\\'")
                    .split("\t").join("'")
                    .replace(/<%=(.+?)%>/g, "',$1,'")
                    .split("<%").join("');")
                    .split("%>").join("p.push('")
                + "');}return p.join('');";
        return new Function("obj", strFunc);
    }

    function renderTemplate(str, data) {
        try {
            var func = cache[str];
            if (!func) {
                func = compileTemplate(str);
                cache[str] = func;
            }
            return func(data);
        } catch (e) {
            return "< % ERROR: " + e.message + " % >";
        }
    }

    function load(url, successCallback, errorCallback) {
        var xmlhttp;
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                successCallback(xmlhttp.responseText);
            }
            if (xmlhttp.readyState == 4 && xmlhttp.status >= 400 && errorCallback) {
                errorCallback(url, xmlhttp.status);
            }
        }
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function parseHashBangArgs() {
        var scriptURL = document.getElementById("seqrShop").src;
        baseURL = scriptURL.substring(0, scriptURL.indexOf('/js/seqrShop.js'));
        args['baseURL'] = baseURL;
        var hashes = scriptURL.slice(scriptURL.indexOf('#!') + 2).split('&');
        for (var i in hashes) {
            var tuple = hashes[i].split('=');
            if (tuple.length == 2) {
                args[tuple[0]] = tuple[1];
            }
        }
    }

    function detectPlatform() {
        if (isMobile.Android() || isMobile.iOS()) {
            return 'mobile';
        } else if (isMobile.BlackBerry() || isMobile.Opera() || isMobile.Windows()) {
            return 'unsupported';
        } else {
            return 'desktop';
        }
    }

    function detectBrowserLanguage() {
        var lang = navigator.language || navigator.userLanguage;
        lang = lang.replace(/_/, '-').toLowerCase();
        return lang.split('-')[0];
    }

    function getArg(propertyName, defaultValue) {
        return args.hasOwnProperty(propertyName) ? args[propertyName] : defaultValue;
    }

    function merge(obj1, obj2) {
        var obj3 = {};
        for (var n1 in obj1) obj3[n1] = obj1[n1];
        for (var n2 in obj2) obj3[n2] = obj2[n2];
        return obj3;
    }

    function initialize() {

        parseHashBangArgs();

        var platform = getArg("platform", detectPlatform());
        var language = getArg("language", detectBrowserLanguage());
        var layout = getArg("layout", "small");

        args["platform"] = platform;
        args["language"] = language;
        args["layout"] = layout;

        var injectCSS = function (template) {
            var css = renderTemplate(template, args);
            var style = document.createElement('style');
            style.type = 'text/css';
            if (style.styleSheet) {
                style.styleSheet.cssText = css;
            } else {
                style.innerHTML = css;
            }
            document.getElementsByTagName("head")[0].appendChild(style);
        }

        load(baseURL + "/css/" + layout + "_" + platform + ".css", injectCSS);

        var injectTemplate = function (json) {
            var data = JSON.parse(json);
            load(baseURL + "/templates/" + layout + "_" + platform + ".html", function (template) {
                var html = renderTemplate(template, merge(args, data));
                document.getElementById('seqrShop').outerHTML = html;
            });
        }

        load(baseURL + "/lang/" + language + ".json", injectTemplate, function error(url, status) {
            console.log(status+" loading"+url+", reverting to 'en' language.");
            load(baseURL + "/lang/en.json", injectTemplate);
        });
    }

    initialize();

}).call();