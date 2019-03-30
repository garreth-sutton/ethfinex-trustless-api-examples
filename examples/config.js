// Config is the simplest of all the endpoints, simply perform a POST request to receive the configuration data
// This data is useful for discvering valid markets, and contains information about each market that is essential
// for creating orders in the correct format
const url = "https://api.ethfinex.com/trustless/v1/r/get/conf"

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var xhr = new XMLHttpRequest();

xhr.open('POST', url, false);
xhr.onload = function () {
    console.log(this.responseText);
};

xhr.send();