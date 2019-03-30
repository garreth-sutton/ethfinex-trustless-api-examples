# Trustless API Code Examples
This repository contains examples on how to perform the following tasks:

 - [Get the configuration](examples/config.js)
 - [Get a list of active orders](examples/activeOrders.js)
 - [Get a list of historic orders](examples/historicOrders.js)
 - [Place an order](examples/createOrder.js)
 - [Cancel an order](examples/cancelOrder.js)

I have tried to keep the examples as simple as possible, while adding plenty of comments to help in their understanding.

Setup:

 - Clone the repository to a directory
 - run the command `npm install` inside the directory
 - configure the file [keys_example.js](examples/keys_example.js) - the instructions are contained
   inside the file

Once setup you can run any example in node e.g. by using the command `node placeOrder.js`

Apart from the dependency on the `key.js` file and essential crypto libraries, all examples are self-contained; each file contains all the code required to perform its function.

Todo:

 - Request Unlock Signature
 - Lock Tokens
 - Unlock Tokens
