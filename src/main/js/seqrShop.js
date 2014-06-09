/**
 * SEQR Webshop Injector
 * User: erik.hedenstrom@seamless.e
 * Date: 2013-11-21
 * Time: 21:43
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

    function initHttpRequest(successCallback, errorCallback) {
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
        return xmlhttp;
    }

    function get(url, successCallback, errorCallback) {
        var xmlhttp = initHttpRequest(successCallback, errorCallback);
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    function post(url, data, successCallback, errorCallback) {
        var json = JSON.stringify(data);
        var xmlhttp = initHttpRequest(successCallback, errorCallback);
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/json");
        xmlhttp.send(json);
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
        for (var i in hashes) {
            var tuple = hashes[i].split('=');
            if (tuple.length == 2) {
                args[tuple[0]] = tuple[1];
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

    function setVisibility(clazz, visible) {
        var elems = document.getElementsByClassName(clazz);
        for (var i = 0; i != elems.length; ++i) {
            elems[i].style.visibility = visible ? 'visible' : 'hidden';
        }
    }

    function callDocumentCallback(callbackName, data) {
        if (args.hasOwnProperty(callbackName)) {
            var callback = getArg(callbackName);
            if (window.hasOwnProperty(callback)) {
                window[callback](data);
            } else {
                console.log(callbackName + ' is undefined.');
            }
        }
    }

    function updateStatus(data) {
        if (data.status && args['SEQR_STATUS'] != data.status) {
            callDocumentCallback(data.status.toLowerCase() + 'Callback', data);
            args['SEQR_STATUS'] = data.status;
            setVisibility('SEQR_STATUS', false);
            setVisibility('SEQR_STATUS_' + data.status.toUpperCase(), true);
        }
    }

    function checkInvoiceStatus() {
        if (args.hasOwnProperty('apiURL') && args.hasOwnProperty('invoiceReference')) {
            get(args['apiURL'] + '/getPaymentStatus.php?invoiceReference=' + args['invoiceReference'], function (json) {
                updateStatus(JSON.parse(json));
            }, function (url, status) {
                if (status == 404) {
                    console.log(status + ' loading ' + url + ', giving up.');
                } else {
                    console.log(status + ' loading ' + url + ', retrying.');
                    window.setTimeout(checkInvoiceStatus, getArg('pollFreq'));
                }
            });
        }
    }

    function pollInvoiceStatus() {
        if (args.hasOwnProperty('apiURL') && args.hasOwnProperty('invoiceReference')) {
            get(args['apiURL'] + '/getPaymentStatus.php?invoiceReference=' + args['invoiceReference'], function (json) {
                var data = JSON.parse(json);
                updateStatus(data);
                if (data.status == 'ISSUED') {
                    window.setTimeout(pollInvoiceStatus, getArg('pollFreq'));
                }
            }, function (url, status) {
                if (status == 404) {
                    console.log(status + ' loading ' + url + ', giving up.');
                } else {
                    console.log(status + ' loading ' + url + ', retrying.');
                    window.setTimeout(pollInvoiceStatus, getArg('pollFreq'));
                }
            });
        }
    }

    function sendInvoice(invoice, successCallback, errorCallback) {
        invoice['notificationUrl'] = args['apiURL'] + '/getPaymentStatus.php';
        post(args['apiURL'] + '/sendInvoice.php', invoice, function (json) {
            var data = JSON.parse(json);
            if (data.resultCode == 0 && successCallback) {
                successCallback(invoice, data);
            } else if (errorCallback) {
                errorCallback(invoice, data);
            }
        }, function (url, status) {
            console.log(status + ' loading ' + url);
        });
    }

    function initialize() {

        parseScriptArgs();

        var platform = getArg('platform', detectPlatform());
        var language = getArg('language', detectBrowserLanguage());
        var layout = getArg('layout', 'standard');

        args['platform'] = platform;
        args['language'] = language;
        args['layout'] = layout;
        args['pollFreq'] = getIntArg('pollFreq', 500);
        args['apiURL'] = getArg('apiURL', 'https://devapi.seqr.com/seqr-webshop-api');
        args['SEQR_STATUS'] = 'INIT';

        if (args.hasOwnProperty('invoiceReference') || args.hasOwnProperty('invoice')) {

            var injectCSS = function (template) {
                var css = renderTemplate(template, args);
                var style = document.createElement('style');
                style.type = 'text/css';
                if (style.styleSheet) {
                    style.styleSheet.cssText = css;
                } else {
                    style.innerHTML = css;
                }
                document.getElementsByTagName('head')[0].appendChild(style);
            };

            get(baseURL + '/css/' + layout + '_' + platform + '.css', injectCSS);

            var injectTemplate = function (json) {
                args['text'] = JSON.parse(json);
                if (args.hasOwnProperty('invoiceReference')) {
                    get(baseURL + '/templates/' + layout + '_' + platform + '.html', function (template) {
                        document.getElementById('seqrShop').outerHTML = renderTemplate(template, args);
                        pollInvoiceStatus();
                    });
                } else {
                    sendInvoice(args.invoice, function (invoice, result) {
                        args['invoiceReference'] = result.invoiceReference;
                        get(baseURL + '/templates/' + layout + '_' + platform + '.html', function (template) {
                            document.getElementById('seqrShop').outerHTML = renderTemplate(template, args);
                            pollInvoiceStatus();
                        });
                    });
                }
            };

            get(baseURL + '/lang/' + language + '.json', injectTemplate, function error(url, status) {
                console.log(status + ' loading' + url + ', reverting to default language.');
                get(baseURL + '/lang/en.json', injectTemplate);
            });

        }

    }

    window.onfocus = checkInvoiceStatus;

    initialize();

}).call();