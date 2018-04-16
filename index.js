import _ from 'lodash'
import * as tf from '@tensorflow/tfjs';
import Chart from 'chart.js';

// make tf globally available, debugging purposes
// window.tf = tf

const inputText = `long ago , the mice had a general council to consider what measures they could take to outwit their common enemy , the cat . some said this , and some said that but at last a young mouse got up and said he had a proposal to make , which he thought would meet the case . you will all agree , said he , that our chief danger consists in the sly and treacherous manner in which the enemy approaches us . now , if we could receive some signal of her approach , we could easily escape from her . i venture , therefore , to propose that a small bell be procured , and attached by a ribbon round the neck of the cat . by this means we should always know when she was about , and could easily retire while she was in the neighbourhood . this proposal met with general applause , until an old mouse got up and said that is all very well , but who is to bell the cat ? the mice looked at one another and nobody spoke . then the old mouse said it is easy to propose impossible remedies .`
// hungarian text
// const inputText = `Meghiszem azt ! Hallgass csak ide . Amint jövök ki az erdőből , mit látok az út közepén ? Belerekedt a sárba egy kis aranyos kocsi , a kocsi előtt négy szép fekete kutya befogva . A kocsiban olyan szép asszony ült , amilyet világéletemben nem láttam . Biztosan tündér lehetett . Mondja nekem : “ Te jó ember , segíts ki a sárból , bizony nem bánod meg . ” Gondoltam magamban , hogy bizony jólesnék , ha segítene a szegénységünkön , és segítettem , hogy a kutyák kihúzzák a sárból . Kérdi az asszony , hogy házas vagyok-e . Mondom neki , hogy igen . Kérdi , hogy gazdagok vagyunk-e . Mondom neki , hogy bizony szegények vagyunk , mint a templom egere . Azt mondja : “ No , ezen segíthetünk . Mondd meg a feleségednek , hogy kívánjon három dolgot , teljesülni fog a kívánsága . ” Azzal elment , mint a szél .`

const numIterations = 20000
const learning_rate = 0.001
const rnn_hidden = 64
const preparedDataforTestSet = inputText.split(' ')
const examinedNumberOfWord = 6
const endOfSeq = preparedDataforTestSet.length - (examinedNumberOfWord + 1)
const optimizer = tf.train.rmsprop(learning_rate)
let chart
let stop_training = false


// preparing data
const createWordMap = (textData) => {
    const wordArray = textData.split(' ')
    const countedWordObject = wordArray.reduce((acc, cur, i) => {
        if (acc[cur] === undefined) {
            acc[cur] = 1
        } else {
            acc[cur] += 1
        }
        return acc
    }, {})

    const arraOfshit = []
    for (let key in countedWordObject) {
        arraOfshit.push({ word: key, occurence: countedWordObject[key] })
    }

    const wordMap = _.sortBy(arraOfshit, 'occurence').reverse().map((e, i) => {
        e['code'] = i
        return e
    })

    return wordMap
}

const wordMap = createWordMap(inputText)
const wordMapLength = Object.keys(wordMap).length

console.log(`
    Number of unique words:  ${wordMapLength}
    Length of examined text: ${preparedDataforTestSet.length}
`)


// return a word
const fromSymbol = (symbol) => {
    const object = wordMap.filter(e => e.code === symbol)[0]
    return object.word
}

// return a symbol
const toSymbol = (word) => {
    const object = wordMap.filter(e => e.word === word)[0]
    return object.code
}

// return onehot vector, for compare with probability distribution vector
const encode = (symbol) => {
    // console.log(symbol)
    return tf.tidy(() => {
        const symbolTensor1d = tf.tensor1d(symbol)
        return tf.oneHot(symbolTensor1d, wordMapLength)
    })
}

// return a symbol
const decode = (probDistVector) => {
    // It could be swithced to tf.argMax(), but I experiment with values below treshold.
    const probs = probDistVector.softmax().dataSync()
    const maxOfProbs = _.max(probs)
    const probIndexes = []

    for (let prob of probs) {
        if (prob > (maxOfProbs - 0.3)) {
            probIndexes.push(probs.indexOf(prob))
        }
    }

    return probIndexes[_.random(0, probIndexes.length - 1)]
}


// building the model
const wordVector = tf.input({ shape: [examinedNumberOfWord, 1] });
const cells = [
    tf.layers.lstmCell({ units: rnn_hidden }),
    // tf.layers.lstmCell({ units: rnn_hidden }),
];
const rnn = tf.layers.rnn({ cell: cells, returnSequences: false });

const rnn_out = rnn.apply(wordVector);
const output = tf.layers.dense({ units: wordMapLength, useBias: true }).apply(rnn_out)

const model = tf.model({ inputs: wordVector, outputs: output })


// sample shape: [batch, sequence, feature], here is [1, number of words, 1]
const predict = (samples) => {
    return model.predict(samples)
}

const loss = (labels, predictions) => {
    return tf.losses.softmaxCrossEntropy(labels, predictions).mean();
}

// performance could be improved if toSymbol the whole set
// then random select from encodings not from string of arrays
const getSamples = () => {
    const startOfSeq = _.random(0, endOfSeq, false)
    const retVal = preparedDataforTestSet.slice(startOfSeq, startOfSeq + (examinedNumberOfWord + 1))
    return retVal
}

const train = async (numIterations) => {

    let lossCounter = null

    for (let iter = 0; iter < numIterations; iter++) {

        let labelProbVector
        let lossValue
        let pred
        let losse
        let samplesTensor

        const samples = getSamples().map(s => {
            return toSymbol(s)
        })

        labelProbVector = encode(samples.splice(-1))

        if (stop_training) {
            stop_training = false
            break
        }

        // optimizer.minimize is where the training happens. 

        // The function it takes must return a numerical estimate (i.e. loss) 
        // of how well we are doing using the current state of
        // the variables we created at the start.

        // This optimizer does the 'backward' step of our training process
        // updating variables defined previously in order to minimize the
        // loss.
        lossValue = optimizer.minimize(() => {
            // Feed the examples into the model
            samplesTensor = tf.tensor(samples, [1, examinedNumberOfWord, 1])
            pred = predict(samplesTensor);
            losse = loss(labelProbVector, pred);
            return losse
        }, true);

        if (lossCounter === null) {
            lossCounter = lossValue.dataSync()[0]
        }
        lossCounter += lossValue.dataSync()[0]


        if (iter % 100 === 0 && iter > 50) {
            const lvdsy = lossCounter / 100
            lossCounter = 0
            console.log(`
            --------
            Step number: ${iter}
            The average loss is (last 100 steps):  ${lvdsy}
            Number of tensors in memory: ${tf.memory().numTensors}
            --------`)
            chart.data.datasets[0].data.push(lvdsy)
            chart.data.labels.push(iter)
            chart.update()
        }

        // Use tf.nextFrame to not block the browser.
        await tf.nextFrame();
        pred.dispose()
        labelProbVector.dispose()
        lossValue.dispose()
        losse.dispose()
        samplesTensor.dispose()
    }
}

const learnToGuessWord = async () => {
    console.log('TRAINING START')

    chart = drawChart([], [])

    await train(numIterations);

    console.log('TRAINING IS OVER')

    const symbolCollector = _.shuffle(getSamples()).map(s => {
        return toSymbol(s)
    })

    for (let i = 0; i < 30; i++) {
        const predProbVector = predict(tf.tensor(symbolCollector.slice(-examinedNumberOfWord), [1, examinedNumberOfWord, 1]))
        symbolCollector.push(decode(predProbVector));
    }

    const generatedText = symbolCollector.map(s => {
        return fromSymbol(s)
    }).join(' ')

    console.log(generatedText)
}

document.getElementById('start_training').addEventListener('click', learnToGuessWord, { once: true })
document.getElementById('stop_training').addEventListener('click', () => stop_training = true)


const drawChart = (labelsGot, dataF) => {
    var ctx = document.getElementById("myChart");
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsGot,
            datasets: [{
                label: 'LOSS',
                data: dataF,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255,99,132,1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}
