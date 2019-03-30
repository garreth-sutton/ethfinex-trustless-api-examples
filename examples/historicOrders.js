// Elliptic curve cryptography library - used for signing the request with the user's private key to ensure security and authenticity
const elliptic = require("elliptic");
const secp256k1 = new elliptic.ec("secp256k1");

// General Cryptography libray - used to generate a hash of the request (think of a hash as a unique fingerprint / ID for the user's request)
const CryptoJS = require("crypto-js")

// Internal dependancy for supplying the user's private wallet key - required for signing requests
// See keys_example.js for help on setting up this dependancy
const privateKey = require("./keys").privateKey

// The name of the protocol being used - Trustless works with the Zero-X protocol so this value should always be '0x'
const protocol = '0x'

// The API endpoint that we will use to perform our request
const apiUrl = "https://api.ethfinex.com/trustless/v1/r/orders/hist"
// The HTTP verb that the target endpoint will accept, typically GET or POST
const apiAction = "POST"

// The "nonce" is simply a bit of data that is added to the request to give it some uniqueness
// We use the timestamp as the nonce because:
//   It allows us to distinguish between two requests (hitting the same endpoint twice will have two different timestamps)
//   A timestamp is an ever increasing number (Unless you're Thanos) which is perfect for a nonce as it should never clash with one that has been used previously 
let nonce = ((Date.now() / 1000) + 30).toString()

// BUILDING THE REQUEST
// To create the request we're taking the nonce and appending it to the 'preamble'; a bit of text that is expected to be at the start of every request
const messageBuffer = Buffer.from(nonce);
const preamble = `\u0019Ethereum Signed Message:\n${nonce.length}`;
const preambleBuffer = Buffer.from(preamble);
const ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);

// Next we take the built (but unencrypted) request and put it through a hashing algorithm, this produces a digital fingerprint for the request
const hash = CryptoJS.SHA3(ethMessage.toString(), {outputLength: 256}).toString()

// Next we need to 'sign' the request hash using the wallet private key - this is done to prove that the reuqest is coming from the owner of the wallet
// To do this we pass the wallet private key and the request hash to the 'Elliptic Curve cyrptography' library which will do all the complex math for us :)
// The output of the encryption operation will be a javascript object
const signatureUnformatted = secp256k1.keyFromPrivate(Buffer.from(privateKey, "hex")).sign(Buffer.from(hash, "hex"), { canonical: true });
// Trustless expects signed requests to be in a specific format, so we will take the encryption object, cherrypick the fields we need, and build a big linear request string:
//      It must start with '0x',
//      Then the encryption results 'R' value, as a hex string,
//      Then the encryption results 'S' value, as a hex string,
//      Then the value zero, or one, as hex - the value should match the encryption results 'recovery param' value (which should also be zero or one)
const signatureFormatted = "0x" + signatureUnformatted.r.toString(16) + signatureUnformatted.s.toString(16) + "0" + signatureUnformatted.recoveryParam

// Finally a payload needs to be constructed, this is simply an object with all the expected pieces of data
// As we have built all of the components for the request already, we simply have to combine them into a sigle object
let payload = {
    nonce,                          // The data we're using as a 'nonce'
    protocol,                       // The request protocol, this should always be '0x'
    signature: signatureFormatted   // The hash of the nonce, that has been signed, and formatted correctly
}
// Now it's simply the case of sending this payload to Thrusless and the API endpoint

// SENDING THE REQUEST
// This is standard Javascript boilerplate code for sending a network request
// The only notable part about the request is the headers
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var xhr = new XMLHttpRequest();

xhr.open(apiAction, apiUrl, false);
// The Accept and Content-Type headers MUST be set to JSON or the request will fail with an error
xhr.setRequestHeader("Accept", "application/json")
xhr.setRequestHeader("Content-Type", "application/json")
xhr.onload = function () {
    // Print the API response to the console
    console.log(this.responseText);
};
// Perform the transmission
xhr.send(JSON.stringify(payload));