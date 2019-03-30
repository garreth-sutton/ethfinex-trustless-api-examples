# Trustless API Code Examples
This repository contains examples on how to perform the following tasks:

 - Get the configuration
 - Get a list of active orders
 - Get a list of historic orders
 - Place an order
 - Cancel an order
 [a relative link](examples/config.js)

I have tried to keep the examples as simple as possible, while adding plenty of comments to help in their understanding.

Setup:

 - Clone the repository to a directory
 - run the command `npm install` inside the directory
 - configure the file `keys_example.js` - the instructions are contained
   inside the file

Once setup you can run any example in node e.g. by using the command `node placeOrder.js`

Apart from the dependency on the `key.js` file and essential crypto libraries, all examples are self-contained; each file contains all the code required to perform it's function.

Todo:

 - Request Unlock Signature
 - Lock Tokens
 - Unlock Tokens
