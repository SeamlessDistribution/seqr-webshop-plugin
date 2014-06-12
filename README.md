SEQR Webshop Plugin
===================

## Basic Usage

1. Create an invoice using the sendInvoice SOAP call.
2. Embed the SEQR plugin from CDN via script tag. A statusURL and invoiceQRCode (returned from step 1) are required as parameters.

### REST calls / Pages to implement on Webshop

1. `Status URL` - __Required__, parameter to plugin. This URL is called on a fixed interval (default is 1 second) by the plugin to fetch the current status of the payment. It must return a JSON block with a status field.
2. `Back URL`- __Required__, parameter to sendInvoice SOAP call. This is the page the user is returned to once they have completed or cancelled a purchase. This page must make a final getPaymentStatus SOAP call to commit the payment.
3. `Notification URL` - __Optional__, parameter to sendInvoice SOAP call. The SEQR backnd posts an invoiceReference to the URL when the payment is completed. The invoiceReference, should be used to make a getPaymentStatus SOAP call.

Tip: The status URL and notification URL can be the same if it is implemented to handle both GET and POST of the invoiceReference parameter.

### CORS Headers

The status URL must return the following HTTP header: `Access-Control-Allow-Origin: *` if it hosted on a domain that is different from the page that contains the plugin.

## Step 1: sendInvoice

Before you can embed the plugin you must generate an invoice. Lets assume you have a done page located at https://myshop.com/seqr/done.php, and a payment status call located at https://myshop.com/seqr/status.php.

In the sendInvoice SOAP call the backURL is set to the done page, and the notificationUrl is set to the payment status call. Note that the backURL is only used if the user is making the purchase using their mobile browser.

The https://myshop.com/seqr/done.php simply makes a final call to the getPaymentStatus SOAP service and displays the output in the page. Tip: Use a cookie, session, or unique id to keep track of the user when they return to the page from the mobile app. If you are using a unique id (such as an order id) you can add that as a query parameter to the backURL, that way you can track what order the final page is related to.

The https://myshop.com/seqr/status.php receives an invoiceReference from via either a GET or POST and then uses the reference to do a getPaymentStatus SOAP call. The response should be a JSON structure with a status field. Tip: Simply serialize the SOAP response to JSON since it contains the required field.

The send invoice call should look something like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ns1="http://external.interfaces.ers.seamless.com/">
    <SOAP-ENV:Body>
        <ns1:sendInvoice>
            <context>
                <clientRequestTimeout>0</clientRequestTimeout>
                <initiatorPrincipalId>
                    <id>...</id>
                    <type>TERMINALID</type>
                </initiatorPrincipalId>
                <password>...</password>
            </context>
            <invoice>
                <acknowledgmentMode>NO_ACKNOWLEDGMENT</acknowledgmentMode>
                <title>Grand Cinema</title>
                <invoiceRows>
                    <invoiceRow>
                        <itemDescription>Movie Ticket</itemDescription>
                        <itemTotalAmount>
                            <currency>USD</currency>
                            <value>10</value>
                        </itemTotalAmount>
                    </invoiceRow>
                </invoiceRows>
                <totalAmount>
                    <currency>USD</currency>
                    <value>10</value>
                </totalAmount>
                <backURL>https://myshop.com/seqr/done.php</backURL>
                <notificationUrl>https://myshop.com/seqr/status.php</notificationUrl>
            </invoice>
        </ns1:sendInvoice>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

And the response should be:

```xml
<soap:Envelope
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <ns2:sendInvoiceResponse
            xmlns:ns2="http://external.interfaces.ers.seamless.com/">
            <return>
                <resultCode>0</resultCode>
                <resultDescription>SUCCESS</resultDescription>
                <invoiceQRCode>HTTP://SEQR.SE/R1402562843463</invoiceQRCode>
                <invoiceReference>1402562843463</invoiceReference>
            </return>
        </ns2:sendInvoiceResponse>
    </soap:Body>
</soap:Envelope>
```


## Step 2: Embed the plugin

Using the SOAP response from the send invoice call the following script tag should be embedded in the page:

```html
<script
    src="https://cdn.seqr.com/webshop-plugin/js/seqrShop.js#![PARAMETERS]">
</script>
```

### Parameters

Each parameter value has to be URI Encoded.

- `invoiceQRCode` - __Required__. This is the value returned from the send invoice SOAP call. Using the example above it would be: `HTTP://SEQR.SE/R1402562843463`.
- `statusURL` - __Required__. This is URL that the plugin polls to check for payment status changed. Using the example above it would be: `https://myshop.com/seqr/status.php?invoiceReference=1402562843463`.
- `statusCallback` - __Optional__. This is the name of a global javascript function that will get called whenever the payment status changes. The data passed to the function is the JSON response from the statusURL. This callback can be used to send the user to a specific page upon payment completion, or to provide direct feedback in the current page. Our sample shop uses this callback to provide a status overlay over the QR code.
- `mode` - __Optional__. When using the demo SEQR app, you must set mode=demo. In production remove this parameter.
- `injectCSS` - __Optional__. If you use the required stylesheet directly in the page using `<link rel="stylesheet" type="text/css" href="//cdn.seqr.com/webshop-plugin/css/seqrShop.css">` then you can prevent the plugin from injecting the CSS.

Here is complete example of the script tag with parameters properly URI encoded:

```html
<script
    src="https://cdn.seqr.com/webshop-plugin/js/seqrShop.js#!
    mode=demo&
    injectCSS=true&
    statusCallback=statusUpdated&
    invoiceQRCode=HTTP%3A%2F%2FSEQR.SE%2FR1402562843463&
    statusURL=%2F%2Fseqr.ngrok.com%2Fseqr-webshop-api%2FgetPaymentStatus.php%3FinvoiceReference%3D1402562843463">
</script>
```

## Examples

Visit [https://devapi.seqr.com/seqr-webshop-sample/](https://devapi.seqr.com/seqr-webshop-sample/) to try the sample webshop.

The source code for sample webshop can be found at [https://github.com/SeamlessDistribution/seqr-webshop-sample](https://github.com/SeamlessDistribution/seqr-webshop-sample).

The source code for the REST calls in the sample webshop can be found at [https://github.com/SeamlessDistribution/seqr-webshop-api](https://github.com/SeamlessDistribution/seqr-webshop-api).

The source code for the webshop plugin can be found at [https://github.com/SeamlessDistribution/seqr-webshop-api](https://github.com/SeamlessDistribution/seqr-webshop-api).
