// Internal dependancy for supplying the user's private wallet key, and the wallet address - required for signing requests
// See keys_example.js for help on setting up this dependancy
const privateKey = require("./keys").privateKey
const walletAddress = require("./keys").walletAddress

// Etherium Utils library can be used to sign orders on Trustless
const ethUtil = require("ethereumjs-util")

// The 0x protocol library, this will help construct orders that are in the correct format
const ZeroEx = require("0x.js")

// A standard node networking library that allows us to perform requests on REST endpoints
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// FETCH THE CONFIG
// It's important to get an up to date copy of the config before making an order as Ethfinex addresses, and other propertys could potentially change at any time
// This is especally nessasary when trading USDT as the config will provide the essential 'settle spread' value - This is described in detail below
var xhr = new XMLHttpRequest();
xhr.open('POST', "https://api.ethfinex.com/trustless/v1/r/get/conf", false);
xhr.onload = function () {
    // Create and send an order once we have downloaded the Configuration from Trustless
    const config = JSON.parse(this.responseText);
    createAndSendOrder(config["0x"])
};
xhr.send();

// CONSTRUCTING THE ORDER OBJECT
function createAndSendOrder(config) {
    // We're going to construct an order that will SELL 0.1 ETH for 10000 USD, so the order arguments will be: 
    let market = "tETHUSD"  // This is the market we want to trade
    let amount = -0.1       // This is the amount of ETH we would like to SELL 
                            // (Notice the number is negative, this indicates that we are SELLING, if it was positive we would be BUYING)
    let price = 1000       // This is the amount of USD we would like to trade

    // The order will need to specify a time of expiry - we will set this to 1 hour from now
    let expiryTime = Math.round((new Date()).getTime() / 1000)
    expiryTime += (60 * 60) // Expire in an hours time

    // Because Trustless lists orders on the centeralised Ethfinex exchange we have to account for what is called 'settle spread', or 'Tether market shift'
    // The 'settle spread' is the difference in price between fiat USD and thr USDT Tether token
    // To account for 'settle spread' we simply multiply the USD price by the 'settle spread' value that is provided by the config
    // Note: settlespread only needs to be applied for USD markets, other markets e.g. tETHDAI do not require any modification
    // See here for more information on 'settle spread', or 'Tether market shift': https://support.ethfinex.com/hc/en-us/articles/360021436572-Tether-Market-Shift
    let settleSpread = config.tokenRegistry.USD.settleSpread

    // The buy and sell amount need to be formatted exactly for it to be valid
    // The calculations for the aqmounts have been lifted from 'efx-api-node' source, which can be found here: https://github.com/ethfinex/efx-api-node/blob/master/src/api/contract/create_order.js
    
    // The buy amount is in USD so we will apply a 'settle spread', also we will subtract fees
    buyAmount = (new ZeroEx.BigNumber(10))
      .pow(config.tokenRegistry.USD.decimals)
      .times(amount)
      .times(price)
      .abs()
      .times(1 + settleSpread)  // Apply the 'settle spread' this will raise / lower the amount slightly
      .times(1 - 0.0025)        // Subtract fees, this will reduce the amount slightly
      .integerValue(ZeroEx.BigNumber.ROUND_FLOOR)

    // The sell amount is much simplier comparitively, it just needs to be formatted to the correct amount of decimals (as specified in the config) and rounded down
    sellAmount = (new ZeroEx.BigNumber(10))
      .pow(config.tokenRegistry.ETH.decimals)
      .times(amount)
      .abs()
      .integerValue(ZeroEx.BigNumber.ROUND_FLOOR)

    // Now that we have calculated all the arguments for the order, we can construct the full order object:
    var order = 
    {
        "gid": 1,                   // gid stands for Group ID
        "cid": 1553765086400,       // cid stands for Client ID ASSUMPTION
        "type": "EXCHANGE LIMIT",   // This is the order type, the two supported types are: "EXCHANGE LIMIT" and "MARKET"
        "symbol": market,           // This is the currency pair that the trade with be performed on, a list of valid pairs can be obtained from the "Config" API endpoint, under the response property "exchangeSymbols"
        "amount": amount,           // This is the amount that will be traded, this also indicates if the order is a BUY or SELL; if the amount is negative then it is a sell order 
        "price": price,             // This is the price that the amount will be traded for
        "meta": {                   // The meta property contains the 0x v2 formatted order object, further information on the structure of this object can be found at: 
                                    //      https://github.com/0xProject/0x-protocol-specification/blob/master/v2/v2-specification.md#order-message-format
            makerAddress: walletAddress,                                                                        // The maker is the user, so this address is the user's wallet address
            takerAddress: "0x0000000000000000000000000000000000000000",                                         // The taker address is not required, so a blank address is provided
            feeRecipientAddress: config.ethfinexAddress,                                                        // This is the address for the recipient of the trading feed should the trade become filled, 
                                                                                                                //      this address belongs to Ethfinex and can be obtained from the "Config" API endpoint, under the response property "ethfinexAddress"
            senderAddress: config.ethfinexAddress,                                                              // This address specifies who can process the order, again this address belongs to Ethfinex 
                                                                                                                //      and can be obtained from the "Config" API endpoint, under the response property "ethfinexAddress" 
            makerAssetAmount: sellAmount,                                                                       // This is the amount the user wishing to give away in the trade, not to be confused with the "amount" property that was specified earlier
                                                                                                                //      the difference with this amount is that it has to be formatted to the smallest available unit (e.g. Wei if the token being traded is Ether)
                                                                                                                //      also, the amount should always be positive here
            takerAssetAmount: buyAmount,                                                                        // This is the amount the user wishes to recieve from the trade, not to be confused with the "price" property that was specified earlier
                                                                                                                //      the difference with this price is that it has to be formatted to the smallest available unit (e.g. Wei if the token being traded is Ether)
                                                                                                                //      also, the amount should always be positive here
            makerFee: new ZeroEx.BigNumber("0"),                                                                // This is the amount of 0x tokens being charged by Ethfinex to process an order that will be placed on the order book
                                                                                                                //      As Ethfinex does not charge fees in 0x tokens, the amount will always be zero
            takerFee: new ZeroEx.BigNumber("0"),                                                                // This is the amount of 0x tokens being charged by Ethfinex to process an order that will execute immediately
                                                                                                                //      As Ethfinex does not charge fees in 0x tokens, the amount will always be zero
            expirationTimeSeconds: new ZeroEx.BigNumber(expiryTime),                                            // This is a timestamp to specifiy when the order, should it remain active on the book but unfulfilled, will automatically cancel itself
            salt: ZeroEx.generatePseudoRandomSalt(),                                                            // The 'salt' is simply some random data that will give otherwise identical orders a unique value and can techincally be whatever you want it to be, 
                                                                                                                //      however it's recommended to use the salt generation function provided by the 0x protocol library
            makerAssetData: ZeroEx.assetDataUtils.encodeERC20AssetData(config.tokenRegistry.ETH.wrapperAddress),// This passes data to the exchange contract, specifically the wrapper address for the currency the user wishes to trade. 
                                                                                                                //      The address encoded using the 0x protocol library 
                                                                                                                //      This address can be obtained from the "Config" API endpoint, under the response property "tokenRegistry"
            takerAssetData: ZeroEx.assetDataUtils.encodeERC20AssetData(config.tokenRegistry.USD.wrapperAddress),// This passes data to the exchange contract, specifically the wrapper address for the currency the user wishes to recieve from the trade. 
                                                                                                                //      The address encoded using the 0x protocol library 
                                                                                                                //      This address can be obtained from the "Config" API endpoint, under the response property "tokenRegistry"
            exchangeAddress: config.exchangeAddress,                                                            // This is the address for the exchange, and can be obtained from the "Config" API endpoint, under the response property "exchangeAddress"
                                                                                                                // This property contains a hash (digital fingerprint) of the order that has been encrypted using the user's wallet private key
                                                                                                                //      This will be generated later
        },
        "protocol": "0x",       // This specifies what formatting the order object inside the meta field will be, only "0x" is supported so consider it a constant for now :)
        "partner_id": null,     // This identifies orders originating from affiliates, currently this is unused and can be set to null
        "fee_rate": 0.0025      // This is the amount of tokens, in percent, that will be forefitted as trading fees, should the order be filled.
    }

    // HASH & SIGN THE ORDER
    // Generate a 'hash' (digital fingerprint) of the order
    const hash = ZeroEx.orderHashUtils.getOrderHashHex(order.meta);

    // Cryptographically 'sign' the hash using the wallet private key, we will use the eth-utils library help us do this
    // We sign the hash using the private key to prove that the wallet's owner has created this order, thus proving authenticity of the command
    const sig = ethUtil.ecsign(
        ethUtil.toBuffer(hash),
        Buffer.from(privateKey.toUpperCase(), 'hex'),
    );

    // The signing function returns an object, we'll flatten the signature object to a hexadecimal string
    const signatureBuffer = Buffer.concat([
        ethUtil.toBuffer(sig.v),
        ethUtil.toBuffer(sig.r),
        ethUtil.toBuffer(sig.s),
        ethUtil.toBuffer(ZeroEx.SignatureType.EIP712),  // We append the flattened signature with the value of the constant 'EIP712', 
                                                        // this indicates to the recipient of the order what cryptography was used to construct the signature
    ]);
    const signatureHex = `0x${signatureBuffer.toString('hex')}`;

    // Finally we'll add the flattened signature to the order object as a property, this completes our order request!
    order.meta.signature = signatureHex
    // To execute the order on the exchange we simply need to transmit it to the API endpoint

    // TRANSMIT THE ORDER
    // This is standard Javascript boilerplate code for sending a network request
    // The only notable part about the request is the headers
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest();

    // The API endpoint that we will use to perform our request
    const apiUrl = "https://api.ethfinex.com/trustless/v1/w/on"
    // The HTTP verb that the target endpoint will accept, typically GET or POST
    const apiAction = "POST"

    xhr.open(apiAction, apiUrl, false);
    // The Accept and Content-Type headers MUST be set to JSON or the request will fail with an error
    xhr.setRequestHeader("Accept", "application/json")
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.onload = function () {
        // Print the API response to the console, we should recieve an order ID as a response
        // The order should also appear in the website UI as an active order
        console.log(this.responseText);
    };
    // Perform the transmission
    xhr.send(JSON.stringify(order));
}