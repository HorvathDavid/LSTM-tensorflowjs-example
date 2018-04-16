# Tensorflowjs simple LSTM example

Intro: This example aims to test the limitations of "in browser learning". What I learned during this little project is how difference the flow in JavaScript compared to the Python version of Tensorflow. Memory handling is a tricky but neccessary part of the JavaScript version. WebGL has its own limitations. GPU device can not be targeted directly. In dual GPU notebooks (integrated - dedicated) the dedicated GPU should be set explicitly in the card manufacturer settings.
It's not magic, the learning just works, but it utilizes limited resources.

> https://js.tensorflow.org/

This experiment was based on this article:

> https://towardsdatascience.com/lstm-by-example-using-tensorflow-feb0c1968537


## For test run
1. Clone repository
2. Open index.html in broswser. The already bundled js will load, so the parameters could not be changed. 
## For development
- Install local dependencies
    
    `npm install`
- Install webpack globally
    
    `npm install webpack webpack-cli -g`
- Install http-server for loading assets, etc.

    `npm install http-server -g`

Finally run:
- npm run webpack
- http-server

in separete terminals.

Experiment with it!
