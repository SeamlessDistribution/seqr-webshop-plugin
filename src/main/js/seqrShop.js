/**
 * SEQR Plugin Injector
 * User: erik.hedenstrom@seamless.se
 * Date: 2014-06-10
 * Time: 16:11
 */

if (!window.console) {
    window.console = {
        log: function (msg) {
        }
    };
}

(function () {

    var baseURL = "";
    var args = {};
    var cache = {};
    var intervalID;

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

    function initHttpRequest(url, successCallback, errorCallback) {
        var xmlhttp;
        
        if ("XMLHttpRequest" in window) {
            if ("XDomainRequest" in window && navigator.appVersion.match(/MSIE [98]/)) {
                xmlhttp = new XDomainRequest();  // IE8,9
                xmlhttp.onload = function () {
                    successCallback(xmlhttp.responseText);
                }
                xmlhttp.onerror = function() {
                    errorCallback(url, xmlhttp.responseText);
                }
                return xmlhttp;

            } else {
               xmlhttp = new XMLHttpRequest();
            }
        } else { // IE6
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
        return xmlhttp;
    }

    function get(url, successCallback, errorCallback) {
        var xmlhttp = initHttpRequest(url, successCallback, errorCallback);
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function parseScriptArgs() {
        var scriptURL = document.getElementById("seqrShop").src;
        baseURL = scriptURL.substring(0, scriptURL.indexOf('/js/seqrShop.js'));
        args['baseURL'] = baseURL;
        var scriptBody = document.getElementById("seqrShop").text.replace(/^\s+|\s+$/gm, '');
        if (scriptBody != '') {
            try {
                args = merge(args, JSON.parse(scriptBody));
            } catch (e) {
                console.log(e);
            }
        }
        var hashes = scriptURL.slice(scriptURL.indexOf('#!') + 2).split('&');
        for (var i = 0; hashes.length > i; i++) {
            var tuple = hashes[i].split('=');
            if (tuple.length == 2) {
                args[tuple[0]] = decodeURIComponent(tuple[1]);
            }
        }
    }

    function detectPlatform() {
        if (isMobile.Android() || isMobile.iOS() || isMobile.Windows()) {
            return 'mobile';
        } else if (isMobile.BlackBerry() || isMobile.Opera()) {
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

    function getIntArg(propertyName, defaultValue) {
        var data = getArg(propertyName, defaultValue);
        if (typeof data === 'number' && (data % 1) === 0) {
            return data;
        } else {
            return parseInt(data);
        }
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

    function callDocumentCallback(data) {
        if (args.hasOwnProperty('statusCallback')) {
            var callback = getArg('statusCallback');
            if (window.hasOwnProperty(callback)) {
                window[callback](data);
            } else {
                console.log(callbackName + ' is undefined.');
            }
        }
    }

    function updateStatus(data) {
        if (data.status && args['SEQR_STATUS'] != data.status) {
            document.getElementById("seqr-container").className += ' seqr-status-' + data.status.toLowerCase();
            args['SEQR_STATUS'] = data.status;
            callDocumentCallback(data);
        }
    }

    function pollInvoiceStatus() {
        if (args.hasOwnProperty('statusURL')) {
            get(args['statusURL'], function (json) {
                var data = JSON.parse(json);
                updateStatus(data);
                if (data.status != 'ISSUED') {
                    window.clearInterval(intervalID);
                }
            }, function (url, status) {
                if (status == 404) {
                    console.log(status + ' loading ' + url + ', giving up.');
                    window.clearInterval(intervalID);
                } else {
                    console.log(status + ' loading ' + url + ', retrying.');
                }
            });
        }
    }

    function initialize() {

        parseScriptArgs();

        var platform = getArg('platform', detectPlatform());
        var language = getArg('language', detectBrowserLanguage());
        var protocolSuffix = getArg('mode', '').toUpperCase();
        if (protocolSuffix != '') {
            protocolSuffix = '-' + protocolSuffix;
        }

        args['platform'] = platform;
        args['language'] = language;
        args['pollFreq'] = getIntArg('pollFreq', 1000);
        args['SEQR_STATUS'] = 'INIT';

        if (args.hasOwnProperty('invoiceQRCode')) {

            args['invoiceQRCode'] = getArg('invoiceQRCode', 'HTTP://SEQR.SE');
            args['seqrQRCode'] = encodeURIComponent(getArg('invoiceQRCode');
            args['seqrLink'] = args['invoiceQRCode'].replace(/HTTP:\/\//g, "SEQR" + protocolSuffix + "://");

            var injectCSS = function (css) {
                var style = document.createElement('style');
                style.type = 'text/css';
                if (style.styleSheet) {
                    style.styleSheet.cssText = css;
                } else {
                    style.innerHTML = css;
                }
                document.getElementsByTagName('head')[0].appendChild(style);
            };

            if (getArg('injectCSS', 'true') == 'true') {
                get(baseURL + '/css/seqrShop.css', injectCSS);
            }

            var injectTemplate = function (json) {
                args['text'] = JSON.parse(json);
                if (args.hasOwnProperty('invoiceQRCode')) {
                    get(baseURL + '/templates/seqrShop.html', function (template) {
                        document.getElementById('seqrShop').outerHTML = renderTemplate(template, args);
                        intervalID = window.setInterval(pollInvoiceStatus, getArg('pollFreq'));
                    });
                }
            };

            get(baseURL + '/lang/' + language + '.json', injectTemplate, function error(url, status) {
                console.log(status + ' loading' + url + ', reverting to default language.');
                get(baseURL + '/lang/en.json', injectTemplate);
            });

        }

    }

    initialize();

}).call();
